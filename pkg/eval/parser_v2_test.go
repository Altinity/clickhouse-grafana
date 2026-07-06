// pkg/eval/parser_v2_test.go
package eval

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

// lscan is the test entry: truncating tokenizer + logical grouping.
func lscan(t *testing.T, src string) []logicalToken {
	t.Helper()
	return logicalScan(src, tokenizeForParse(src))
}

type wantLog struct {
	kind logKind
	text string
}

func requireLogical(t *testing.T, src string, want []wantLog) {
	t.Helper()
	got := make([]wantLog, 0)
	for _, lt := range lscan(t, src) {
		got = append(got, wantLog{lt.kind, lt.text})
	}
	require.Equal(t, want, got, "logical stream mismatch for %q", src)
}

func TestLogicalStatements(t *testing.T) {
	requireLogical(t, "SELECT x FROM t GROUP BY x ORDER BY y LIMIT 10", []wantLog{
		{logStatement, "SELECT"}, {logToken, "x"}, {logStatement, "FROM"}, {logToken, "t"},
		{logStatement, "GROUP BY"}, {logToken, "x"}, {logStatement, "ORDER BY"}, {logToken, "y"},
		{logStatement, "LIMIT"}, {logToken, "10"},
	})
	// fact 12: the single-space rule — two spaces or a newline defeat the pair
	requireLogical(t, "GROUP  BY", []wantLog{{logToken, "GROUP"}, {logToken, "BY"}})
	requireLogical(t, "GROUP\nBY", []wantLog{{logToken, "GROUP"}, {logToken, "BY"}})
	// raw case is preserved in the grouped slice
	requireLogical(t, "Union All", []wantLog{{logStatement, "Union All"}})
	requireLogical(t, "prewhere with having format", []wantLog{
		{logStatement, "prewhere"}, {logStatement, "with"}, {logStatement, "having"}, {logStatement, "format"},
	})
}

func TestLogicalJoins(t *testing.T) {
	// fact 17: join kinds glue across any whitespace-only gap, raw slice kept
	requireLogical(t, "a GLOBAL ANY LEFT\n OUTER JOIN b", []wantLog{
		{logToken, "a"}, {logJoin, "GLOBAL ANY LEFT\n OUTER JOIN"}, {logToken, "b"},
	})
	requireLogical(t, "left array join x", []wantLog{{logJoin, "left array join"}, {logToken, "x"}})
	requireLogical(t, "array join join", []wantLog{{logJoin, "array join"}, {logJoin, "join"}})
	requireLogical(t, "cross join", []wantLog{{logJoin, "cross join"}})
	// non-shapes stay idents
	requireLogical(t, "outer left", []wantLog{{logToken, "outer"}, {logToken, "left"}})
}

func TestJoinShapesMatchLegacyRegex(t *testing.T) {
	// 72 [global][any|all][dir][outer] join combos + array join + left array join
	require.Len(t, joinShapes, 74)
	for shape := range joinShapes {
		require.True(t, joinsOnlyRe.MatchString(shape), "shape %q rejected by legacy joinsRe", shape)
	}
	for _, not := range []string{"outer", "left", "global", "any left", "inner array join"} {
		require.False(t, joinShapes[not], "%q must not be a shape", not)
	}
}

func TestLogicalInForms(t *testing.T) {
	requireLogical(t, "x not in (1)", []wantLog{
		{logToken, "x"}, {logIn, "not in"}, {logClosure, "("}, {logToken, "1"}, {logClosure, ")"},
	})
	requireLogical(t, "global not in", []wantLog{{logIn, "global not in"}})
	requireLogical(t, "global in", []wantLog{{logIn, "global in"}})
	requireLogical(t, "global join", []wantLog{{logJoin, "global join"}})
	// single-space rule (fact 17): two spaces break the form, "in" matches alone
	requireLogical(t, "not  in", []wantLog{{logToken, "not"}, {logIn, "in"}})
	// fact 7: the quoted-string array swallow, raw inner spacing preserved
	requireLogical(t, "IN ['aa', 'bb'] AND", []wantLog{{logIn, "IN ['aa', 'bb']"}, {logCond, "AND"}})
	// no quoted strings -> no swallow (this is the IN [$hash] path, fact 6)
	requireLogical(t, "IN [$x]", []wantLog{
		{logIn, "IN"}, {logClosure, "["}, {logToken, "$x"}, {logClosure, "]"},
	})
}

