// pkg/eval/engine_test.go
package eval

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestEngineDefaultsToLegacy(t *testing.T) {
	require.Equal(t, EngineLegacy, Engine())
}

func TestEngineFromEnv(t *testing.T) {
	t.Setenv("CLICKHOUSE_GRAFANA_PARSER", "v2")
	require.Equal(t, EngineV2, engineFromEnv())
	t.Setenv("CLICKHOUSE_GRAFANA_PARSER", "legacy")
	require.Equal(t, EngineLegacy, engineFromEnv())
	t.Setenv("CLICKHOUSE_GRAFANA_PARSER", "")
	require.Equal(t, EngineLegacy, engineFromEnv())
}

func TestSetEngineRoundtrip(t *testing.T) {
	prev := SetEngine(EngineV2)
	require.Equal(t, EngineLegacy, prev)
	require.Equal(t, EngineV2, Engine())
	SetEngine(prev)
	require.Equal(t, EngineLegacy, Engine())
}

func TestToASTDispatchesToV2(t *testing.T) {
	prev := SetEngine(EngineV2)
	defer SetEngine(prev)
	s := NewScanner("SELECT 1 FROM t")
	ast, err := s.ToAST()
	require.NoError(t, err)
	require.True(t, ast.HasOwnProperty("select"))
	require.True(t, ast.HasOwnProperty("from"))
}

func TestToASTLegacyDefaultUnchanged(t *testing.T) {
	s := NewScanner("SELECT col2/col1*10000 FROM t")
	ast, err := s.ToAST()
	require.NoError(t, err)
	sel := ast.Obj["select"].(*EvalAST)
	require.Equal(t, "col2 / col1 * 10000", sel.Arr[0])
}
