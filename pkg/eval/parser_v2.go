// pkg/eval/parser_v2.go
package eval

import (
	"fmt"
	"strings"
)

// toASTV2 is the #733 Phase-2 recursive-descent engine entry point.
// Implemented across Tasks 5-9; until then it reports itself unimplemented.
func toASTV2(src string) (*EvalAST, error) {
	return nil, fmt.Errorf("parser v2: not implemented")
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
