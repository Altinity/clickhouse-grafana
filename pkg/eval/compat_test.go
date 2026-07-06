// pkg/eval/compat_test.go
package eval

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRenderExprNormalization(t *testing.T) {
	cases := map[string]string{
		// operator re-spacing (design §2.3 pinned examples)
		"col2/col1*10000": "col2 / col1 * 10000",
		"-1":              "- 1",
		// glue after ( . ! [ and space; ), ] attach glued
		"f(a,b)":        "f(a, b)",
		"g( x ,  y )":   "g(x, y)",
		"a.b":           "a.b",
		"arr[1]":        "arr[1]",
		"!flag":         "!flag",
		"count() > 1":   "count() > 1",
		"not x":         "not x",
		"exception<>''": "exception <> ''",
		// corpus-golden leaf (dash_2528af132a): ] and ) glue, 'as' spaced
		"sum(ProfileEvents['OSReadBytes'] ) as x": "sum(ProfileEvents['OSReadBytes']) as x",
		// comments: glued, trailing \n re-added (fact 2) — line AND block
		"x -- c":      "x-- c\n",
		"x /* blk */": "x/* blk */\n",
		"/* head */":  "/* head */\n",
		// strings and quoted idents verbatim
		"'a b  c'": "'a b  c'",
		"`q id`":   "`q id`",
		// cond + '(' glue (where-item shape, fact 3)
		"AND (b=2 OR c=3)": "AND(b = 2 OR c = 3)",
		// statement keywords glued into an expression re-space to one blank
		"t GROUP  BY x": "t GROUP BY x",
		// number-after-macro shape (probe: '$ns .8090.svc')
		"$ns.8090.svc": "$ns .8090.svc",
		// db.table + FINAL
		"default.test_grafana FINAL": "default.test_grafana FINAL",
		// order-by tail with WITH FILL
		"x WITH FILL STEP 1": "x WITH FILL STEP 1",
	}
	for src, want := range cases {
		require.Equal(t, want, renderExpr(lscan(t, src)), "renderExpr(%q)", src)
	}
}

// TestRenderExprMatchesCorpusLeaves validates the §2.3 normalizer against REAL
// leaf strings frozen in the corpus <name>.ast.golden.json files. Each string
// is already-normalized legacy output; feeding it back through lscan+renderExpr
// must reproduce it byte-for-byte (idempotence), proving the normalizer matches
// the frozen legacy tokenizer re-spacing rather than hand-picked cases.
func TestRenderExprMatchesCorpusLeaves(t *testing.T) {
	// leaves taken verbatim from testdata/corpus/*.ast.golden.json
	leaves := []string{
		// simple_select.ast.golden.json
		"a",
		"c / d * 100 AS ratio", // arithmetic re-spacing
		"x > 1",
		"default.test_grafana", // dot glue
		// dash_2528af132a.ast.golden.json
		"sum(query_duration_ms) / 1000 AS QueriesDuration",
		"count() as cnt",
		"toString(normalized_query_hash) as query_hash",
		"sum(ProfileEvents['OSReadBytes']) as OSReadBytesExcludePageCache", // [ ] ) glue
		// nested parens + comma → ", " + arithmetic (round(...) AS percent leaf)
		"round((count() / max(too_big_value)) * 100, 2) AS percent",
		// block comment leaf: trailing \n re-added, then " sum" (fact 2)
		"/* wall clock */\n sum(ProfileEvents['OSCPUVirtualTimeMicroseconds'] as cputime) / 1000000 AS OSCPUVirtualTime",
	}
	for _, leaf := range leaves {
		require.Equal(t, leaf, renderExpr(lscan(t, leaf)), "corpus leaf idempotence for %q", leaf)
	}
}

