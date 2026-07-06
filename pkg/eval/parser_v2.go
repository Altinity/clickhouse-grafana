// pkg/eval/parser_v2.go
package eval

import (
	"fmt"
	"strings"
)

// ---------------------------------------------------------------------------
// Parser v2: a transliteration of the legacy ToAST loop over logical tokens,
// building typed nodes (nodes.go) rendered by compat.go. Legacy classifier
// and raw-scan helpers (isClosured, betweenBraces, isTableFunc, isID,
// isTable, isMacro, isCond, onJoinTokenOnlyRe) are REUSED so their quirks
// are inherited, not re-implemented.
// ---------------------------------------------------------------------------

// maxSubqueryDepthV2 caps recursion (FROM/IN/JOIN/macro/UNION sub-parses).
// Legacy had no cap and overflows the stack on adversarial nesting; no
// corpus case is remotely close to this depth.
const maxSubqueryDepthV2 = 1000

// toASTV2 is the #733 Phase-2 recursive-descent engine entry point.
func toASTV2(src string) (*EvalAST, error) {
	q, err := parseQueryV2(src)
	if err != nil {
		return nil, err
	}
	return q.toEvalAST(), nil
}

func parseQueryV2(src string) (*queryNode, error) {
	return parseQueryAtDepthV2(src, 0)
}

// parserV2 mirrors the legacy scanner state: src is the CURRENT working
// string (the legacy s._s analogue — resumeRaw re-slices it, fact 6), cur is
// the legacy s.Token (hasCur=false == legacy s.Token==""), rootName is
// s.RootToken, expectedNext is s.expectedNext.
type parserV2 struct {
	src          string
	lts          []logicalToken
	pos          int
	cur          logicalToken
	hasCur       bool
	rootName     string
	expectedNext bool
	depth        int
}

func (p *parserV2) advance() bool {
	if p.pos >= len(p.lts) {
		return false // cur intentionally left as-is: legacy keeps s.Token
	}
	p.cur = p.lts[p.pos]
	p.pos++
	p.hasCur = true
	return true
}

func (p *parserV2) clearCur() { p.hasCur = false }

// restAfterCur is the raw working-string tail after the current token — the
// legacy s._s at the same loop position.
func (p *parserV2) restAfterCur() string { return p.src[p.cur.end:] }

// resumeRaw replaces the working string (legacy `s._s = …` slicing after a
// betweenBraces consumption) and re-tokenizes it. Offsets in the new logical
// tokens are relative to the new working string.
func (p *parserV2) resumeRaw(rest string) {
	p.src = rest
	p.lts = logicalScan(rest, tokenizeForParse(rest))
	p.pos = 0
	p.hasCur = false
}

func (p *parserV2) subParse(src string) (*queryNode, error) {
	return parseQueryAtDepthV2(src, p.depth+1)
}

// setRoot mirrors legacy SetRoot (eval_query.go:1618): lowercased key,
// clause created or RESET unconditionally, expectedNext raised.
func (p *parserV2) setRoot(q *queryNode, name string) {
	p.rootName = strings.ToLower(name)
	q.setClause(p.rootName)
	p.expectedNext = true
}

// push mirrors legacy push (eval_query.go:1597): the item goes to the current
// clause; if that clause was replaced by a subquery, it lands in the
// subquery's "aliases" (fact 11).
func (p *parserV2) push(q *queryNode, it *itemNode) {
	c := q.findClause(p.rootName)
	if c == nil {
		return
	}
	if c.sub != nil {
		c.subAliases = append(c.subAliases, it)
		return
	}
	c.items = append(c.items, it)
}

// safeTail returns s[n:]. Legacy sliced s._s[len(sub)+1:] unguarded and can
// panic on pathological inputs (no corpus case does); v2 clamps instead.
func safeTail(s string, n int) string {
	if n > len(s) {
		return ""
	}
	return s[n:]
}

