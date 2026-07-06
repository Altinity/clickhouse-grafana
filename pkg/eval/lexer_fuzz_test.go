package eval

import (
	"path/filepath"
	"strings"
	"testing"
)

// FuzzTokenize asserts the Phase-1 lexer safety properties on arbitrary
// input (design §5): it never panics, and on success it produces a lossless,
// contiguous, offset-exact token cover of the input.
func FuzzTokenize(f *testing.F) {
	seeds := []string{
		"",
		"SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t",
		"SELECT 'it''s', 'a\\'b', `bt`, \"dq\" FROM t -- tail\n#! hash\n/* block */",
		"1.5e3 .5 1. 1e+6 1E6 ${var:sqlstring} $__interval_ms",
		"'unterminated",
		"/* unterminated",
		"${bad-macro}",
		"$",
		"@ ; { } \\",
		"'名前' -- юникод",
		"--",
		"#",
		"a--b",
		"IN ['aa', 'bb']",
		"=> || >= <= == != <> -> +-/%*=<>.!",
	}
	for _, s := range seeds {
		f.Add(s)
	}
	// every corpus query is a seed
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
		toks, err := Tokenize(src) // must not panic - the fuzz runtime catches panics
		if err != nil {
			return // errors are legal on arbitrary input; panics are not
		}
		pos := 0
		for i, tk := range toks {
			if tk.Start != pos {
				t.Fatalf("token %d: Start=%d want %d (gap or overlap)", i, tk.Start, pos)
			}
			if tk.End <= tk.Start || tk.End > len(src) {
				t.Fatalf("token %d: bad End=%d (Start=%d, len(src)=%d)", i, tk.End, tk.Start, len(src))
			}
			if tk.Text != src[tk.Start:tk.End] {
				t.Fatalf("token %d: Text %q != src[%d:%d] %q", i, tk.Text, tk.Start, tk.End, src[tk.Start:tk.End])
			}
			pos = tk.End
		}
		if pos != len(src) {
			t.Fatalf("tokens cover %d of %d bytes", pos, len(src))
		}
	})
}
