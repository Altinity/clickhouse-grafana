// pkg/eval/token_test.go
package eval

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestTokenKindString(t *testing.T) {
	kinds := []TokenKind{
		TokWS, TokComment, TokString, TokQuotedIdent, TokIdent, TokNumber,
		TokOp, TokLParen, TokRParen, TokLBracket, TokRBracket, TokComma,
		TokQuestion, TokColon, TokSemicolon, TokMacro,
	}
	seen := map[string]bool{}
	for _, k := range kinds {
		name := k.String()
		require.NotEmpty(t, name)
		require.NotContains(t, name, "TokenKind(", "kind %d has no name", k)
		require.False(t, seen[name], "duplicate kind name %q", name)
		seen[name] = true
	}
	require.Equal(t, "TokenKind(99)", TokenKind(99).String())
}
