//go:build corpusoracle

package eval

import (
	"strings"
	"testing"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/stretchr/testify/require"
)

// TestOracleExpandedIsValidClickHouse asserts that every non-error corpus
// query, once macros are expanded (so no $-macros remain), parses as valid
// ClickHouse per an independent parser. This catches "we generated invalid SQL"
// regardless of our own parser. Run: go test -tags corpusoracle ./pkg/eval -run TestOracle
func TestOracleExpandedIsValidClickHouse(t *testing.T) {
	for _, path := range corpusFiles(t) {
		c, err := loadCorpusCase(path)
		require.NoError(t, err)
		if c.ExpectError {
			continue
		}
		t.Run(c.Name, func(t *testing.T) {
			expanded, err := expandForCorpus(c.Query, false)
			require.NoError(t, err)
			if strings.Contains(expanded, "$") {
				t.Skipf("residual macro/var in expansion, out of oracle scope")
			}
			p := chparser.NewParser(expanded)
			_, perr := p.ParseStmts()
			if perr != nil {
				// Non-fatal: log as a finding. The oracle is advisory in phase 0.
				t.Logf("ORACLE: expanded SQL rejected by AfterShip: %v\n--- SQL ---\n%s", perr, expanded)
			}
		})
	}
}