// parseQueryAtDepthV2 is the legacy ToAST loop (eval_query.go:1637-1793)
// transliterated over logical tokens. Branch ORDER mirrors the legacy
// if/else chain exactly — reordering cases changes behavior.
func parseQueryAtDepthV2(src string, depth int) (*queryNode, error) {
	if depth > maxSubqueryDepthV2 {
		return nil, fmt.Errorf("parser v2: subquery nesting deeper than %d", maxSubqueryDepthV2)
	}
	p := &parserV2{src: src, lts: logicalScan(src, tokenizeForParse(src)), depth: depth}
	q := newQueryNode()
	p.setRoot(q, "root")
	p.expectedNext = false
	cur := newItemNode()

	for {
		if !p.advance() {
			break
		}
		// legacy consumes the flag on EVERY iteration (isExpectedNext side
		// effect inside the && chain).
		exp := p.expectedNext
		p.expectedNext = false
		lt := p.cur

		switch {
		case !exp && lt.kind == logStatement && !q.hasClause(strings.ToLower(lt.text)):
			if strings.ToUpper(lt.text) == "WITH" && p.rootName == "order by" {
				cur.add(tokenPart{lt}) // ORDER BY … WITH FILL (fact 12)
				continue
			}
			if !isClosured(renderItem(cur)) {
				cur.add(tokenPart{lt}) // keyword inside an open bracket glues
				continue
			}
			if renderItem(cur) != "" {
				p.push(q, cur)
				cur = newItemNode()
			}
			p.setRoot(q, lt.text)

		case lt.kind == logComma && isClosured(renderItem(cur)):
			p.push(q, cur) // pushes even an empty item (fact 16)
			cur = newItemNode()
			if p.rootName == "where" {
				comma := newItemNode()
				comma.add(rawPart{","}) // bare "," item, not ", " (fact 3)
				p.push(q, comma)
			}
			p.expectedNext = true

		case lt.kind == logClosure && p.rootName == "from":
			// legacy :1675-1685. Fires for ANY of ( ) [ ] in FROM. The body
			// between braces is a RAW slice (betweenBraces is quote-blind by
			// design parity, fact 9); the stream resumes one byte past it.
			rest := p.restAfterCur()
			sub := betweenBraces(rest)
			if !isTableFunc(renderItem(cur)) {
				subQ, err := p.subParse(sub)
				if err != nil {
					return nil, err
				}
				fc := q.findClause("from")
				fc.items = nil // legacy REPLACES Tree.Obj["from"] wholesale
				fc.sub = subQ
				fc.subAliases = nil
				// cur intentionally NOT reset: the pending argument later
				// lands as the first alias item (fact 10, "myfunc AS z").
			} else {
				cur.add(rawPart{"(" + sub + ")"}) // raw body, spacing preserved
				p.push(q, cur)
				cur = newItemNode()
			}
			p.resumeRaw(safeTail(rest, len(sub)+1))

		case lt.kind == logMacroFunc:
			return nil, fmt.Errorf("parser v2: macro heads not implemented") // Task 9

		case lt.kind == logIn:
			return nil, fmt.Errorf("parser v2: IN forms not implemented") // Task 8

		case lt.kind == logCond && (p.rootName == "where" || p.rootName == "prewhere"):
			if isClosured(renderItem(cur)) {
				p.push(q, cur) // pushes even empty (fact 16)
				cur = newItemNode()
				cur.add(tokenPart{lt}) // connector STARTS the next item (fact 3)
			} else {
				cur.add(spacedPart{lt.text}) // " "+raw even after '(' (fact 3)
			}

		case lt.kind == logJoin:
			var err error
			cur, err = p.parseJoin(q, cur, lt)
			if err != nil {
				return nil, fmt.Errorf("parseJOIN error: %v", err)
			}

		case p.rootName == "union all":
			return nil, fmt.Errorf("parser v2: UNION ALL not implemented") // Task 9

		case lt.kind == logComment:
			cur.add(tokenPart{lt}) // glued + "\n" via appendExprToken (fact 2)

		case lt.kind == logClosure || lt.kind == logDot:
			cur.add(tokenPart{lt}) // glued

		case lt.kind == logComma:
			cur.add(tokenPart{lt}) // ", " inside an unbalanced item

		default:
			cur.add(tokenPart{lt})
		}
	}

	if renderItem(cur) != "" {
		p.push(q, cur)
	}
	return q, nil
}

// ---------------------------------------------------------------------------
// Logical tokens: the legacy tokenizer's granularity on top of the v2 lexer.
//
// The legacy regexp tokenizer emitted multi-word tokens ("GROUP BY",
// "GLOBAL ANY LEFT OUTER JOIN", "NOT IN", "IN ['a', 'b']"). That granularity
// is OBSERVABLE in EvalAST output (join aliases/using items, raw type slices),
// so the v2 parser reproduces it here, with the probe-verified adjacency
// rules (plan facts 7, 12, 17): statements and IN forms need a literal single
// space between words; join kinds accept any whitespace-only gap.
// ---------------------------------------------------------------------------

