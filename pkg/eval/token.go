// pkg/eval/token.go
package eval

import "fmt"

// TokenKind classifies lexical tokens produced by Tokenize (#733 Phase 1,
// design §3.3). Keywords are deliberately NOT a lexer concept: bare words lex
// as TokIdent; recognizing "group by", "union all" or join kinds is the
// Phase-2 parser's job (case-insensitive matching over TokIdent sequences).
type TokenKind uint8

const (
	TokWS          TokenKind = iota // run of ASCII whitespace
	TokComment                      // "-- …", "# …", "#! …" (newline excluded), "/* … */"
	TokString                       // '…' honoring '' and \' escapes
	TokQuotedIdent                  // `…` or "…" honoring \-escapes
	TokIdent                        // bare word: [a-zA-Z_][a-zA-Z_0-9]*
	TokNumber                       // 1 | 1.5 | 1. | .5 | 1e6 | 1E+6 (legacy-compatible forms)
	TokOp                           // => || >= <= == != <> -> + - / % * = < > . !
	TokLParen                       // (
	TokRParen                       // )
	TokLBracket                     // [
	TokRBracket                     // ]
	TokComma                        // ,
	TokQuestion                     // ?
	TokColon                        // :
	TokSemicolon                    // ;
	TokMacro                        // $ident | ${ident} | ${ident:fmt}
)

var tokenKindNames = [...]string{
	TokWS:          "WS",
	TokComment:     "Comment",
	TokString:      "String",
	TokQuotedIdent: "QuotedIdent",
	TokIdent:       "Ident",
	TokNumber:      "Number",
	TokOp:          "Op",
	TokLParen:      "LParen",
	TokRParen:      "RParen",
	TokLBracket:    "LBracket",
	TokRBracket:    "RBracket",
	TokComma:       "Comma",
	TokQuestion:    "Question",
	TokColon:       "Colon",
	TokSemicolon:   "Semicolon",
	TokMacro:       "Macro",
}

// String implements fmt.Stringer for readable test failures and goldens.
func (k TokenKind) String() string {
	if int(k) < len(tokenKindNames) && tokenKindNames[k] != "" {
		return tokenKindNames[k]
	}
	return fmt.Sprintf("TokenKind(%d)", uint8(k))
}

// Token is one lexical token. Start/End are byte offsets into the original
// input (position-preserving, design §3.3); Text is the exact, unmodified
// source slice src[Start:End].
type Token struct {
	Kind  TokenKind
	Start int
	End   int
	Text  string
}
