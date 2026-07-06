// pkg/eval/lexer_diff_test.go
//
// Phase-1 differential gate for #733 (design §5, Stage 1): the new lexer's
// token stream must match the LEGACY regexp tokenizer on the whole golden
// corpus, modulo an explicit, issue-tagged allow-list (Task 6).
//
// This file is test-only: the legacy shim reaches into unexported scanner
// internals (same package) and uses regexp for legacy-shape matching. None
// of it ships in the plugin binary.
package eval

import (
	"fmt"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// Legacy tokenizer shim
// ---------------------------------------------------------------------------

// legacyToken is one token string produced by the legacy regexp scanner
// (EvalQueryScanner.Next over tokenReComplied), plus a teleport diagnostic.
//
// TELEPORT: tokenReComplied is compiled with regexp2.Multiline, so its
// leading `^` anchor matches at every line start, not only at position 0.
// When no alternative matches at position 0 (e.g. at a '#'),
// FindStringMatch returns a match from a LATER line start; Next() then
// slices len(Token) bytes off the FRONT of the buffer. The reported token
// text and the consumed bytes diverge, and the rest of the stream is garbage
// (probe-verified on bug_610_hash_comment: token "FROM" consumed "# tr",
// then "ailing", "hash", "comment", …). No error is returned by Next().
type legacyToken struct {
	Text     string
	Teleport bool
}

// legacyTokenStream tokenizes src exactly the way ToAST's scanner loop does
// (same regex, same Next()), keeping whitespace tokens and flagging teleports.
func legacyTokenStream(src string) ([]legacyToken, error) {
	s := NewScanner(src)
	s._s = s._sOriginal
	s.re = tokenReComplied
	s.SkipSpace = false
	var out []legacyToken
	for {
		before := s._s
		next, err := s.Next()
		if err != nil {
			return out, err
		}
		if !next {
			break
		}
		consumed := before[:len(before)-len(s._s)]
		out = append(out, legacyToken{Text: s.Token, Teleport: consumed != s.Token})
	}
	return out, nil
}

func legacyTexts(toks []legacyToken) []string {
	out := make([]string, 0, len(toks))
	for _, lt := range toks {
		out = append(out, lt.Text)
	}
	return out
}

// ---------------------------------------------------------------------------
// Stream normalization: legacy token strings -> new-lexer word granularity
// ---------------------------------------------------------------------------

// multiWordKeywordRe matches legacy multi-word keyword tokens: statements
// with a literal single space ("group by", "order by", "union all"), join
// kinds joined by \s+ ("GLOBAL ANY LEFT OUTER JOIN", "array join"), and IN
// forms ("not in", "global not in"). Probe-verified: these are the ONLY
// whitespace-bearing legacy tokens besides WS runs, comments, strings, and
// the IN-array form below (corpus sweep 2026-07-06 saw exactly: ARRAY JOIN,
// GROUP BY, ORDER BY, UNION ALL, INNER JOIN, GLOBAL ANY LEFT JOIN).
var multiWordKeywordRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z_0-9]*(\s+[A-Za-z_][A-Za-z_0-9]*)+$`)

// legacyInArrayRe detects the inRe array-swallow form: `IN ['a', 'b']` lexes
// as ONE legacy token. No corpus case exercises it (verified 2026-07-06);
// the normalizer refuses it loudly so a future case gets handled explicitly
// instead of producing a confusing token-by-token mismatch.
var legacyInArrayRe = regexp.MustCompile(`(?is)^(global\s+)?(not\s+)?in\s+\[`)

// normalizeLegacyTokens maps legacy token strings onto the new lexer's
// word-level granularity:
//   - whitespace tokens are dropped (the new-side normalizer drops TokWS);
//   - multi-word keyword tokens are split into single words — the new lexer
//     emits one TokIdent per word; keyword grouping is Phase-2 parser
//     business (design §3.3);
//   - everything else (comments, strings, quoted idents, numbers, idents,
//     operators, macros) passes through VERBATIM and is compared by text.
func normalizeLegacyTokens(toks []legacyToken) ([]string, error) {
	var out []string
	for _, lt := range toks {
		switch {
		case isWS(lt.Text):
			// dropped
		case legacyInArrayRe.MatchString(lt.Text):
			return nil, fmt.Errorf("legacy IN-array token %q is not supported by the diff normalizer - extend it explicitly", lt.Text)
		case multiWordKeywordRe.MatchString(lt.Text):
			out = append(out, strings.Fields(lt.Text)...)
		default:
			out = append(out, lt.Text)
		}
	}
	return out, nil
}

// normalizeNewTokens drops TokWS and keeps the exact Text of everything else.
// Comparison is text-based: token KINDS are new vocabulary with no legacy
// counterpart (legacy "keywords", quoted idents and strings all surface here
// as plain text and compare equal when the bytes agree).
func normalizeNewTokens(toks []Token) []string {
	out := make([]string, 0, len(toks))
	for _, tk := range toks {
		if tk.Kind == TokWS {
			continue
		}
		out = append(out, tk.Text)
	}
	return out
}

// ---------------------------------------------------------------------------
// Shim + normalizer unit tests (pin probe-verified LEGACY behavior)
// ---------------------------------------------------------------------------

func TestLegacyShimPinsProbedBehavior(t *testing.T) {
	// single-space statement keywords are ONE legacy token
	toks, err := legacyTokenStream("SELECT x FROM t GROUP BY x ORDER BY x")
	require.NoError(t, err)
	require.Contains(t, legacyTexts(toks), "GROUP BY")
	require.Contains(t, legacyTexts(toks), "ORDER BY")

	// …but two spaces defeat statementRe (literal single space in the regex)
	toks, err = legacyTokenStream("GROUP  BY")
	require.NoError(t, err)
	require.Equal(t, []string{"GROUP", "  ", "BY"}, legacyTexts(toks))

	// join kinds glue with \s+ — across newlines too
	toks, err = legacyTokenStream("a GLOBAL ANY LEFT\n OUTER JOIN b")
	require.NoError(t, err)
	require.Contains(t, legacyTexts(toks), "GLOBAL ANY LEFT\n OUTER JOIN")

	// line-comment token does NOT include the trailing newline
	toks, err = legacyTokenStream("x -- c1\ny")
	require.NoError(t, err)
	require.Equal(t, []string{"x", " ", "-- c1", "\n", "y"}, legacyTexts(toks))

	// legacy does NOT honor '' doubling: two string tokens
	toks, err = legacyTokenStream("'it''s'")
	require.NoError(t, err)
	require.Equal(t, []string{"'it'", "'s'"}, legacyTexts(toks))

	// teleport detection: '#' has no anchored alternative in tokenRe
	toks, err = legacyTokenStream("SELECT a # x\nFROM t")
	require.NoError(t, err)
	var teleported bool
	for _, lt := range toks {
		teleported = teleported || lt.Teleport
	}
	require.True(t, teleported, "expected a teleport on the '#' input")
}

func TestNormalizeLegacyTokens(t *testing.T) {
	toks, err := legacyTokenStream("SELECT x FROM t GROUP BY x")
	require.NoError(t, err)
	got, err := normalizeLegacyTokens(toks)
	require.NoError(t, err)
	require.Equal(t, []string{"SELECT", "x", "FROM", "t", "GROUP", "BY", "x"}, got)

	// the IN-array swallow form is refused loudly, not mis-compared
	toks, err = legacyTokenStream("a IN ['aa', 'bb']")
	require.NoError(t, err)
	_, err = normalizeLegacyTokens(toks)
	require.ErrorContains(t, err, "IN-array")
}

// TestNewAndLegacyAgreeOnProbeSamples is a mini-differential over the exact
// snippets probed while designing this gate — it fails fast and readably
// before the full corpus run in TestLexerDifferential.
func TestNewAndLegacyAgreeOnProbeSamples(t *testing.T) {
	for _, src := range []string{
		"SELECT x FROM t GROUP BY x ORDER BY x LIMIT 10",
		"SELECT * FROM a GLOBAL ANY LEFT OUTER JOIN b USING (x)",
		"SELECT type in (2,4)-- QueryFinish, ExceptionWhileProcessing\nand x FROM t",
		"SELECT 1.5, .5, 1., 1e6, 1E6, 1e+6, 1.5e3, -1 FROM t",
		"SELECT $timeSeries, ${var:sqlstring}, $__interval_ms FROM $table",
		"SELECT a=>b, x||y, a!=b, a<>b, c->d, a>=1 FROM t",
		"SELECT x /* multi\nline */ FROM t WHERE a IN [$query_hash]",
		"SELECT 'it', `bt id`, \"dq id\" FROM default.test_grafana WHERE name IN ('ccc--bert', 'ddd')",
	} {
		legToks, err := legacyTokenStream(src)
		require.NoError(t, err, "legacy failed on %q", src)
		want, err := normalizeLegacyTokens(legToks)
		require.NoError(t, err, src)
		newToks, err := Tokenize(src)
		require.NoError(t, err, "new lexer failed on %q", src)
		require.Equal(t, want, normalizeNewTokens(newToks), "stream diff for %q", src)
	}
}