type logKind uint8

const (
	logToken     logKind = iota // ident/number/string/quoted-ident/op/macro/?:;
	logStatement                // with|select|from|where|prewhere|having|group by|order by|limit|format|union all
	logJoin                     // the joinsRe set (see buildJoinShapes)
	logIn                       // in|not in|global in|global not in (+ optional ['…'] swallow)
	logCond                     // and|or (classified here; acted on only in where/prewhere)
	logMacroFunc                // $rate, $columns, … (case-SENSITIVE macroFuncRe set)
	logComment
	logComma   // ,
	logClosure // ( ) [ ]
	logDot     // the single '.' operator
)

// logicalToken is one legacy-granularity token. text is the EXACT raw source
// slice (may span several lexer tokens, preserving inner whitespace); start
// and end are byte offsets into the parser's CURRENT working string.
type logicalToken struct {
	kind  logKind
	text  string
	start int
	end   int
}

var statementSingles = map[string]bool{
	"with": true, "select": true, "from": true, "where": true,
	"having": true, "limit": true, "format": true, "prewhere": true,
}

var statementPairs = map[string]string{"group": "by", "order": "by", "union": "all"}

// macroFuncNames mirrors macroFuncRe (eval_query.go:2039) — case-sensitive.
var macroFuncNames = map[string]bool{
	"$deltaColumnsAggregated": true, "$increaseColumnsAggregated": true,
	"$perSecondColumnsAggregated": true, "$rateColumnsAggregated": true,
	"$rateColumns": true, "$perSecondColumns": true, "$deltaColumns": true,
	"$increaseColumns": true, "$rate": true, "$perSecond": true,
	"$delta": true, "$increase": true, "$columnsMs": true, "$columns": true,
	"$lttbMs": true, "$lttb": true,
}

var joinShapes = buildJoinShapes()

// buildJoinShapes enumerates exactly the legacy joinsRe alternations
// (eval_query.go:1961-2036): [global] [any|all] [inner|left|right|full|cross]
// [outer] join — 72 combinations — plus "array join" and "left array join".
// TestJoinShapesMatchLegacyRegex pins every shape against the legacy regex.
func buildJoinShapes() map[string]bool {
	shapes := map[string]bool{
		"array join":      true,
		"left array join": true,
	}
	for _, global := range []string{"", "global "} {
		for _, strictness := range []string{"", "any ", "all "} {
			for _, direction := range []string{"", "inner ", "left ", "right ", "full ", "cross "} {
				for _, outer := range []string{"", "outer "} {
					shapes[global+strictness+direction+outer+"join"] = true
				}
			}
		}
	}
	return shapes
}

// tokenizeForParse tokenizes src with the Phase-1 lexer but mirrors the
// legacy error semantics (plan fact 8): legacy Next() swallows lexer errors
// and silently ends the stream, so a malformed tail TRUNCATES instead of
// failing the whole parse. (The legacy Multiline "teleport" variant is NOT
// mirrored — that garbage class is exactly the #610 engine_diff.)
func tokenizeForParse(src string) []Token {
	lx := &lexer{src: src}
	for lx.pos < len(lx.src) {
		start := lx.pos
		if err := lx.next(); err != nil {
			break
		}
		if lx.pos <= start {
			break
		}
	}
	return lx.toks
}

// logicalScan groups lexer tokens to legacy granularity. src must be the
// exact string toks were produced from (gap and raw-slice inspection).
func logicalScan(src string, toks []Token) []logicalToken {
	words := make([]Token, 0, len(toks))
	for _, tk := range toks {
		if tk.Kind != TokWS {
			words = append(words, tk)
		}
	}
	var out []logicalToken
	for i := 0; i < len(words); {
		tk := words[i]
		if tk.Kind == TokIdent {
			lt, next := matchKeyword(src, words, i)
			out = append(out, lt)
			i = next
			continue
		}
		lt := logicalToken{kind: logToken, text: tk.Text, start: tk.Start, end: tk.End}
		switch tk.Kind {
		case TokComment:
			lt.kind = logComment
		case TokComma:
			lt.kind = logComma
		case TokLParen, TokRParen, TokLBracket, TokRBracket:
			lt.kind = logClosure
		case TokOp:
			if tk.Text == "." {
				lt.kind = logDot
			}
		case TokMacro:
			if macroFuncNames[tk.Text] {
				lt.kind = logMacroFunc
			}
		}
		out = append(out, lt)
		i++
	}
	return out
}