func TestLogicalCondMacroPunct(t *testing.T) {
	requireLogical(t, "and or AND", []wantLog{{logCond, "and"}, {logCond, "or"}, {logCond, "AND"}})
	// macroFuncRe is case-sensitive (fact 15)
	requireLogical(t, "$rate $lttbMs $conditionalTest $COLUMNS ${var}", []wantLog{
		{logMacroFunc, "$rate"}, {logMacroFunc, "$lttbMs"}, {logToken, "$conditionalTest"},
		{logToken, "$COLUMNS"}, {logToken, "${var}"},
	})
	requireLogical(t, "a.b .5 .", []wantLog{
		{logToken, "a"}, {logDot, "."}, {logToken, "b"}, {logToken, ".5"}, {logDot, "."},
	})
	requireLogical(t, "-- c\nx /* b */ , ( ) [ ]", []wantLog{
		{logComment, "-- c"}, {logToken, "x"}, {logComment, "/* b */"}, {logComma, ","},
		{logClosure, "("}, {logClosure, ")"}, {logClosure, "["}, {logClosure, "]"},
	})
}

// tokenizeForParse mirrors the legacy silent-truncation semantics (fact 8):
// on a lexer error the stream simply ends — no error, no panic.
func TestTokenizeForParseTruncates(t *testing.T) {
	toks := tokenizeForParse("SELECT '")
	texts := []string{}
	for _, tk := range toks {
		if tk.Kind != TokWS {
			texts = append(texts, tk.Text)
		}
	}
	require.Equal(t, []string{"SELECT"}, texts)
	require.Empty(t, tokenizeForParse("'unterminated"))
	// clean input is identical to Tokenize
	clean, err := Tokenize("SELECT 1")
	require.NoError(t, err)
	require.Equal(t, clean, tokenizeForParse("SELECT 1"))
}

func TestLogicalOffsets(t *testing.T) {
	src := "a GROUP BY b"
	lts := lscan(t, src)
	require.Len(t, lts, 3)
	gb := lts[1]
	require.Equal(t, "GROUP BY", gb.text)
	require.Equal(t, src[gb.start:gb.end], gb.text)
}

// requireV2MatchesLegacy is the in-process mini-differential used by Tasks
// 5-9: v2 and legacy must produce byte-identical AST JSON and PrintAST output
// for the given query. Task 10's corpus gate generalizes this to all 202
// cases plus the expansion goldens.
func requireV2MatchesLegacy(t *testing.T, query string) {
	t.Helper()
	legacyScanner := NewScanner(query)
	legacyAST, legacyErr := legacyScanner.toASTLegacy()
	require.NoError(t, legacyErr, "legacy failed on %q", query)
	v2AST, v2Err := toASTV2(query)
	require.NoError(t, v2Err, "v2 failed on %q", query)
	legacyJSON, err := json.MarshalIndent(legacyAST, "", "  ")
	require.NoError(t, err)
	v2JSON, err := json.MarshalIndent(v2AST, "", "  ")
	require.NoError(t, err)
	require.Equal(t, string(legacyJSON), string(v2JSON), "AST mismatch for %q", query)
	require.Equal(t, PrintAST(legacyAST, " "), PrintAST(v2AST, " "), "PrintAST mismatch for %q", query)
}

// Every query below exercises ONLY Task-5 machinery: statements, items,
// commas, WHERE/PREWHERE conds, comments, glue quirks. No FROM-(, no JOIN,
// no IN, no macro heads, no UNION ALL (those are Tasks 6-9).
func TestParserV2ClauseSkeleton(t *testing.T) {
	for _, q := range []string{
		"SELECT col2/col1*10000 FROM t",
		"SELECT -1, a.b, arr[1], f(a,b), g( x ,  y ) FROM t",
		"SELECT x -- c\n, y FROM t",
		"SELECT x /* blk */ , y FROM t",
		"-- c\nSELECT 1 FROM t",
		"/* head */ SELECT 1 FROM t",
		"SELECT 1 FROM t WHERE a = 1 AND (b = 2 OR c = 3), d = 4 OR e = 5",
		"SELECT 1 FROM t WHERE (AND x = 1)",
		"SELECT a, count() FROM t GROUP BY a, b HAVING count() > 1",
		"WITH 1 AS x SELECT x FROM t",
		"WITH x AS (SELECT a FROM b) SELECT x FROM t",
		"SELECT x FROM t ORDER BY x WITH FILL STEP 1",
		"SELECT x FROM t ORDER BY x DESC, y ASC",
		"SELECT 1 FROM t LIMIT 10, 20",
		"SELECT concat('a','b') FROM t PREWHERE d = today() FORMAT JSON",
		"SELECT 1 FROM t PREWHERE a = 1 AND b = 2",
		"SELECT x, from FROM t",
		"SELECT FROM t",
		"SELECT , x FROM t",
		"SELECT x FROM t GROUP  BY x",
		"SELECT x FROM t GROUP\nBY x",
		"SELECT 'a b  c', `q id`, \"dq\" FROM t",
		"SELECT !flag, not x FROM t",
		"SELECT 1 FROM default.test_grafana FINAL",
		"SELECT 1 FROM t WHERE a = 1 ORDER BY x",
		"SELECT $timeSeries as t, count() FROM t WHERE $timeFilter GROUP BY t ORDER BY t",
	} {
		requireV2MatchesLegacy(t, q)
	}
}

