// pkg/eval/engine_test.go
package eval

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// TestEngineFromEnvPolicy pins the Phase-3 default policy (#733, design §5):
// v2 unless CLICKHOUSE_GRAFANA_PARSER explicitly says "legacy". t.Setenv makes
// this independent of the ambient env, so the suite stays green under both
// override runs. The init-time wiring (Engine() == engineFromEnv()) is pinned
// separately by TestDefaultEngineMatchesEnv in engine_default_test.go.
func TestEngineFromEnvPolicy(t *testing.T) {
	t.Setenv("CLICKHOUSE_GRAFANA_PARSER", "")
	require.Equal(t, EngineV2, engineFromEnv(), "unset must select v2 — the Phase-3 default")
	t.Setenv("CLICKHOUSE_GRAFANA_PARSER", "v2")
	require.Equal(t, EngineV2, engineFromEnv())
	t.Setenv("CLICKHOUSE_GRAFANA_PARSER", "legacy")
	require.Equal(t, EngineLegacy, engineFromEnv(), "the one-release rollback must keep working")
	t.Setenv("CLICKHOUSE_GRAFANA_PARSER", "bogus")
	require.Equal(t, EngineV2, engineFromEnv(), "unknown values fall through to the default")
}

// TestSetEngineRoundtrip is default-agnostic: it captures whatever the current
// default is instead of hard-coding an engine, so it survives Phase 3 and the
// legacy-override CI run alike.
func TestSetEngineRoundtrip(t *testing.T) {
	orig := Engine()
	prev := SetEngine(EngineLegacy)
	require.Equal(t, orig, prev, "SetEngine must return the previous engine")
	require.Equal(t, EngineLegacy, Engine())
	require.Equal(t, EngineLegacy, SetEngine(EngineV2))
	require.Equal(t, EngineV2, Engine())
	SetEngine(orig)
	require.Equal(t, orig, Engine())
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

// TestToASTDispatchesToLegacy pins the one-release fallback path end to end.
func TestToASTDispatchesToLegacy(t *testing.T) {
	prev := SetEngine(EngineLegacy)
	defer SetEngine(prev)
	s := NewScanner("SELECT col2/col1*10000 FROM t")
	ast, err := s.ToAST()
	require.NoError(t, err)
	sel := ast.Obj["select"].(*EvalAST)
	require.Equal(t, "col2 / col1 * 10000", sel.Arr[0])
}

// TestToASTDefaultOrdinaryQuery: under the TRUE default (no SetEngine) an
// ordinary query normalizes identically on both engines — the Phase-3 Global
// Constraint that the flip changes nothing for ordinary queries. (Replaces
// the pre-flip TestToASTLegacyDefaultUnchanged; same input, same bytes.)
func TestToASTDefaultOrdinaryQuery(t *testing.T) {
	s := NewScanner("SELECT col2/col1*10000 FROM t")
	ast, err := s.ToAST()
	require.NoError(t, err)
	sel := ast.Obj["select"].(*EvalAST)
	require.Equal(t, "col2 / col1 * 10000", sel.Arr[0])
}
