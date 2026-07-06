// pkg/eval/nodes.go
package eval

// Typed internal nodes for the #733 v2 parser (design §3.5). Nodes are
// created via new* constructors and handled ONLY as pointers, so the EvalAST
// value-vs-pointer panic class (#799) is unconstructible here. compat.go is
// the only place that renders them into the frozen EvalAST shape (§2.2/§2.3).

// itemPart is one atom of a clause item. The legacy engine accumulated items
// as strings ("argument"); v2 keeps the atoms typed and renders them in ONE
// place (compat.go renderItem), preserving the exact legacy glue semantics.
type itemPart interface{ isItemPart() }

// tokenPart is a single logical token, rendered under the §2.3 normalization
// rules (compat.go appendExprToken).
type tokenPart struct{ lt logicalToken }

// spacedPart renders as " "+text unconditionally — the legacy
// `argument += " " + s.Token` sites: the IN keyword and AND/OR inside an
// unbalanced item (plan facts 3, 4).
type spacedPart struct{ text string }

// rawPart renders verbatim — legacy direct concatenation sites: table-function
// "(…)" raw bodies (fact 10), the bare "," WHERE connector item (fact 3).
type rawPart struct{ text string }

// subqueryPart is an IN-subquery (facts 4-6). concat=true renders the
// sub-parse's root items concatenated inside " (…)"; concat=false renders
// " (\n" + PrintAST(sub, "    ") + ")".
type subqueryPart struct {
	q      *queryNode
	concat bool
}

func (tokenPart) isItemPart()    {}
func (spacedPart) isItemPart()   {}
func (rawPart) isItemPart()      {}
func (subqueryPart) isItemPart() {}

// itemNode is one clause item — one element of an EvalAST clause Arr.
type itemNode struct{ parts []itemPart }

func newItemNode() *itemNode { return &itemNode{} }

func (it *itemNode) add(p itemPart) { it.parts = append(it.parts, p) }

// clauseNode is one clause ("root", "select", …, "union all", or a macro key
// like "$columns"). Exactly one payload shape is populated:
//   - items               — plain Arr clause;
//   - sub (+ subAliases)  — FROM replaced by a subquery (fact 10); pushes
//     that arrive afterwards land in the sub's "aliases" (fact 11);
//   - subQueries          — the "union all" segments (fact 13).
type clauseNode struct {
	name       string
	items      []*itemNode
	sub        *queryNode
	subAliases []*itemNode
	subQueries []*queryNode
}

// queryNode is one parsed (sub)query.
type queryNode struct {
	clauses []*clauseNode // creation order; compat emits them as map keys
	joins   []*joinNode
}

func newQueryNode() *queryNode { return &queryNode{} }

// setClause creates the named clause — or RESETS it in place if it exists
// (legacy SetRoot and the macro-branch "select" reset both overwrite
// unconditionally; plan facts 14, 15).
func (q *queryNode) setClause(name string) *clauseNode {
	c := &clauseNode{name: name}
	for i, existing := range q.clauses {
		if existing.name == name {
			q.clauses[i] = c
			return c
		}
	}
	q.clauses = append(q.clauses, c)
	return c
}

func (q *queryNode) findClause(name string) *clauseNode {
	for _, c := range q.clauses {
		if c.name == name {
			return c
		}
	}
	return nil
}

func (q *queryNode) hasClause(name string) bool { return q.findClause(name) != nil }

// onPart is one atom of a JOIN ON condition: raw concatenation, except
// AND/OR which render as " AND " uppercased (plan fact 14).
type onPart struct {
	text string
	cond bool
}

// joinNode mirrors the legacy joinAST shape {type, source, aliases, using, on}.
// source is set for a parenthesized subquery source; otherwise sourceStr (the
// raw-concatenated ident chain, possibly "") is emitted as {root:[sourceStr]}.
type joinNode struct {
	typeRaw   string
	source    *queryNode
	sourceStr string
	aliases   []string
	using     []string
	on        []onPart
}

func newJoinNode(typeRaw string) *joinNode { return &joinNode{typeRaw: typeRaw} }
