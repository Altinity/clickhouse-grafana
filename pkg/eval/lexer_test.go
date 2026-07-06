// pkg/eval/lexer_test.go
package eval

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// wantTok is a compact (kind, text) expectation for requireTokens.
type wantTok struct {
	kind TokenKind
	text string
}

// requireLosslessTokens asserts the core lexer invariant: tokens are
// contiguous, non-empty, in order, offset-exact, and exactly cover src.
func requireLosslessTokens(t *testing.T, src string, toks []Token) {
	t.Helper()
	pos := 0
	for i, tk := range toks {
		require.Equal(t, pos, tk.Start, "token %d (%s %q): gap or overlap", i, tk.Kind, tk.Text)
		require.Greater(t, tk.End, tk.Start, "token %d: empty token", i)
		require.LessOrEqual(t, tk.End, len(src), "token %d: End beyond input", i)
		require.Equal(t, src[tk.Start:tk.End], tk.Text, "token %d: Text differs from source slice", i)
		pos = tk.End
	}
	require.Equal(t, len(src), pos, "tokens do not cover the whole input")
}

// lexNonWS tokenizes src, asserts losslessness, and returns non-WS tokens.
func lexNonWS(t *testing.T, src string) []Token {
	t.Helper()
	toks, err := Tokenize(src)
	require.NoError(t, err)
	requireLosslessTokens(t, src, toks)
	out := make([]Token, 0, len(toks))
	for _, tk := range toks {
		if tk.Kind != TokWS {
			out = append(out, tk)
		}
	}
	return out
}

// requireTokens asserts the (kind, text) sequence of non-WS tokens.
func requireTokens(t *testing.T, src string, want []wantTok) {
	t.Helper()
	got := make([]wantTok, 0)
	for _, tk := range lexNonWS(t, src) {
		got = append(got, wantTok{tk.Kind, tk.Text})
	}
	require.Equal(t, want, got, "token stream mismatch for %q", src)
}

func TestTokenizeEmptyAndWhitespace(t *testing.T) {
	toks, err := Tokenize("")
	require.NoError(t, err)
	require.Empty(t, toks)

	toks, err = Tokenize(" \t\r\n")
	require.NoError(t, err)
	require.Equal(t, []Token{{TokWS, 0, 4, " \t\r\n"}}, toks)
}

func TestTokenizePunctuation(t *testing.T) {
	requireTokens(t, "( ) [ ] , ? : ;", []wantTok{
		{TokLParen, "("}, {TokRParen, ")"}, {TokLBracket, "["}, {TokRBracket, "]"},
		{TokComma, ","}, {TokQuestion, "?"}, {TokColon, ":"}, {TokSemicolon, ";"},
	})
}

func TestTokenizeOperators(t *testing.T) {
	requireTokens(t, "=> || >= <= == != <> ->", []wantTok{
		{TokOp, "=>"}, {TokOp, "||"}, {TokOp, ">="}, {TokOp, "<="},
		{TokOp, "=="}, {TokOp, "!="}, {TokOp, "<>"}, {TokOp, "->"},
	})
	requireTokens(t, "+ - / % * = < > . !", []wantTok{
		{TokOp, "+"}, {TokOp, "-"}, {TokOp, "/"}, {TokOp, "%"}, {TokOp, "*"},
		{TokOp, "="}, {TokOp, "<"}, {TokOp, ">"}, {TokOp, "."}, {TokOp, "!"},
	})
	// longest-match: "===" is "==" then "=", "!==" is "!=" then "="
	requireTokens(t, "===", []wantTok{{TokOp, "=="}, {TokOp, "="}})
	requireTokens(t, "!==", []wantTok{{TokOp, "!="}, {TokOp, "="}})
}

func TestTokenizeUnknownByte(t *testing.T) {
	_, err := Tokenize("@")
	require.EqualError(t, err, `unexpected character '@' at offset 0`)
	_, err = Tokenize("== @")
	require.EqualError(t, err, `unexpected character '@' at offset 3`)
	_, err = Tokenize("{")
	require.EqualError(t, err, `unexpected character '{' at offset 0`)
}

