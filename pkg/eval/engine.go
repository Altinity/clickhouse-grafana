// pkg/eval/engine.go
package eval

import "os"

// ParserEngine selects the ToAST implementation (#733 Phase 2, design §3.2).
type ParserEngine int

const (
	// EngineLegacy is the regexp-based scanner loop in eval_query.go —
	// the DEFAULT through Phase 2 (flip is Phase 3, its own plan).
	EngineLegacy ParserEngine = iota
	// EngineV2 is the recursive-descent parser (parser_v2.go + compat.go),
	// gated by the golden-corpus byte-parity differential.
	EngineV2
)

var currentEngine = engineFromEnv()

// engineFromEnv reads CLICKHOUSE_GRAFANA_PARSER: "v2" selects EngineV2,
// anything else (including unset) selects EngineLegacy — the rollback story
// for Phase 3 (design §5: rollback = env var until Phase 4).
func engineFromEnv() ParserEngine {
	if os.Getenv("CLICKHOUSE_GRAFANA_PARSER") == "v2" {
		return EngineV2
	}
	return EngineLegacy
}

// SetEngine overrides the active engine and returns the previous one
// (test hook / programmatic rollback). Not safe for concurrent use with
// in-flight ToAST calls; tests set it around whole corpus sweeps.
func SetEngine(e ParserEngine) ParserEngine {
	prev := currentEngine
	currentEngine = e
	return prev
}

// Engine reports the active parser engine.
func Engine() ParserEngine {
	return currentEngine
}

// ToAST parses the scanner's original query into an EvalAST using the active
// engine. The legacy implementation (toASTLegacy, eval_query.go) is the
// default and byte-frozen by the golden corpus; the v2 engine must match it
// byte-for-byte except the issue-tagged engine_diff corpus cases.
func (s *EvalQueryScanner) ToAST() (*EvalAST, error) {
	if Engine() == EngineV2 {
		return toASTV2(s._sOriginal)
	}
	return s.toASTLegacy()
}
