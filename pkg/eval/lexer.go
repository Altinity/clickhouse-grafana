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
// byte. Branch order is load-bearing (see Tasks 3-4 for the full order).
func (lx *lexer) next() error {
	c := lx.src[lx.pos]
	switch {
	case isSpaceByte(c):
		lx.scanWS()
		return nil
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