// Literal leaf pins for readability (probe-verified facts 1-3, 12, 16).
func TestParserV2SkeletonLeaves(t *testing.T) {
	ast, err := toASTV2("SELECT x -- c\n, y FROM t WHERE a = 1 AND (b = 2 OR c = 3), d = 4")
	require.NoError(t, err)
	require.Equal(t, []interface{}{"x-- c\n", "y"}, ast.Obj["select"].(*EvalAST).Arr)
	require.Equal(t,
		[]interface{}{"a = 1", "AND(b = 2 OR c = 3)", ",", "d = 4"},
		ast.Obj["where"].(*EvalAST).Arr)

	ast, err = toASTV2("SELECT , x FROM t")
	require.NoError(t, err)
	require.Equal(t, []interface{}{"", "x"}, ast.Obj["select"].(*EvalAST).Arr)

	ast, err = toASTV2("SELECT FROM t")
	require.NoError(t, err)
	require.Equal(t, []interface{}{"FROM t"}, ast.Obj["select"].(*EvalAST).Arr)
	require.False(t, ast.HasOwnProperty("from"))
}

func TestParserV2From(t *testing.T) {
	for _, q := range []string{
		// subquery + one accumulated alias item (facts 9-11)
		"SELECT 1 FROM (SELECT 2 FROM u) AS s WHERE 1",
		"SELECT 1 FROM (SELECT 2 FROM (SELECT 3 FROM inner1) i1) i2",
		// whitelisted table functions keep the RAW inner text (fact 10)
		"SELECT 1 FROM numbers(10)",
		"SELECT 1 FROM numbers( 10 , 20 )",
		"SELECT 1 FROM clusterAllReplicas('{cluster}', merge(system,'^query_log')) WHERE x = 1",
		// non-whitelisted: from replaced, head becomes the alias (fact 10)
		"SELECT 1 FROM myfunc(10)",
		"SELECT 1 FROM myfunc(10) AS z",
		// quote-blind betweenBraces cut + silent truncation (facts 8-9)
		"SELECT 1 FROM (SELECT ')' AS p FROM u) q",
	} {
		requireV2MatchesLegacy(t, q)
	}
}

func TestParserV2FromLeaves(t *testing.T) {
	ast, err := toASTV2("SELECT 1 FROM numbers( 10 , 20 )")
	require.NoError(t, err)
	require.Equal(t, []interface{}{"numbers( 10 , 20 )"}, ast.Obj["from"].(*EvalAST).Arr)

	ast, err = toASTV2("SELECT 1 FROM myfunc(10) AS z")
	require.NoError(t, err)
	from := ast.Obj["from"].(*EvalAST)
	require.Nil(t, from.Arr, "from replaced by the sub-parse")
	require.Equal(t, []interface{}{"10"}, from.Obj["root"].(*EvalAST).Arr)
	require.Equal(t, []interface{}{"myfunc AS z"}, from.Obj["aliases"].(*EvalAST).Arr)
}

func TestParserV2Join(t *testing.T) {
	for _, q := range []string{
		"SELECT 1 FROM a INNER JOIN b ON a.id = b.id AND a.x > 1",
		"SELECT 1 FROM a ANY LEFT JOIN b AS bb USING (id, name)",
		"SELECT 1 FROM a ARRAY JOIN arr AS x WHERE 1",
		"SELECT 1 FROM a LEFT ARRAY JOIN arr",
		"SELECT 1 FROM a ARRAY JOIN $col AS c",
		"SELECT 1 FROM a INNER JOIN b WHERE x = 1",
		"SELECT 1 FROM a INNER JOIN b ON a.x=b.x LEFT JOIN c ON a.y=c.y WHERE q=1",
		"SELECT 1 FROM a GLOBAL ANY LEFT\n OUTER JOIN b ON a.x=b.x",
		"SELECT 1 FROM (SELECT 1 FROM q) x INNER JOIN (SELECT 2 FROM w) y ON x.a = y.a",
		"SELECT 1 FROM a INNER JOIN db.tbl x ON a.id=x.id",
		"SELECT 1 FROM a JOIN b",
		"SELECT 1 FROM a JOIN db.tbl",
	} {
		requireV2MatchesLegacy(t, q)
	}
}