// matchKeyword classifies the ident at words[i], grouping multi-word keywords.
// Precedence mirrors the legacy tokenRe alternation order (plan fact 17):
// statements, then join kinds, then IN forms, then cond, then plain ident.
// Returns the logical token and the words index to continue from.
func matchKeyword(src string, words []Token, i int) (logicalToken, int) {
	w := strings.ToLower(words[i].Text)
	if statementSingles[w] {
		return logicalToken{logStatement, words[i].Text, words[i].Start, words[i].End}, i + 1
	}
	if second, ok := statementPairs[w]; ok && i+1 < len(words) &&
		words[i+1].Kind == TokIdent &&
		strings.ToLower(words[i+1].Text) == second &&
		src[words[i].End:words[i+1].Start] == " " { // literal single space (fact 12)
		return logicalToken{logStatement, src[words[i].Start:words[i+1].End], words[i].Start, words[i+1].End}, i + 2
	}
	if n := matchJoinWords(src, words, i); n > 0 {
		return logicalToken{logJoin, src[words[i].Start:words[i+n-1].End], words[i].Start, words[i+n-1].End}, i + n
	}
	if n := matchInWords(src, words, i); n > 0 {
		end := words[i+n-1].End
		if e, ok := swallowInList(src, end); ok {
			next := i + n
			for next < len(words) && words[next].Start < e {
				next++
			}
			return logicalToken{logIn, src[words[i].Start:e], words[i].Start, e}, next
		}
		return logicalToken{logIn, src[words[i].Start:end], words[i].Start, end}, i + n
	}
	if w == "and" || w == "or" {
		return logicalToken{logCond, words[i].Text, words[i].Start, words[i].End}, i + 1
	}
	return logicalToken{logToken, words[i].Text, words[i].Start, words[i].End}, i + 1
}

const maxJoinWords = 5 // "global any right outer join"

// matchJoinWords greedily matches the longest ident run (whitespace-only
// gaps, joinsRe uses \s+) that forms a join shape. Returns the word count.
func matchJoinWords(src string, words []Token, i int) int {
	run := make([]string, 0, maxJoinWords)
	for n := 0; n < maxJoinWords && i+n < len(words); n++ {
		tk := words[i+n]
		if tk.Kind != TokIdent {
			break
		}
		if n > 0 && !isWSOnlyGap(src[words[i+n-1].End:tk.Start]) {
			break
		}
		run = append(run, strings.ToLower(tk.Text))
	}
	for n := len(run); n >= 1; n-- {
		if joinShapes[strings.Join(run[:n], " ")] {
			return n
		}
	}
	return 0
}

var inForms = [][]string{
	{"global", "not", "in"}, {"global", "in"}, {"not", "in"}, {"in"},
}

// matchInWords matches the legacy inRe keyword part: words joined by a
// literal single space. Returns the word count (0 = no match).
func matchInWords(src string, words []Token, i int) int {
	for _, form := range inForms {
		if i+len(form) > len(words) {
			continue
		}
		ok := true
		for j, w := range form {
			tk := words[i+j]
			if tk.Kind != TokIdent || strings.ToLower(tk.Text) != w {
				ok = false
				break
			}
			if j > 0 && src[words[i+j-1].End:tk.Start] != " " {
				ok = false
				break
			}
		}
		if ok {
			return len(form)
		}
	}
	return 0
}

