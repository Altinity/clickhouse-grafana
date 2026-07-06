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