func TestParserV2JoinLeaves(t *testing.T) {
	// alias loop eats statements (fact 14): no where clause, aliases get it
	ast, err := toASTV2("SELECT 1 FROM a ARRAY JOIN arr AS x WHERE 1")
	require.NoError(t, err)
	require.False(t, ast.HasOwnProperty("where"))
	join := ast.Obj["join"].(*EvalAST).Arr[0].(*EvalAST)
	require.Equal(t, []interface{}{"AS", "x", "WHERE", "1"}, join.Obj["aliases"].(*EvalAST).Arr)
	require.Equal(t, "ARRAY JOIN", join.Obj["type"])

	// raw multi-whitespace type slice + ON raw concat
	ast, err = toASTV2("SELECT 1 FROM a GLOBAL ANY LEFT\n OUTER JOIN b ON a.x=b.x AND q>1")
	require.NoError(t, err)
	join = ast.Obj["join"].(*EvalAST).Arr[0].(*EvalAST)
	require.Equal(t, "GLOBAL ANY LEFT\n OUTER JOIN", join.Obj["type"])
	require.Equal(t, []interface{}{"a.x=b.x AND q>1"}, join.Obj["on"].(*EvalAST).Arr)

	// isTable quirk: alias glues into the source chain (fact 14)
	ast, err = toASTV2("SELECT 1 FROM a INNER JOIN db.tbl x ON a.id=x.id")
	require.NoError(t, err)
	join = ast.Obj["join"].(*EvalAST).Arr[0].(*EvalAST)
	src := join.Obj["source"].(*EvalAST)
	require.Equal(t, []interface{}{"db.tblx"}, src.Obj["root"].(*EvalAST).Arr)
}

func TestParserV2JoinError(t *testing.T) {
	_, err := toASTV2("SELECT 1 FROM a INNER JOIN")
	require.Error(t, err)
	require.Contains(t, err.Error(), "wrong join signature for `INNER JOIN`")
}

func TestParserV2In(t *testing.T) {
	for _, q := range []string{
		// list concat quirk (fact 4)
		"SELECT 1 FROM t WHERE x IN (1,2,3)",
		"SELECT 1 FROM t WHERE x NOT IN ('a', 'b')",
		"SELECT type in (2,4) FROM t",
		"SELECT 1 FROM t WHERE x IN ($templateVar)",
		// subquery form (fact 5), all root positions
		"SELECT 1 FROM t WHERE x IN (SELECT id FROM u WHERE q = 1)",
		"SELECT 1 FROM t WHERE x GLOBAL NOT IN (SELECT id FROM u)",
		"SELECT a IN (SELECT q FROM u) AS flag FROM t",
		"SELECT 1 FROM a WHERE b IN (SELECT 1 FROM c) FROM d",
		// the [$hash] mangling (fact 6) — byte-parity, NOT an engine_diff
		"SELECT 1 FROM t WHERE h IN [$query_hash]",
		"SELECT 1 FROM t WHERE h IN [$query_hash]\nGROUP BY x",
		// swallowed quoted-array form (fact 7)
		"SELECT 1 FROM t WHERE x IN ['aa', 'bb'] AND y = 1",
		// in [ inside an unbalanced $conditionalTest( item (dash_3e6747ba5c shape)
		"SELECT 1 FROM t WHERE a = 1 $conditionalTest(AND h in [$query_hash],$query_hash)",
	} {
		requireV2MatchesLegacy(t, q)
	}
}

func TestParserV2InLeaves(t *testing.T) {
	ast, err := toASTV2("SELECT 1 FROM t WHERE x IN (1,2,3)")
	require.NoError(t, err)
	require.Equal(t, []interface{}{"x IN (123)"}, ast.Obj["where"].(*EvalAST).Arr)

	// fact 6 end-to-end: " (\n)" push, resume one byte past '[', ']' poisons
	// isClosured so the trailing GROUP BY glues into the last item. (This
	// exact query is also in the parity battery above — if this literal pin
	// ever disagrees with requireV2MatchesLegacy, trust the parity check and
	// correct the literal.)
	ast, err = toASTV2("SELECT 1 FROM t WHERE h IN [$query_hash]\nGROUP BY x")
	require.NoError(t, err)
	require.Equal(t,
		[]interface{}{"h IN (\n)", "query_hash] GROUP BY x"},
		ast.Obj["where"].(*EvalAST).Arr)
	require.False(t, ast.HasOwnProperty("group by"))

	// fact 7: swallowed IN-array keeps the whole thing one item
	ast, err = toASTV2("SELECT 1 FROM t WHERE x IN ['aa', 'bb'] AND y = 1")
	require.NoError(t, err)
	require.Equal(t, []interface{}{"x IN ['aa', 'bb'] AND y = 1"}, ast.Obj["where"].(*EvalAST).Arr)
}

