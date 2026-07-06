package eval

import (
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

const dashboardsGlob = "../../docker/grafana/dashboards/*.json"

// collectQueryStrings recursively walks a decoded JSON value and returns every
// string found under a "query" key.
func collectQueryStrings(v interface{}, out *[]string) {
	switch node := v.(type) {
	case map[string]interface{}:
		for k, child := range node {
			if k == "query" {
				if s, ok := child.(string); ok {
					*out = append(*out, s)
				}
			}
			collectQueryStrings(child, out)
		}
	case []interface{}:
		for _, child := range node {
			collectQueryStrings(child, out)
		}
	}
}

func looksLikeSQL(q string) bool {
	u := strings.ToUpper(q)
	if !strings.Contains(u, "SELECT") && !strings.HasPrefix(strings.TrimSpace(q), "$") {
		return false
	}
	return len(strings.TrimSpace(q)) > 10
}

// TestExtractDashboardCorpus is a generator, not an assertion. It only does work
// under -update; otherwise it is a no-op so CI never regenerates corpus files.
func TestExtractDashboardCorpus(t *testing.T) {
	if !*updateCorpus {
		t.Skip("run with -args -update to regenerate dash_*.sql corpus files")
	}
	files, err := filepath.Glob(dashboardsGlob)
	require.NoError(t, err)
	require.NotEmpty(t, files)

	seen := map[string]bool{}
	var queries []string
	for _, f := range files {
		data, err := os.ReadFile(f)
		require.NoError(t, err)
		var decoded interface{}
		if json.Unmarshal(data, &decoded) != nil {
			continue // skip non-JSON / malformed
		}
		var found []string
		collectQueryStrings(decoded, &found)
		for _, q := range found {
			if !looksLikeSQL(q) {
				continue
			}
			key := fmt.Sprintf("%x", sha1.Sum([]byte(q)))[:10]
			if seen[key] {
				continue
			}
			seen[key] = true
			queries = append(queries, q)
			path := filepath.Join(corpusDir, "dash_"+key+".sql")
			require.NoError(t, os.WriteFile(path, []byte(q), 0o644))
		}
	}
	sort.Strings(queries)
	t.Logf("extracted %d unique dashboard queries", len(queries))
}
