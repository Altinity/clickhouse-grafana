// pkg/eval/ast_access_test.go
package eval

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSubAST(t *testing.T) {
	inner := &EvalAST{Arr: []interface{}{"default.tbl"}}
	ast := &EvalAST{Obj: map[string]interface{}{
		"from":    inner,
		"byValue": EvalAST{Arr: []interface{}{"x"}}, // value, not pointer (#799 class)
		"nilKey":  nil,
		"wrong":   42,
	}}

	got, ok := ast.SubAST("from")
	require.True(t, ok)
	require.Same(t, inner, got)

	gotV, ok := ast.SubAST("byValue")
	require.True(t, ok)
	require.Equal(t, []interface{}{"x"}, gotV.Arr)

	for _, key := range []string{"nilKey", "wrong", "absent"} {
		_, ok := ast.SubAST(key)
		require.False(t, ok, key)
	}
	_, ok = (&EvalAST{}).SubAST("from") // nil Obj map
	require.False(t, ok)
}

func TestStringAt(t *testing.T) {
	ast := &EvalAST{Arr: []interface{}{"a", 7}}
	s, ok := ast.StringAt(0)
	require.True(t, ok)
	require.Equal(t, "a", s)
	_, ok = ast.StringAt(1) // not a string
	require.False(t, ok)
	_, ok = ast.StringAt(2) // out of bounds
	require.False(t, ok)
	_, ok = (&EvalAST{}).StringAt(0) // nil Arr
	require.False(t, ok)
}

func TestInnermostFrom(t *testing.T) {
	deepest := &EvalAST{
		Obj: map[string]interface{}{"from": &EvalAST{Arr: []interface{}{"db.tbl"}}},
	}
	mid := &EvalAST{Obj: map[string]interface{}{"from": deepest}}
	top := &EvalAST{Obj: map[string]interface{}{"from": mid}}
	// mid.from(=deepest).Arr==nil → descend; deepest.from.Arr!=nil → stop at deepest
	require.Same(t, deepest, InnermostFrom(top))

	noFrom := &EvalAST{Obj: map[string]interface{}{}}
	require.Same(t, noFrom, InnermostFrom(noFrom)) // no from → returns input, no panic

	malformed := &EvalAST{Obj: map[string]interface{}{"from": "just-a-string"}}
	require.Same(t, malformed, InnermostFrom(malformed)) // wrong type → stop, no panic
}