func TestParserV2InError(t *testing.T) {
	_, err := toASTV2("SELECT 1 FROM t WHERE x IN")
	require.Error(t, err)
	require.Contains(t, err.Error(), "wrong `IN` signature for `x IN`")
}

func TestParserV2MacroHeads(t *testing.T) {
	for _, q := range []string{
		"$columns(a, sum(b) c) FROM t WHERE z = 1",
		"$rate(cnt c) FROM t",
		"$rateColumns(x, y) FROM t",
		"$perSecondColumns(k, v) FROM t WHERE a = 1",
		"$lttbMs(t, v) FROM t2 WHERE x = 1",
		"$deltaColumnsAggregated(a, b, sum(c) c) FROM t",
		"SELECT $rate(x) FROM t",                   // fires mid-select, resets select (fact 15)
		"$COLUMNS(a, b) FROM t",                    // case-sensitive: NOT a macro head (fact 15)
		"$conditionalTest(AND x = 1, $var) FROM t", // not in macroFuncRe either
	} {
		requireV2MatchesLegacy(t, q)
	}
}

func TestParserV2MacroHeadLeaves(t *testing.T) {
	ast, err := toASTV2("$columns(a, sum(b) c) FROM t WHERE z = 1")
	require.NoError(t, err)
	require.Equal(t, []interface{}{"a", "sum(b) c"}, ast.Obj["$columns"].(*EvalAST).Arr)
	require.Equal(t, []interface{}{}, ast.Obj["select"].(*EvalAST).Arr, "select reset to empty")
	require.Equal(t, []interface{}{"t"}, ast.Obj["from"].(*EvalAST).Arr)
}

func TestParserV2MacroHeadError(t *testing.T) {
	_, err := toASTV2("SELECT $rate")
	require.Error(t, err)
	require.Contains(t, err.Error(), "wrong macros signature for `$rate`")
}

func TestParserV2UnionAll(t *testing.T) {
	for _, q := range []string{
		"SELECT 1 FROM a UNION ALL SELECT 2 FROM b",
		"SELECT 1 FROM a UNION ALL SELECT 2 FROM b UNION ALL SELECT 3 FROM c",
		"SELECT 'has union all inside' FROM a UNION ALL SELECT 2 FROM b",
		"SELECT 1 FROM a UNION ALL",                                            // trailing: empty Arr (fact 13)
		"SELECT 1 FROM a UNION ALL SELECT 2 FROM b union  all SELECT 3 FROM c", // 2 spaces: no split (fact 13)
		"SELECT 1 FROM (SELECT 2 UNION ALL SELECT 3) x",                        // union inside a FROM subquery
	} {
		requireV2MatchesLegacy(t, q)
	}
}

func TestParserV2UnionAllLeaves(t *testing.T) {
	ast, err := toASTV2("SELECT 1 FROM a UNION ALL SELECT 2 FROM b UNION ALL SELECT 3 FROM c")
	require.NoError(t, err)
	unions := ast.Obj["union all"].(*EvalAST)
	require.Len(t, unions.Arr, 2)
	first := unions.Arr[0].(*EvalAST)
	require.Equal(t, []interface{}{"2"}, first.Obj["select"].(*EvalAST).Arr)

	ast, err = toASTV2("SELECT 1 FROM a UNION ALL")
	require.NoError(t, err)
	require.Equal(t, []interface{}{}, ast.Obj["union all"].(*EvalAST).Arr)
}

// TestParserV2UnionAllInvalidUTF8NoPanic regresses the FuzzToASTV2 crasher
// add4b9b189ddb2b3: an invalid UTF-8 byte in the union-all remainder makes
// strings.ToLower expand to the 3-byte U+FFFD, so the "union all" offset found
// in the lowered copy overran the original slice ([21:19]). Legacy panics on
// this input too (eval_query.go:1760-1769); v2 must not.
func TestParserV2UnionAllInvalidUTF8NoPanic(t *testing.T) {
	for _, q := range []string{
		"UNION ALL 00000000\xf4UNION ALL",
		"union all \xf4\xf4\xf4union all",
		"SELECT 1 UNION ALL \xf4 UNION ALL SELECT 2",
	} {
		require.NotPanics(t, func() { _, _ = toASTV2(q) }, "v2 must not panic on %q", q)
	}
}