func TestRenderItemParts(t *testing.T) {
	// spacedPart + concat subqueryPart: the IN-list quirk (fact 4)
	sub := newQueryNode()
	root := sub.setClause("root")
	for _, s := range []string{"1", "2", "3"} {
		it := newItemNode()
		for _, lt := range lscan(t, s) {
			it.add(tokenPart{lt})
		}
		root.items = append(root.items, it)
	}
	item := newItemNode()
	for _, lt := range lscan(t, "x") {
		item.add(tokenPart{lt})
	}
	item.add(spacedPart{"IN"})
	item.add(subqueryPart{q: sub, concat: true})
	require.Equal(t, "x IN (123)", renderItem(item))

	// printed subqueryPart: " (\n" + PrintAST + ")" (fact 5, probe-verified)
	sq := newQueryNode()
	sq.setClause("root")
	selItem := newItemNode()
	for _, lt := range lscan(t, "id") {
		selItem.add(tokenPart{lt})
	}
	sq.setClause("select").items = []*itemNode{selItem}
	fromItem := newItemNode()
	for _, lt := range lscan(t, "u") {
		fromItem.add(tokenPart{lt})
	}
	sq.setClause("from").items = []*itemNode{fromItem}
	item2 := newItemNode()
	for _, lt := range lscan(t, "x") {
		item2.add(tokenPart{lt})
	}
	item2.add(spacedPart{"IN"})
	item2.add(subqueryPart{q: sq, concat: false})
	require.Equal(t, "x IN (\n    SELECT id\n\n    FROM u\n)", renderItem(item2))

	// rawPart glues verbatim (table-func body, fact 10)
	item3 := newItemNode()
	for _, lt := range lscan(t, "numbers") {
		item3.add(tokenPart{lt})
	}
	item3.add(rawPart{"( 10 , 20 )"})
	require.Equal(t, "numbers( 10 , 20 )", renderItem(item3))

	// spacing state carries across parts: token after a rawPart ending in ')'
	for _, lt := range lscan(t, "AS z") {
		item3.add(tokenPart{lt})
	}
	require.Equal(t, "numbers( 10 , 20 ) AS z", renderItem(item3))

	// empty concat list renders " ()" — and empty printed sub renders " (\n)"
	empty := newQueryNode()
	empty.setClause("root")
	item4 := newItemNode()
	item4.add(spacedPart{"IN"})
	item4.add(subqueryPart{q: empty, concat: false})
	require.Equal(t, " IN (\n)", renderItem(item4))
}

func TestRenderOnCondition(t *testing.T) {
	parts := []onPart{
		{text: "a"}, {text: "."}, {text: "id"}, {text: "="},
		{text: "b"}, {text: "."}, {text: "id"},
		{text: "and", cond: true},
		{text: "a"}, {text: "."}, {text: "x"}, {text: ">"}, {text: "1"},
	}
	require.Equal(t, "a.id=b.id AND a.x>1", renderOnCondition(parts))
	require.Equal(t, "", renderOnCondition(nil))
}

func TestJoinNodeToEvalASTShape(t *testing.T) {
	j := newJoinNode("INNER JOIN")
	j.sourceStr = "b"
	j.on = []onPart{{text: "a"}, {text: "="}, {text: "b"}}
	ast := j.toEvalAST()
	// all five keys always present (fact 14)
	require.Equal(t, "INNER JOIN", ast.Obj["type"])
	src := ast.Obj["source"].(*EvalAST)
	require.Nil(t, src.Arr)
	require.Equal(t, []interface{}{"b"}, src.Obj["root"].(*EvalAST).Arr)
	require.Empty(t, ast.Obj["aliases"].(*EvalAST).Arr)
	require.NotNil(t, ast.Obj["aliases"].(*EvalAST).Arr, "empty Arr, not nil (fact 18)")
	require.Empty(t, ast.Obj["using"].(*EvalAST).Arr)
	require.Equal(t, []interface{}{"a=b"}, ast.Obj["on"].(*EvalAST).Arr)
}

func TestQueryNodeToEvalAST(t *testing.T) {
	q := newQueryNode()
	q.setClause("root")
	it := newItemNode()
	for _, lt := range lscan(t, "1") {
		it.add(tokenPart{lt})
	}
	q.setClause("select").items = []*itemNode{it}
	fromIt := newItemNode()
	for _, lt := range lscan(t, "t") {
		fromIt.add(tokenPart{lt})
	}
	q.setClause("from").items = []*itemNode{fromIt}

	ast := q.toEvalAST()
	require.Equal(t, []interface{}{}, ast.Obj["root"].(*EvalAST).Arr)
	require.Equal(t, []interface{}{"1"}, ast.Obj["select"].(*EvalAST).Arr)
	require.Equal(t, []interface{}{"t"}, ast.Obj["from"].(*EvalAST).Arr)

	// from replaced by a subquery + one alias item (facts 10-11)
	subQ := newQueryNode()
	subQ.setClause("root")
	fc := q.findClause("from")
	fc.items = nil
	fc.sub = subQ
	al := newItemNode()
	for _, lt := range lscan(t, "AS s") {
		al.add(tokenPart{lt})
	}
	fc.subAliases = []*itemNode{al}
	ast = q.toEvalAST()
	from := ast.Obj["from"].(*EvalAST)
	require.Nil(t, from.Arr)
	require.Equal(t, []interface{}{"AS s"}, from.Obj["aliases"].(*EvalAST).Arr)

	// union all clause emits sub-ASTs (fact 13)
	uq := newQueryNode()
	uq.setClause("root")
	q.setClause("union all").subQueries = []*queryNode{uq}
	ast = q.toEvalAST()
	unions := ast.Obj["union all"].(*EvalAST)
	require.Len(t, unions.Arr, 1)
	require.IsType(t, &EvalAST{}, unions.Arr[0])
}
