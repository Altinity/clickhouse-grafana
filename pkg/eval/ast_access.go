// pkg/eval/ast_access.go
package eval

// SubAST returns the nested AST stored under key. It tolerates both historical
// storage forms (*EvalAST and EvalAST) and returns ok=false for absent, nil,
// or differently-typed values instead of panicking.
func (e *EvalAST) SubAST(key string) (*EvalAST, bool) {
	if e == nil || e.Obj == nil {
		return nil, false
	}
	switch v := e.Obj[key].(type) {
	case *EvalAST:
		if v == nil {
			return nil, false
		}
		return v, true
	case EvalAST:
		vv := v
		return &vv, true
	default:
		return nil, false
	}
}

// StringAt returns Arr[i] as a string with bounds and type checks.
func (e *EvalAST) StringAt(i int) (string, bool) {
	if e == nil || i < 0 || i >= len(e.Arr) {
		return "", false
	}
	s, ok := e.Arr[i].(string)
	return s, ok
}

// InnermostFrom descends `from` links while the linked AST has a nil Arr
// (i.e. `from` holds a subquery rather than a table list), mirroring the
// navigation loops previously inlined in resource handlers. It never panics.
func InnermostFrom(ast *EvalAST) *EvalAST {
	for ast.HasOwnProperty("from") {
		next, ok := ast.SubAST("from")
		if !ok || next.Arr != nil {
			break
		}
		ast = next
	}
	return ast
}
