// pkg/eval/parser_v2_fuzz_test.go
package eval

import (
	"path/filepath"
	"strings"
	"testing"
)

// FuzzToASTV2: the v2 engine must never panic (the #799 class must be
// unconstructible) and must never hang (depth cap, safeTail clamp).
func FuzzToASTV2(f *testing.F) {
	seeds := []string{
		"",
		"SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t",
		"SELECT 1 FROM (",                     // betweenBraces on empty tail
		"SELECT 1 FROM ((((((((((x))))))))))", // nesting
		"SELECT 1 FROM t WHERE h IN [",
		"SELECT 1 FROM t WHERE x IN ['aa', 'bb'] AND y = 1",
		"SELECT 1 FROM a UNION ALL",
		"$rate",
		"$rate(",
		"SELECT 1 FROM a INNER JOIN",
		"SELECT 1 FROM (SELECT ')' AS p FROM u) q",
		"'unterminated",
		"# hash\nSELECT 1",
		"union all union all union all",
	}
	for _, s := range seeds {
		f.Add(s)
	}
	files, err := filepath.Glob(filepath.Join(corpusDir, "*.sql"))
	if err == nil {
		for _, path := range files {
			if strings.Contains(filepath.Base(path), ".golden.") {
				continue
			}
			if c, cerr := loadCorpusCase(path); cerr == nil {
				f.Add(c.Query)
			}
		}
	}
	f.Fuzz(func(t *testing.T, src string) {
		_, _ = toASTV2(src) // errors are legal on arbitrary input; panics are not
	})
}