// swallowInList mirrors the legacy inRe optional group (plan fact 7):
//
//	(?:\s+\[\s*(?:'[^']*'\s*,\s*)*'[^']*'\s*\])?
//
// i.e. whitespace, '[', comma-separated '…' string literals (NO escape
// handling — a backslash is data, exactly like the legacy pattern), ']'.
// Returns the end offset just past ']' and whether it matched.
func swallowInList(src string, pos int) (int, bool) {
	i := pos
	start := i
	for i < len(src) && isSpaceByte(src[i]) {
		i++
	}
	if i == start || i >= len(src) || src[i] != '[' {
		return 0, false
	}
	i++
	for {
		for i < len(src) && isSpaceByte(src[i]) {
			i++
		}
		if i >= len(src) || src[i] != '\'' {
			return 0, false
		}
		i++
		for i < len(src) && src[i] != '\'' {
			i++
		}
		if i >= len(src) {
			return 0, false
		}
		i++ // closing quote
		for i < len(src) && isSpaceByte(src[i]) {
			i++
		}
		if i < len(src) && src[i] == ',' {
			i++
			continue
		}
		if i < len(src) && src[i] == ']' {
			return i + 1, true
		}
		return 0, false
	}
}

func isWSOnlyGap(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		if !isSpaceByte(s[i]) {
			return false
		}
	}
	return true
}

// parseJoin transliterates legacy parseJOIN (eval_query.go:1795-1915) over
// logical tokens. joinTok is the already-consumed join-kind token; cur is
// the caller's pending item (legacy `argument`), returned possibly replaced.
// The quirks here are deliberate legacy parity (plan fact 14): the alias
// loop eats statement keywords; the ident-chain source inherits the broken
// isTable behavior; a statement in the conditions loop calls setRoot
// UNCONDITIONALLY (clause overwrite, no HasOwnProperty guard).
func (p *parserV2) parseJoin(q *queryNode, cur *itemNode, joinTok logicalToken) (*itemNode, error) {
	j := newJoinNode(joinTok.text)
	if !p.advance() {
		return cur, fmt.Errorf("wrong join signature for `%s` at [%s]", joinTok.text, p.src[joinTok.end:])
	}

	if p.cur.kind == logClosure {
		// parenthesized subquery source (legacy :1807-1813)
		rest := p.restAfterCur()
		sub := betweenBraces(rest)
		subQ, err := p.subParse(sub)
		if err != nil {
			return cur, err
		}
		j.source = subQ
		p.resumeRaw(safeTail(rest, len(sub)+1))
		p.clearCur() // legacy: s.Token = ""
	} else {
		// ident-chain source (legacy :1815-1840)
		sourceStr := ""
	source:
		for {
			text := p.cur.text
			switch {
			case isID(text) && !isTable(sourceStr) && strings.ToUpper(text) != "AS" && !onJoinTokenOnlyRe.MatchString(text):
				sourceStr += text
			case isMacro(text):
				sourceStr += text
			case p.cur.kind == logDot:
				sourceStr += text
			default:
				break source
			}
			if !p.advance() {
				break source
			}
		}
		if p.hasCur && p.cur.text == sourceStr {
			p.clearCur() // single-word source at stream end (fact 14)
		}
		j.sourceStr = sourceStr
	}

	// alias loop (legacy :1852-1865): everything except USING/ON is an alias —
	// including statement keywords (fact 14).
	for {
		if p.hasCur && !onJoinTokenOnlyRe.MatchString(p.cur.text) {
			j.aliases = append(j.aliases, p.cur.text)
		} else if p.hasCur && onJoinTokenOnlyRe.MatchString(p.cur.text) {
			break
		}
		if !p.advance() {
			break
		}
	}

	joinExpr := ""
	if p.hasCur {
		joinExpr = strings.ToLower(p.cur.text)
	}

	// conditions loop (legacy :1868-1907)
	nested := false
	for {
		if !p.advance() {
			break
		}
		if p.cur.kind == logStatement {
			if renderItem(cur) != "" {
				p.push(q, cur)
				cur = newItemNode()
			}
			p.setRoot(q, p.cur.text) // UNCONDITIONAL overwrite (fact 14)
			break
		}
		if p.cur.kind == logJoin {
			q.joins = append(q.joins, j)
			nested = true
			var err error
			cur, err = p.parseJoin(q, cur, p.cur)
			if err != nil {
				return cur, err
			}
			break
		}
		if joinExpr == "using" {
			if !isID(p.cur.text) {
				continue // commas/parens dropped (fact 14)
			}
			j.using = append(j.using, p.cur.text)
		} else {
			j.on = append(j.on, onPart{text: p.cur.text, cond: isCond(p.cur.text)})
		}
	}
	if !nested {
		q.joins = append(q.joins, j)
	}
	return cur, nil
}
