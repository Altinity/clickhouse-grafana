// pkg/eval/differential_test.go
//
// Phase-2 gate for #733 (design §5, Stage 2 row): under EngineV2, ToAST +
// PrintAST + ApplyMacrosAndTimeRangeToQuery must be BYTE-IDENTICAL to the
// legacy goldens on every corpus case, except the engine_diff-tagged cases,
// each pinned by its own v2 goldens.
//
// THE RULE (plan "engine_diff policy"): a mismatch on an untagged case is a
// v2 BUG. Fix parser_v2/compat. Do not add engine_diff tags, do not touch
// legacy goldens, do not loosen this test.
package eval

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

// parserV2DiffReasons documents every INTENDED v2 divergence. Keep in exact
// sync with the engine_diff directives (both directions are asserted).
var parserV2DiffReasons = map[string]string{
	"bug_610_hash_comment": "issue #610: legacy teleports on '#' (regexp2 Multiline '^') and " +
		"emits garbage ('FROM ailing hash comment …'); v2 lexes '#' as a comment and parses correctly",
	"dash_24a54b5141": "issue #374/#648 class: legacy commentRe requires an even quote count, the " +
		"apostrophe in \"-- Test user's …\" opens a string that swallows half the query; v2 parses the comment correctly",
}

// requireMatchesLegacyGolden compares v2 output against an EXISTING legacy
// golden, read-only: it must never regenerate legacy goldens, even under
// -update (that is what makes the gate a differential, not a freeze).
func requireMatchesLegacyGolden(t *testing.T, name, suffix, got string) {
	t.Helper()
	path := filepath.Join(corpusDir, name+"."+suffix)
	want, err := os.ReadFile(path)
	require.NoError(t, err, "missing legacy golden %s", path)
	require.Equal(t, string(want), got,
		"v2 output differs from the legacy golden %s — a v2 BUG to fix, not an engine_diff to add (plan: engine_diff policy)", path)
}

func TestParserV2Differential(t *testing.T) {
	prev := SetEngine(EngineV2)
	defer SetEngine(prev)

	taggedSeen := map[string]bool{}
	for _, path := range corpusFiles(t) {
		c, err := loadCorpusCase(path)
		require.NoError(t, err)
		if c.EngineDiff != "" {
			taggedSeen[c.Name] = true
		}
		t.Run(c.Name, func(t *testing.T) {
			require.False(t, c.ExpectError, "expect=error cases are out of the Phase-2 differential scope")

			ast, astErr := safeToAST(c.Query) // engine dispatch → v2
			require.NoError(t, astErr, "v2 must parse every corpus case (legacy does)")
			astJSON, err := json.MarshalIndent(ast, "", "  ")
			require.NoError(t, err)
			printed := PrintAST(ast, " ")
			expanded, expErr := expandForCorpus(c.Query, false)
			require.NoError(t, expErr)
			expandedWin, expWinErr := expandForCorpus(c.Query, true)
			require.NoError(t, expWinErr)

			if c.EngineDiff != "" {
				reason, ok := parserV2DiffReasons[c.Name]
				require.True(t, ok, "engine_diff=%s case %q has no parserV2DiffReasons entry", c.EngineDiff, c.Name)
				t.Logf("engine_diff=%s: %s", c.EngineDiff, reason)
				assertGolden(t, c.Name, "v2.ast.golden.json", string(astJSON))
				assertGolden(t, c.Name, "v2.printed.golden.sql", printed)
				assertGolden(t, c.Name, "v2.expanded.golden.sql", expanded)
				assertGolden(t, c.Name, "v2.expanded_win.golden.sql", expandedWin)
				return
			}

			requireMatchesLegacyGolden(t, c.Name, "ast.golden.json", string(astJSON))
			requireMatchesLegacyGolden(t, c.Name, "printed.golden.sql", printed)
			requireMatchesLegacyGolden(t, c.Name, "expanded.golden.sql", expanded)
			requireMatchesLegacyGolden(t, c.Name, "expanded_win.golden.sql", expandedWin)
		})
	}
	for name := range parserV2DiffReasons {
		require.True(t, taggedSeen[name], "parserV2DiffReasons entry %q has no engine_diff-tagged corpus case — stale entry", name)
	}
}
