// pkg/eval/lexer.go
package eval

import "fmt"

// lexer is the #733 Phase-1 hand-written state-machine lexer (design §3.4).
// It is a single pass over bytes; multi-byte UTF-8 sequences can only occur
// inside token bodies (strings, quoted identifiers, comments) where scanning
// branches only on ASCII bytes (which never appear as UTF-8 continuation
// bytes), so no rune decoding is required.
//
// NOT wired into ToAST — Phase 2 adds the engine dispatch (design §3.2).
// Until then this file is standalone, exercised only by tests.
type lexer struct {
	src  string
	pos  int
	toks []Token
}

// Tokenize splits src into position-preserving tokens. Invariants:
//   - concatenating all token Texts reproduces src byte-for-byte
//     (whitespace is a token: TokWS);
//   - Token.Text == src[Token.Start:Token.End] for every token;
//   - it never panics; malformed input returns an error with a byte offset.
func Tokenize(src string) ([]Token, error) {
	lx := &lexer{src: src}
	for lx.pos < len(lx.src) {
		start := lx.pos
		if err := lx.next(); err != nil {
			return nil, err
		}
		if lx.pos <= start {
			// Defensive: every scan function must consume at least one byte;
			// otherwise the loop would never terminate.
			return nil, fmt.Errorf("lexer stalled at offset %d", start)
		}
	}
	return lx.toks, nil
}

// next dispatches on the byte at lx.pos. Every branch consumes at least one
// byte. Branch order is load-bearing: '--' and '/*' must be checked before
// single-char operators.
func (lx *lexer) next() error {
	c := lx.src[lx.pos]
	switch {
	case isSpaceByte(c):
		lx.scanWS()
		return nil
	case c == '-' && lx.peekAt(1) == '-':
		lx.scanLineComment()
		return nil
	case c == '#':
		// '#' and '#!' line comments (issue #610). Only fires at a
		// token-start position — '#' inside strings/comments is data.
		lx.scanLineComment()
		return nil
	case c == '/' && lx.peekAt(1) == '*':
		return lx.scanBlockComment()
	case c == '\'':
		return lx.scanString()
	case c == '`' || c == '"':
		return lx.scanQuotedIdent(c)
	default:
		return lx.scanOpOrPunct()
	}
}

// emit appends a token spanning [start, lx.pos).
func (lx *lexer) emit(kind TokenKind, start int) {
	lx.toks = append(lx.toks, Token{Kind: kind, Start: start, End: lx.pos, Text: lx.src[start:lx.pos]})
}

// peekAt returns the byte at lx.pos+off, or 0 past the end of input.
func (lx *lexer) peekAt(off int) byte {
	if lx.pos+off < len(lx.src) {
		return lx.src[lx.pos+off]
	}
	return 0
}

// isSpaceByte reports ASCII whitespace. The legacy \s+ token class is
// Unicode-aware in theory, but the corpus contains non-ASCII bytes only
// inside string literals (probe-verified), so ASCII is sufficient for parity.
func isSpaceByte(c byte) bool {
	switch c {
	case ' ', '\t', '\n', '\r', '\v', '\f':
		return true
	}
	return false
}

func (lx *lexer) scanWS() {
	start := lx.pos
	for lx.pos < len(lx.src) && isSpaceByte(lx.src[lx.pos]) {
		lx.pos++
	}
	lx.emit(TokWS, start)
}

// scanOpOrPunct lexes operators (two-byte first: longest match wins) and
// punctuation. The operator set mirrors legacy binaryOpRe/closureRe/specCharsRe
// exactly, plus ';' (absent from legacy tokenRe; harmless — no corpus case
// contains one).
func (lx *lexer) scanOpOrPunct() error {
	start := lx.pos
	if lx.pos+1 < len(lx.src) {
		switch lx.src[lx.pos : lx.pos+2] {
		case "=>", "||", ">=", "<=", "==", "!=", "<>", "->":
			lx.pos += 2
			lx.emit(TokOp, start)
			return nil
		}
	}
	var kind TokenKind
	switch lx.src[lx.pos] {
	case '(':
		kind = TokLParen
	case ')':
		kind = TokRParen
	case '[':
		kind = TokLBracket
	case ']':
		kind = TokRBracket
	case ',':
		kind = TokComma
	case '?':
		kind = TokQuestion
	case ':':
		kind = TokColon
	case ';':
		kind = TokSemicolon
	case '-', '+', '/', '%', '*', '=', '<', '>', '.', '!':
		kind = TokOp
	default:
		return fmt.Errorf("unexpected character %q at offset %d", lx.src[lx.pos], lx.pos)
	}
	lx.pos++
	lx.emit(kind, start)
	return nil
}

// scanLineComment consumes '--', '#', or '#!' to end of line. The trailing
// newline is NOT part of the token (it lexes as the following TokWS) —
// probe-verified legacy shape, relied on by the differential test.
func (lx *lexer) scanLineComment() {
	start := lx.pos
	for lx.pos < len(lx.src) && lx.src[lx.pos] != '\n' {
		lx.pos++
	}
	lx.emit(TokComment, start)
}

// scanBlockComment consumes '/* … */' (non-nesting, design §3.4).
func (lx *lexer) scanBlockComment() error {
	start := lx.pos
	lx.pos += 2 // consume "/*"
	for lx.pos < len(lx.src) {
		if lx.src[lx.pos] == '*' && lx.peekAt(1) == '/' {
			lx.pos += 2
			lx.emit(TokComment, start)
			return nil
		}
		lx.pos++
	}
	return fmt.Errorf("unterminated block comment at offset %d", start)
}

// scanString consumes a single-quoted literal honoring both escape styles:
// backslash (\') and SQL doubling (''). NOTE: legacy honors only backslash —
// 'it''s' lexes as TWO legacy tokens. Intended divergence; no corpus case
// exercises it (probe-verified 2026-07-06, see lexer_diff_test.go).
func (lx *lexer) scanString() error {
	start := lx.pos
	lx.pos++ // opening quote
	for lx.pos < len(lx.src) {
		switch lx.src[lx.pos] {
		case '\\':
			if lx.pos+1 >= len(lx.src) {
				return fmt.Errorf("unterminated string literal at offset %d", start)
			}
			lx.pos += 2
		case '\'':
			if lx.peekAt(1) == '\'' {
				lx.pos += 2 // '' doubling: stay inside the literal
				continue
			}
			lx.pos++
			lx.emit(TokString, start)
			return nil
		default:
			lx.pos++
		}
	}
	return fmt.Errorf("unterminated string literal at offset %d", start)
}

// scanQuotedIdent consumes `…` or "…" with backslash escapes (no doubling —
// mirrors legacy stringRe for these quote flavors).
func (lx *lexer) scanQuotedIdent(q byte) error {
	start := lx.pos
	lx.pos++ // opening quote
	for lx.pos < len(lx.src) {
		switch lx.src[lx.pos] {
		case '\\':
			if lx.pos+1 >= len(lx.src) {
				return fmt.Errorf("unterminated quoted identifier at offset %d", start)
			}
			lx.pos += 2
		case q:
			lx.pos++
			lx.emit(TokQuotedIdent, start)
			return nil
		default:
			lx.pos++
		}
	}
	return fmt.Errorf("unterminated quoted identifier at offset %d", start)
}
