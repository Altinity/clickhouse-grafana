// pkg/eval/compat.go
package eval

import "strings"

// compat.go renders the typed v2 nodes (nodes.go) into the frozen EvalAST
// shape (design §2.2) with the legacy leaf normalization (§2.3). It is THE
// single place where v2 output bytes are decided; parser_v2.go never
// concatenates rendered strings itself.
//
// Deviation from the design sketch (§3.6): toEvalAST returns no error —
// rendering has no failure modes; every failure surfaces at parse time.

// isSkipSpaceByte mirrors legacy skipSpaceRe = [\(\.! \[] (eval_query.go:2046):
// after one of these bytes the next token glues without a space.
func isSkipSpaceByte(c byte) bool {
	switch c {
	case '(', '.', '!', ' ', '[':
		return true
	}
	return false
}

// appendExprToken appends one logical token under the §2.3 rules — the
// legacy appendToken (eval_query.go:1630) plus the loop's branch tails
// (:1777-1786), probe-verified as plan facts 1-2:
//   - comments append text+"\n", glued (no leading space);
//   - ( ) [ ] and the '.' operator append glued;
//   - ',' appends ", ";
//   - everything else appends " "+text, except at the very start or after a
//     byte in {'(', '.', '!', ' ', '['}, where it glues.
func appendExprToken(b *strings.Builder, lt logicalToken) {
	switch lt.kind {
	case logComment:
		b.WriteString(lt.text)
		b.WriteString("\n")
	case logClosure, logDot:
		b.WriteString(lt.text)
	case logComma:
		b.WriteString(lt.text)
		b.WriteString(" ")
	default:
		s := b.String()
		if s != "" && !isSkipSpaceByte(s[len(s)-1]) {
			b.WriteString(" ")
		}
		b.WriteString(lt.text)
	}
}

// renderExpr renders a bare run of logical tokens — the unit-testable §2.3
// normalizer. renderItem applies the same appendExprToken core per part.
func renderExpr(lts []logicalToken) string {
	var b strings.Builder
	for _, lt := range lts {
		appendExprToken(&b, lt)
	}
	return b.String()
}

// renderItem renders one itemNode to its legacy leaf string. The spacing
// state (last written byte) carries across parts, exactly like the legacy
// single accumulated "argument" string.
func renderItem(it *itemNode) string {
	var b strings.Builder
	for _, p := range it.parts {
		switch part := p.(type) {
		case tokenPart:
			appendExprToken(&b, part.lt)
		case spacedPart:
			b.WriteString(" ")
			b.WriteString(part.text)
		case rawPart:
			b.WriteString(part.text)
		case subqueryPart:
			if part.concat {
				// legacy :1729-1733 — root items concatenated, NO separators
				b.WriteString(" (")
				if root := part.q.findClause("root"); root != nil {
					for _, item := range root.items {
						b.WriteString(renderItem(item))
					}
				}
				b.WriteString(")")
			} else {
				// legacy :1735 — " (" + newLine + PrintAST(sub, tabSize) + ")"
				b.WriteString(" (")
				b.WriteString(newLine)
				b.WriteString(PrintAST(part.q.toEvalAST(), tabSize))
				b.WriteString(")")
			}
		}
	}
	return b.String()
}

// renderOnCondition renders a JOIN ON condition: raw concatenation, except
// AND/OR which become " AND " uppercased (legacy :1901-1905, plan fact 14).
func renderOnCondition(parts []onPart) string {
	var b strings.Builder
	for _, p := range parts {
		if p.cond {
			b.WriteString(" ")
			b.WriteString(strings.ToUpper(p.text))
			b.WriteString(" ")
		} else {
			b.WriteString(p.text)
		}
	}
	return b.String()
}

// toEvalAST renders the typed tree to the frozen EvalAST shape (§2.2).
// Shapes mirror legacy construction exactly (plan fact 18): Arr clauses via
// newEvalAST(false) (Arr always non-nil), subquery clauses as Obj-ASTs with
// injected "aliases", "union all" as an Arr of sub-ASTs, joins under "join".
func (q *queryNode) toEvalAST() *EvalAST {
	tree := newEvalAST(true)
	for _, c := range q.clauses {
		switch {
		case c.name == "union all":
			// c.items is always empty here: the union-all parser branch
			// consumes the whole remainder, so nothing can be pushed after
			// SetRoot("union all") (fact 13).
			arr := newEvalAST(false)
			for _, uq := range c.subQueries {
				arr.push(uq.toEvalAST())
			}
			tree.Obj[c.name] = arr
		case c.sub != nil:
			subAST := c.sub.toEvalAST()
			if len(c.subAliases) > 0 {
				aliases := newEvalAST(false)
				for _, it := range c.subAliases {
					aliases.push(renderItem(it))
				}
				subAST.Obj["aliases"] = aliases
			}
			tree.Obj[c.name] = subAST
		default:
			arr := newEvalAST(false)
			for _, it := range c.items {
				arr.push(renderItem(it))
			}
			tree.Obj[c.name] = arr
		}
	}
	if len(q.joins) > 0 {
		joins := newEvalAST(false)
		for _, j := range q.joins {
			joins.push(j.toEvalAST())
		}
		tree.Obj["join"] = joins
	}
	return tree
}

// toEvalAST renders one join to the legacy joinAST shape: all five keys
// always present (legacy :1843-1850), the ident-chain source as
// {Obj:{root:{Arr:[sourceStr]}}, Arr:nil} (legacy :1836-1840).
func (j *joinNode) toEvalAST() *EvalAST {
	var source *EvalAST
	if j.source != nil {
		source = j.source.toEvalAST()
	} else {
		source = &EvalAST{Obj: map[string]interface{}{
			"root": &EvalAST{Arr: []interface{}{j.sourceStr}},
		}}
	}
	aliases := newEvalAST(false)
	for _, a := range j.aliases {
		aliases.push(a)
	}
	using := newEvalAST(false)
	for _, u := range j.using {
		using.push(u)
	}
	on := newEvalAST(false)
	if cond := renderOnCondition(j.on); cond != "" {
		on.push(cond)
	}
	return &EvalAST{Obj: map[string]interface{}{
		"type":    j.typeRaw,
		"source":  source,
		"aliases": aliases,
		"using":   using,
		"on":      on,
	}}
}
