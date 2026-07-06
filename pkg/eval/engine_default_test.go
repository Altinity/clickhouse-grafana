// pkg/eval/engine_default_test.go
//
// Phase-3 gate for #733 (design §5, "Flip" row): the DEFAULT engine — whatever
// engineFromEnv selected at process init — must be live end-to-end through the
// public ToAST dispatch, proven on the only inputs where the engines actually
// DIVERGE (the two engine_diff corpus cases). Ordinary queries cannot prove
// which engine ran: v2 is byte-identical to legacy on all non-diff cases.
//
// These tests are ENV-AWARE, not default-aware: they derive the expected
// engine from CLICKHOUSE_GRAFANA_PARSER exactly like the init path does, so
// they are green under the pre-flip legacy default, the post-flip v2 default,
// and both env overrides. They never call SetEngine — that is the point.
package eval

import (
	"encoding/json"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestDefaultEngineMatchesEnv pins the init wiring: the process-wide default
// (Engine() before any SetEngine) must equal what engineFromEnv derives from
// the environment right now. It also catches any test that leaked a SetEngine
// override (every SetEngine caller must restore via defer).
func TestDefaultEngineMatchesEnv(t *testing.T) {
	require.Equal(t, engineFromEnv(), Engine(),
		"default engine differs from env-derived engine — init wiring broken or a test leaked SetEngine")
}

// TestDefaultEngineOnEngineDiffCases runs the engine-discriminating corpus
// cases through ToAST WITHOUT SetEngine and asserts the goldens of the
// env-selected engine: v2 goldens (<name>.v2.*) when the default is v2,
// legacy goldens (<name>.*) under CLICKHOUSE_GRAFANA_PARSER=legacy. This is
// the only test in the suite that exercises the true default dispatch on
// inputs where the engines differ. Under -update it regenerates the selected
// engine's own goldens with that same engine's bytes — it can never cross-
// contaminate (see corpus_test.go's pin note for the full -update story).
func TestDefaultEngineOnEngineDiffCases(t *testing.T) {
	require.Equal(t, engineFromEnv(), Engine(),
		"leaked SetEngine would make golden selection meaningless")
	prefix := "" // legacy goldens: <name>.ast.golden.json, ...
	if Engine() == EngineV2 {
		prefix = "v2." // v2 goldens: <name>.v2.ast.golden.json, ... (Phase-2 artifacts)
	}
	for name := range parserV2DiffReasons {
		t.Run(name, func(t *testing.T) {
			c, err := loadCorpusCase(filepath.Join(corpusDir, name+".sql"))
			require.NoError(t, err)
			require.NotEmpty(t, c.EngineDiff, "case %s lost its engine_diff directive", name)

			ast, astErr := safeToAST(c.Query) // TRUE default dispatch — no SetEngine
			require.NoError(t, astErr)
			astJSON, err := json.MarshalIndent(ast, "", "  ")
			require.NoError(t, err)
			assertGolden(t, name, prefix+"ast.golden.json", string(astJSON))
			assertGolden(t, name, prefix+"printed.golden.sql", PrintAST(ast, " "))

			expanded, expErr := expandForCorpus(c.Query, false)
			require.NoError(t, expErr)
			assertGolden(t, name, prefix+"expanded.golden.sql", expanded)
			expandedWin, expWinErr := expandForCorpus(c.Query, true)
			require.NoError(t, expWinErr)
			assertGolden(t, name, prefix+"expanded_win.golden.sql", expandedWin)
		})
	}
}
