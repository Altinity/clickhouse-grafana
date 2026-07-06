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

// ---------------------------------------------------------------------------
// The Phase-1 gate: corpus-wide differential test
// ---------------------------------------------------------------------------

// lexerDiffAllowed lists corpus cases where the new lexer INTENTIONALLY
// diverges from the legacy tokenizer. Design rule (§4, §5): every entry MUST
// carry an issue number; for each, the new token stream is pinned by
// <name>.v2tokens.golden.txt so the divergence is asserted, not ignored.
//
// Do not add entries casually: a new mismatch means either a new-lexer bug
// (fix the lexer) or a newly discovered legacy quirk (document it here with
// probe evidence + an issue number, and pin the new stream with a golden).
var lexerDiffAllowed = map[string]string{
	"bug_610_hash_comment": "issue #610: legacy tokenRe has no alternative for '#'; " +
		"regexp2 Multiline '^' teleports to the next line start (token \"FROM\" consumes \"# tr\") " +
		"producing garbage idents (\"ailing\", \"hash\", ...); the new lexer emits a TokComment",
	"dash_24a54b5141": "issue #374/#648 class: legacy commentRe requires an even number of " +
		"single quotes inside a '--' comment; \"-- Test user's ...\" fails to lex as a comment, " +
		"'-','-' lex as operators and the apostrophe opens a string that swallows half the query; " +
		"the new lexer lexes the comment to end of line",
}

// renderTokens renders non-WS tokens one per line as "KIND<TAB>quoted-text".
// %q keeps multi-line token texts on one golden line.
func renderTokens(toks []Token) string {
	var b strings.Builder
	for _, tk := range toks {
		if tk.Kind == TokWS {
			continue
		}
		fmt.Fprintf(&b, "%s\t%q\n", tk.Kind, tk.Text)
	}
	return b.String()
}

// requireKindShape sanity-checks kind assignment from token text alone —
// a one-way invariant the text-based diff cannot see.
func requireKindShape(t *testing.T, toks []Token) {
	t.Helper()
	for i, tk := range toks {
		switch {
		case strings.HasPrefix(tk.Text, "--"), strings.HasPrefix(tk.Text, "/*"), strings.HasPrefix(tk.Text, "#"):
			require.Equal(t, TokComment, tk.Kind, "token %d %q", i, tk.Text)
		case strings.HasPrefix(tk.Text, "'"):
			require.Equal(t, TokString, tk.Kind, "token %d %q", i, tk.Text)
		case strings.HasPrefix(tk.Text, "`"), strings.HasPrefix(tk.Text, `"`):
			require.Equal(t, TokQuotedIdent, tk.Kind, "token %d %q", i, tk.Text)
		case strings.HasPrefix(tk.Text, "$"):
			require.Equal(t, TokMacro, tk.Kind, "token %d %q", i, tk.Text)
		}
	}
}

// requireTokenTextsEqual reports the FIRST diverging index with context —
// far more debuggable on 400-token streams than require.Equal's dump.
func requireTokenTextsEqual(t *testing.T, want, got []string) {
	t.Helper()
	n := len(want)
	if len(got) < n {
		n = len(got)
	}
	for i := 0; i < n; i++ {
		if want[i] != got[i] {
			lo := i - 3
			if lo < 0 {
				lo = 0
			}
			hiW, hiG := i+4, i+4
			if hiW > len(want) {
				hiW = len(want)
			}
			if hiG > len(got) {
				hiG = len(got)
			}
			t.Fatalf("token %d differs:\n  legacy: %q\n  new:    %q\ncontext legacy[%d:%d]: %q\ncontext new[%d:%d]:    %q",
				i, want[i], got[i], lo, hiW, want[lo:hiW], lo, hiG, got[lo:hiG])
		}
	}
	if len(want) != len(got) {
		t.Fatalf("stream lengths differ: legacy=%d new=%d (first %d tokens match)\nlegacy tail: %q\nnew tail: %q",
			len(want), len(got), n, want[n:], got[n:])
	}
}

// TestLexerDifferential is the Phase-1 gate (design §5, Stage 1 row): for
// every corpus case the new lexer's token stream equals the legacy stream
// after normalization, except the issue-tagged allow-list above.
func TestLexerDifferential(t *testing.T) {
	seen := map[string]bool{}
	for _, path := range corpusFiles(t) {
		c, err := loadCorpusCase(path)
		require.NoError(t, err)
		seen[c.Name] = true
		t.Run(c.Name, func(t *testing.T) {
			newToks, err := Tokenize(c.Query)
			require.NoError(t, err, "the new lexer must tokenize every corpus case")
			requireLosslessTokens(t, c.Query, newToks)
			requireKindShape(t, newToks)
			got := normalizeNewTokens(newToks)

			if reason, ok := lexerDiffAllowed[c.Name]; ok {
				t.Logf("allow-listed divergence: %s", reason)
				assertGolden(t, c.Name, "v2tokens.golden.txt", renderTokens(newToks))
				return
			}

			legToks, err := legacyTokenStream(c.Query)
			require.NoError(t, err, "legacy tokenizer errored on a corpus case that Phase 0 froze as parseable - investigate before proceeding")
			for i, lt := range legToks {
				require.False(t, lt.Teleport,
					"legacy teleported at token %d (%q) - an UNDOCUMENTED divergence; diagnose it and either fix the new lexer or add an issue-tagged lexerDiffAllowed entry", i, lt.Text)
			}
			want, err := normalizeLegacyTokens(legToks)
			require.NoError(t, err)
			requireTokenTextsEqual(t, want, got)
		})
	}
	for name := range lexerDiffAllowed {
		require.True(t, seen[name], "allow-list entry %q matches no corpus case - stale entry", name)
	}
}
