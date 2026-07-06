// pkg/eval/parser_v2_test.go
package eval

import (
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