func TestTokenizeComments(t *testing.T) {
	requireTokens(t, "-- tail comment", []wantTok{{TokComment, "-- tail comment"}})
	requireTokens(t, "-- line1\n-- line2", []wantTok{{TokComment, "-- line1"}, {TokComment, "-- line2"}})

	// The trailing newline is NOT part of the token — it lexes as TokWS.
	// This matches the legacy shape (probe-verified: commentRe has a (?=\n|$)
	// lookahead) and keeps the Task-6 differential comparison exact.
	toks, err := Tokenize("-- c\n")
	require.NoError(t, err)
	require.Equal(t, []Token{
		{TokComment, 0, 4, "-- c"},
		{TokWS, 4, 5, "\n"},
	}, toks)

	// single '-' stays an operator; '--' only doubles into a comment
	requireTokens(t, "- -", []wantTok{{TokOp, "-"}, {TokOp, "-"}})
	requireTokens(t, "(-- c\n)", []wantTok{{TokLParen, "("}, {TokComment, "-- c"}, {TokRParen, ")"}})

	// '#' and '#!' line comments (issue #610)
	requireTokens(t, "# hash comment", []wantTok{{TokComment, "# hash comment"}})
	requireTokens(t, "#! shebang style", []wantTok{{TokComment, "#! shebang style"}})
	requireTokens(t, "#", []wantTok{{TokComment, "#"}})

	// block comments: multi-line, empty, inner stars
	requireTokens(t, "/* multi\nline */", []wantTok{{TokComment, "/* multi\nline */"}})
	requireTokens(t, "/**/", []wantTok{{TokComment, "/**/"}})
	requireTokens(t, "/* a * b */", []wantTok{{TokComment, "/* a * b */"}})

	// '/' not followed by '*' is an operator
	requireTokens(t, "/ *", []wantTok{{TokOp, "/"}, {TokOp, "*"}})
}

func TestTokenizeCommentErrors(t *testing.T) {
	_, err := Tokenize("/* nope")
	require.EqualError(t, err, "unterminated block comment at offset 0")
	_, err = Tokenize("()/* x")
	require.EqualError(t, err, "unterminated block comment at offset 2")
}

func TestTokenizeStrings(t *testing.T) {
	requireTokens(t, "'a b'", []wantTok{{TokString, "'a b'"}})
	requireTokens(t, "''", []wantTok{{TokString, "''"}})

	// SQL '' doubling: ONE token (design §3.4). Legacy lexes this as TWO
	// tokens ('it' + 's') — an intended, documented divergence; no corpus
	// case exercises it (probe-verified), so the Task-6 diff stays clean.
	requireTokens(t, "'it''s'", []wantTok{{TokString, "'it''s'"}})

	requireTokens(t, `'a\'b'`, []wantTok{{TokString, `'a\'b'`}})
	requireTokens(t, `'\n'`, []wantTok{{TokString, `'\n'`}})

	// '--' inside a string is data, not a comment (#374 class)
	requireTokens(t, "'ccc--bert'", []wantTok{{TokString, "'ccc--bert'"}})

	// multi-byte UTF-8 content passes through untouched
	requireTokens(t, "'名前'", []wantTok{{TokString, "'名前'"}})

	// doubling lookahead must not glue two adjacent literals across a space
	requireTokens(t, "'' 'x'", []wantTok{{TokString, "''"}, {TokString, "'x'"}})
}

