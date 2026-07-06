// pkg/eval/engine.go
package eval

import "os"

// ParserEngine selects the ToAST implementation (#733, design §3.2).
type ParserEngine int

const (
	// EngineLegacy is the regexp-based scanner loop in eval_query.go — the
	// default through Phase 2, kept for ONE release as the Phase-3 rollback
	// (CLICKHOUSE_GRAFANA_PARSER=legacy). Phase 4 deletes it.
	EngineLegacy ParserEngine = iota
	// EngineV2 is the recursive-descent parser (parser_v2.go + compat.go) —
	// the DEFAULT since Phase 3, gated by the golden-corpus byte-parity
	// differential: byte-identical to legacy on every corpus case except the
	// engine_diff-tagged intended fixes (#610, #374/#648).
	EngineV2
)

var currentEngine = engineFromEnv()

// engineFromEnv reads CLICKHOUSE_GRAFANA_PARSER: "legacy" selects EngineLegacy
// — the one-release rollback story (design §5: rollback = env var until Phase 4
// deletes the fallback); anything else (including unset and "v2") selects
// EngineV2, the default since Phase 3.
func engineFromEnv() ParserEngine {
	if os.Getenv("CLICKHOUSE_GRAFANA_PARSER") == "legacy" {
		return EngineLegacy
	}
	return EngineV2
}

// SetEngine overrides the active engine and returns the previous one
// (test hook / programmatic rollback). Not safe for concurrent use with
// in-flight ToAST calls — but production code never calls it: currentEngine
// is written exactly once at package init (before the plugin serves any
// request), and production callers only read it via Engine(). Only tests call
// SetEngine, around whole corpus sweeps, with a deferred restore.
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
// engine. The v2 engine (default since Phase 3) is byte-identical to the
// legacy goldens on every corpus case except the engine_diff-tagged ones
// (#610 hash comments, #374/#648 apostrophe-in-comment — intended fixes).
// The legacy implementation (toASTLegacy, eval_query.go) remains selectable
// via CLICKHOUSE_GRAFANA_PARSER=legacy for one release, then Phase 4 deletes it.
func (s *EvalQueryScanner) ToAST() (*EvalAST, error) {
	if Engine() == EngineV2 {
		return toASTV2(s._sOriginal)
	}
	return s.toASTLegacy()
}
