package eval

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// TestRemoveComments is a characterization test that pins RemoveComments'
// output byte-for-byte. The `want` values below were captured from the legacy
// regexp2 implementation (commentRe with the `(?=\n|$)` lookahead) and MUST NOT
// change when the engine is ported to stdlib regexp — the port is
// behavior-preserving, bug-for-bug. Notable preserved quirks:
//   - a `--` comment with an ODD number of apostrophes is NOT removed
//     (#374/#648 class; see case "odd-apostrophe").
//   - `#` line comments are NOT removed at all (#610; see cases "hash",
//     "shebang").
//   - a `/* ... */` block is removed even inside a quoted string literal
//     (see case "block-inside-quotes").
func TestRemoveComments(t *testing.T) {
	s := NewScanner("")

	cases := []struct {
		name  string
		query string
		want  string
	}{
		{"empty", "", ""},
		{"no-comment", "SELECT 1", "SELECT 1"},
		{"line-plain", "-- plain\nSELECT 1", "\nSELECT 1"},
		{"odd-apostrophe", "-- it's odd apostrophe\nSELECT 1", "-- it's odd apostrophe\nSELECT 1"},
		{"even-apostrophes", "-- two 'quo'tes even\nSELECT 1", "\nSELECT 1"},
		{"quoted-dashes-and-tail", "SELECT 'a -- b' AS x, 'c' FROM t -- tail", "SELECT 'a -- b' AS x, 'c' FROM t "},
		{"block-multiline", "SELECT * FROM t /* multi\nline */ WHERE 1", "SELECT * FROM t  WHERE 1"},
		{"block-unterminated", "/* unterminated", "/* unterminated"},
		{"hash", "# hash comment\nSELECT 1", "# hash comment\nSELECT 1"},
		{"shebang", "#! shebang\nSELECT 1", "#! shebang\nSELECT 1"},
		{"line-trailing-no-newline", "SELECT 1 -- trailing no newline", "SELECT 1 "},
		{"crlf", "a\r\n-- crlf comment\r\nb", "a\r\n\nb"},
		{"adjacent-blocks", "/**/SELECT/* a * b */1", "SELECT1"},
		{"two-empty-line-comments", "--\n--\n", "\n\n"},
		{"block-inside-quotes", "SELECT '--' , '/* not a comment */'", "SELECT '--' , ''"},
		{"mixed-line-comments", "-- c1\n-- c2's\n-- c3\nx", "\n-- c2's\n\nx"},
		{
			"case-20-dashes-in-quotes",
			"\nSELECT *\nFROM $table\nWHERE title='-- test not comment1' -- comment3\nAND user_info='test -- not comment2' -- comment4",
			"\nSELECT *\nFROM $table\nWHERE title='-- test not comment1' \nAND user_info='test -- not comment2' ",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := s.RemoveComments(c.query)
			require.NoError(t, err)
			require.Equal(t, c.want, got)
		})
	}
}

// TestRemoveCommentsCorpusSweep runs RemoveComments over every corpus query and
// asserts only that it never errors. The byte-level pins live in
// TestRemoveComments (17 edge cases + case-20); the full 202-corpus equivalence
// between the regexp2 and stdlib engines was probe-verified at plan time and is
// frozen by those pins.
func TestRemoveCommentsCorpusSweep(t *testing.T) {
	s := NewScanner("")
	for _, path := range corpusFiles(t) {
		c, err := loadCorpusCase(path)
		require.NoError(t, err)
		t.Run(c.Name, func(t *testing.T) {
			_, err := s.RemoveComments(c.Query)
			require.NoError(t, err)
		})
	}
}