func TestTokenizeStringErrors(t *testing.T) {
	_, err := Tokenize("'abc")
	require.EqualError(t, err, "unterminated string literal at offset 0")
	_, err = Tokenize("() 'x")
	require.EqualError(t, err, "unterminated string literal at offset 3")
	_, err = Tokenize(`'a\`)
	require.EqualError(t, err, "unterminated string literal at offset 0")
}

func TestTokenizeQuotedIdents(t *testing.T) {
	requireTokens(t, "`from`", []wantTok{{TokQuotedIdent, "`from`"}})
	requireTokens(t, `"Count of samples"`, []wantTok{{TokQuotedIdent, `"Count of samples"`}})
	requireTokens(t, "`a b`,`c`", []wantTok{
		{TokQuotedIdent, "`a b`"}, {TokComma, ","}, {TokQuotedIdent, "`c`"},
	})
	_, err := Tokenize("`nope")
	require.EqualError(t, err, "unterminated quoted identifier at offset 0")
	_, err = Tokenize(`"nope`)
	require.EqualError(t, err, "unterminated quoted identifier at offset 0")
}

func TestTokenizeIdentifiers(t *testing.T) {
	requireTokens(t, "SELECT x FROM t GROUP BY x", []wantTok{
		{TokIdent, "SELECT"}, {TokIdent, "x"}, {TokIdent, "FROM"}, {TokIdent, "t"},
		{TokIdent, "GROUP"}, {TokIdent, "BY"}, {TokIdent, "x"},
	})
	requireTokens(t, "_under score_9", []wantTok{{TokIdent, "_under"}, {TokIdent, "score_9"}})

	// '#' at a token-start position begins a comment even with no whitespace
	// before it; it can never be INSIDE an ident (class excludes it)
	requireTokens(t, "a#b", []wantTok{{TokIdent, "a"}, {TokComment, "#b"}})

	// db.table: ident, '.' operator, ident
	requireTokens(t, "default.test_grafana", []wantTok{
		{TokIdent, "default"}, {TokOp, "."}, {TokIdent, "test_grafana"},
	})
}

func TestTokenizeNumbers(t *testing.T) {
	cases := []struct {
		src  string
		want []wantTok
	}{
		{"1", []wantTok{{TokNumber, "1"}}},
		{"42 7", []wantTok{{TokNumber, "42"}, {TokNumber, "7"}}},
		{"1.5", []wantTok{{TokNumber, "1.5"}}},
		{"1.", []wantTok{{TokNumber, "1."}}},
		{".5", []wantTok{{TokNumber, ".5"}}},
		{"1e6", []wantTok{{TokNumber, "1e6"}}},
		{"1E6", []wantTok{{TokNumber, "1E6"}}},
		{"1e+6", []wantTok{{TokNumber, "1e+6"}}},
		{"1E-6", []wantTok{{TokNumber, "1E-6"}}},
		// legacy quirk, preserved for the Phase-1 differential gate
		// (probe-verified): a dotted float NEVER takes an exponent
		{"1.5e3", []wantTok{{TokNumber, "1.5"}, {TokIdent, "e3"}}},
		// bare 'e' with no exponent digits stays outside the number
		{"1e", []wantTok{{TokNumber, "1"}, {TokIdent, "e"}}},
		{"1e+", []wantTok{{TokNumber, "1"}, {TokIdent, "e"}, {TokOp, "+"}}},
		// corpus-observed shape: leading-dot float straight after a macro
		{"$ns.8090.svc", []wantTok{
			{TokMacro, "$ns"}, {TokNumber, ".8090"}, {TokOp, "."}, {TokIdent, "svc"},
		}},
		// '.' not followed by a digit is an operator
		{"a.b", []wantTok{{TokIdent, "a"}, {TokOp, "."}, {TokIdent, "b"}}},
		{"1abc", []wantTok{{TokNumber, "1"}, {TokIdent, "abc"}}},
	}
	for _, c := range cases {
		requireTokens(t, c.src, c.want)
	}
}

func TestTokenizeMacros(t *testing.T) {
	requireTokens(t, "$timeSeries", []wantTok{{TokMacro, "$timeSeries"}})
	requireTokens(t, "$__interval_ms", []wantTok{{TokMacro, "$__interval_ms"}})
	requireTokens(t, "${var}", []wantTok{{TokMacro, "${var}"}})
	requireTokens(t, "${var:sqlstring}", []wantTok{{TokMacro, "${var:sqlstring}"}})
	// legacy macroRe allows leading digits and embedded '$' — mirror it
	requireTokens(t, "$5x", []wantTok{{TokMacro, "$5x"}})
	requireTokens(t, "$foo$bar", []wantTok{{TokMacro, "$foo$bar"}})
	requireTokens(t, "$table WHERE $timeFilter", []wantTok{
		{TokMacro, "$table"}, {TokIdent, "WHERE"}, {TokMacro, "$timeFilter"},
	})
}

func TestTokenizeMacroErrors(t *testing.T) {
	for src, wantErr := range map[string]string{
		"$":       "unexpected character '$' at offset 0",
		"$ x":     "unexpected character '$' at offset 0",
		"${":      "invalid macro syntax at offset 0",
		"${}":     "invalid macro syntax at offset 0",
		"${va-r}": "invalid macro syntax at offset 0",
		"${var":   "invalid macro syntax at offset 0",
		"${var:}": "invalid macro syntax at offset 0",
		"( ${v!}": "invalid macro syntax at offset 2",
	} {
		_, err := Tokenize(src)
		require.EqualError(t, err, wantErr, "input %q", src)
	}
}

func TestTokenizeRealisticQuery(t *testing.T) {
	src := "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t"
	requireTokens(t, src, []wantTok{
		{TokIdent, "SELECT"}, {TokMacro, "$timeSeries"}, {TokIdent, "as"}, {TokIdent, "t"},
		{TokComma, ","}, {TokIdent, "count"}, {TokLParen, "("}, {TokRParen, ")"},
		{TokIdent, "FROM"}, {TokMacro, "$table"}, {TokIdent, "WHERE"}, {TokMacro, "$timeFilter"},
		{TokIdent, "GROUP"}, {TokIdent, "BY"}, {TokIdent, "t"},
		{TokIdent, "ORDER"}, {TokIdent, "BY"}, {TokIdent, "t"},
	})
}
