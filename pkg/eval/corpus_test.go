package eval

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

const corpusDir = "testdata/corpus"

var updateCorpus = flag.Bool("update", false, "regenerate golden corpus files")

type corpusCase struct {
	Name        string
	Query       string
	ExpectError bool
	Tags        []string
	EngineDiff  string // issue number from an `engine_diff=NNN` directive token
}

// loadCorpusCase reads a .sql corpus file. An optional first line of the form
//
//	-- corpus: expect=error tags=macro,subquery
//
// is parsed as a directive and stripped from the query text.
func loadCorpusCase(path string) (corpusCase, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return corpusCase{}, err
	}
	name := strings.TrimSuffix(filepath.Base(path), ".sql")
	text := string(raw)
	c := corpusCase{Name: name}

	lines := strings.SplitN(text, "\n", 2)
	if len(lines) > 0 && strings.HasPrefix(strings.TrimSpace(lines[0]), "-- corpus:") {
		directive := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(lines[0]), "-- corpus:"))
		for _, tok := range strings.Fields(directive) {
			switch {
			case tok == "expect=error":
				c.ExpectError = true
			case strings.HasPrefix(tok, "tags="):
				c.Tags = strings.Split(strings.TrimPrefix(tok, "tags="), ",")
			case strings.HasPrefix(tok, "engine_diff="):
				c.EngineDiff = strings.TrimPrefix(tok, "engine_diff=")
			}
		}
		if len(lines) == 2 {
			text = lines[1]
		} else {
			text = ""
		}
	}
	c.Query = strings.Trim(text, " \t\r\n")
	return c, nil
}

func corpusFiles(t *testing.T) []string {
	t.Helper()
	all, err := filepath.Glob(filepath.Join(corpusDir, "*.sql"))
	require.NoError(t, err)
	// CRITICAL: printed/expanded goldens also end in ".sql" (e.g.
	// "<name>.printed.golden.sql"), so they match this glob too. Skip any file
	// whose name contains ".golden." — otherwise the harness treats goldens as
	// input queries and generates goldens-of-goldens.
	var files []string
	for _, f := range all {
		if strings.Contains(filepath.Base(f), ".golden.") {
			continue
		}
		files = append(files, f)
	}
	require.NotEmpty(t, files, "no corpus files found")
	return files
}

// assertGolden compares got against <name>.<suffix>; with -update it rewrites it.
func assertGolden(t *testing.T, name, suffix, got string) {
	t.Helper()
	path := filepath.Join(corpusDir, name+"."+suffix)
	if *updateCorpus {
		require.NoError(t, os.WriteFile(path, []byte(got), 0o644))
		return
	}
	want, err := os.ReadFile(path)
	require.NoError(t, err, "missing golden %s (run: go test ./pkg/eval -run TestGoldenCorpus -args -update)", path)
	require.Equal(t, string(want), got, "golden mismatch for %s", path)
}

// corpusFixedConfig — the frozen expansion context. NEVER change these values;
// the goldens are computed against them.
var (
	corpusFrom = time.Date(2025, 1, 2, 3, 4, 5, 0, time.UTC)
	corpusTo   = time.Date(2025, 1, 2, 4, 5, 6, 0, time.UTC)
)

func expandForCorpus(query string, window bool) (string, error) {
	q := EvalQuery{
		Query:                  query,
		Database:               "default",
		Table:                  "test_grafana",
		DateTimeType:           "DATETIME",
		DateTimeCol:            "event_time",
		DateCol:                "event_date",
		Interval:               "30s",
		IntervalFactor:         1,
		From:                   corpusFrom,
		To:                     corpusTo,
		UseWindowFuncForMacros: window,
	}
	return q.ApplyMacrosAndTimeRangeToQuery()
}

// safeToAST runs ToAST but converts a panic into an error, so that one
// pathological corpus query fails ONLY its own subtest instead of crashing the
// whole `go test` binary (a panic in a t.Run subtest aborts the entire run).
// The returned err message is prefixed "PANIC:" so panicking cases are easy to
// grep and quarantine.
func safeToAST(query string) (ast *EvalAST, err error) {
	defer func() {
		if r := recover(); r != nil {
			ast = nil
			err = fmt.Errorf("PANIC: %v", r)
		}
	}()
	scanner := NewScanner(query)
	return scanner.ToAST()
}

func TestGoldenCorpus(t *testing.T) {
	// PINNED to legacy on purpose (since Phase 2; keep through Phase 4):
	// this test IS the legacy freeze — its goldens are legacy bytes, and
	// -update must regenerate them with legacy output regardless of the
	// process default (v2 since Phase 3). v2 corpus coverage lives in
	// TestParserV2Differential (pinned v2); the true-default dispatch is
	// covered by engine_default_test.go on the engine-discriminating cases.
	// Net effect: one `go test ./pkg/eval` run covers BOTH engines under
	// ANY CLICKHOUSE_GRAFANA_PARSER setting.
	prev := SetEngine(EngineLegacy)
	defer SetEngine(prev)
	for _, path := range corpusFiles(t) {
		c, err := loadCorpusCase(path)
		require.NoError(t, err)
		t.Run(c.Name, func(t *testing.T) {
			ast, astErr := safeToAST(c.Query)

			if c.ExpectError {
				require.Error(t, astErr, "case tagged expect=error but parsed cleanly")
				assertGolden(t, c.Name, "error.golden.txt", astErr.Error())
				return
			}
			// A panic on an untagged case is a real finding, not a golden to
			// freeze: fail loudly with the file name so it can be quarantined.
			if astErr != nil && strings.HasPrefix(astErr.Error(), "PANIC:") {
				t.Fatalf("%s.sql panics in ToAST (%v) — quarantine it: add `-- corpus: expect=error tags=panic` as its first line, or move it to testdata/corpus_broken/", c.Name, astErr)
			}
			require.NoError(t, astErr)

			astJSON, err := json.MarshalIndent(ast, "", "  ")
			require.NoError(t, err)
			assertGolden(t, c.Name, "ast.golden.json", string(astJSON))
			assertGolden(t, c.Name, "printed.golden.sql", PrintAST(ast, " "))

			for _, v := range []struct {
				suffix string
				window bool
			}{{"expanded.golden.sql", false}, {"expanded_win.golden.sql", true}} {
				expanded, expErr := expandForCorpus(c.Query, v.window)
				require.NoError(t, expErr, "expansion failed for %s (window=%v)", c.Name, v.window)
				assertGolden(t, c.Name, v.suffix, expanded)
			}
		})
	}
}
