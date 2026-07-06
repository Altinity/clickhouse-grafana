# #733 SQL Parser Rewrite + Coupled Backend Refactoring — Design

**Status:** Draft for maintainer review · 2026-07-06
**Issue:** [#733 rewrite sql parser](https://github.com/Altinity/clickhouse-grafana/issues/733), milestone 3.5.0
**Prior art:** [`docs/issue-analysis/733-rewrite-sql-parser.md`](../../issue-analysis/733-rewrite-sql-parser.md) (options analysis — Option 2 "in-house lexer + clause parser" chosen; AfterShip rejected as primary, kept as test oracle), [`docs/repo-audit-2026-07.md`](../../repo-audit-2026-07.md) (backend findings this design absorbs).

This document locks the engineering design. Implementation is split into **five separately-planned, separately-shippable stages (A, 0, 1, 2, 3/4)**; each stage gets its own plan in `docs/superpowers/plans/` authored when the previous stage's gate is green. Stage A's plan is written together with this design: [`2026-07-06-backend-pre-parser-stabilization.md`](../plans/2026-07-06-backend-pre-parser-stabilization.md).

---

## 1. Problem, one paragraph

The only SQL parser (`pkg/eval/eval_query.go`, 2447 lines) tokenizes with a leading-anchored `regexp2` regex and builds an untyped `EvalAST` in a flat loop that simulates nesting with paren-counting and `strings.Index`. Two structural defects — lexer state-blindness (comments/quotes) and nesting-blindness (subqueries/IN/JOIN/CTE) — have produced 30+ issues and 3 shipped panics. The fix is a state-machine lexer plus a small recursive-descent clause parser **behind the frozen public API**, gated by a golden corpus that freezes today's behavior byte-for-byte.

## 2. Frozen contract (MUST NOT change through Phase 3)

### 2.1 Public API of `pkg/eval`

`EvalQuery` + `NewEvalQuery` + `ApplyMacrosAndTimeRangeToQuery()` + `ReplaceTimeFilters()`; `EvalQueryScanner` + `NewScanner` + `Next()` + `ToAST()` + `Format()` + `RemoveComments()` + `AddMetadata()`; `EvalAST{Obj map[string]interface{}; Arr []interface{}}`; `PrintAST(ast, tab)`. Signatures and observable behavior stay identical. Six resource handlers consume `EvalAST` directly (`resource_handlers.go:292, 329, 472, 568, 720, 976`).

### 2.2 `EvalAST` key vocabulary (observed, exhaustive)

- Clause keys, lowercase: `root`, `with`, `select`, `from`, `prewhere`, `where`, `group by`, `having`, `order by`, `limit`, `format`, `union all`.
- `join`: Arr of `*EvalAST{Obj: {type: string, source: *EvalAST, aliases: *EvalAST, using|on: *EvalAST}}`.
- `aliases` (subquery aliases), macro keys: `$rate`, `$perSecond`, `$perSecondColumns`, `$columns`, `$columnsMs`, `$rateColumns`, `$rateColumnsAggregated`, `$lttb`, `$lttbMs` (+ delta/increase family — **note:** these have *no* `PrintAST` branch today).
- Leaf values are **normalized strings** (see §2.3), except nested `*EvalAST` nodes. WHERE stores `,` and `AND`/`OR` connectors as separate Arr items.

### 2.3 Normalization semantics (the load-bearing subtlety)

`ToAST` re-tokenizes and re-spaces expressions: tokens join with a single space except after `( . ! [` and space-suppression via `appendToken` (`eval_query.go:1630`); `,` inside expressions renders as `", "`; comments keep a trailing `\n`. Examples pinned by tests: `col2/col1*10000` → `col2 / col1 * 10000`; `-1` → `- 1`. The v2 engine must reproduce this **byte-for-byte** — it is executed SQL on the adhoc paths (`PrintAST` at `resource_handlers.go:392, 631, 1044`).

### 2.4 Known quirks — preserved bug-for-bug until Phase 4

| Quirk | Where | Phase-4 disposition |
|---|---|---|
| `$lttbMs` branch prints the `$lttb` key → nil-assertion panic when only `$lttbMs` present | `eval_query.go:2330-2333` | fix (panic → correct print); safe to fix in Stage A since current behavior is a crash |
| No `PrintAST` branches for `$delta*`/`$increase*`/`$perSecondColumnsAggregated` | `PrintAST` | add branches (corpus-tagged diff) |
| `$adhoc` replacement divergence: **`handleApplyAdhocFilters` AND `handleCreateQueryWithAdhoc` replace `$adhoc`→`1` unconditionally** (even 0 filters — the block sits *outside* the `len>0` guard); **`handleProcessQueryBatch` replaces only when filters exist** (block *inside* the guard). NB: all three carry the same misleading `// Always handle...even for empty filters` comment, but only two actually do — read the control flow, not the comment. Verified against `git 371e5e99:resource_handlers.go`. | 3 handlers | Stage A extraction preserves each via `applyAdhocFiltersToAST(..., replaceAdhocMacroAlways)`: `true` for ApplyAdhocFilters + CreateQueryWithAdhoc, `false` for ProcessQueryBatch. Corrected 2026-07-06 after a Task-7 regression (plan had mis-assigned CreateQueryWithAdhoc). |
| Table-function whitelist `tableFuncRe` (`:2048`) is incomplete by construction | tokenizer | v2 derives "table function" structurally (ident + `(` in FROM position); corpus-tagged diff |
| `#`/`#!` comments unsupported (#610 — PR #911 in flight) | tokenizer | v2 lexer supports natively; keep parity with whatever #911 ships |

## 3. Architecture

### 3.1 Package layout — new files, all in `package eval` (avoids import cycles; EvalAST access stays internal)

```
pkg/eval/
  eval_query.go        — UNTOUCHED through Phase 2 (macros + legacy engine)
  engine.go            — engine selection (env flag + test override)
  token.go             — Token, TokenKind, keyword tables
  lexer.go             — state-machine lexer (no regexp)
  parser_v2.go         — recursive-descent clause parser → typed nodes
  nodes.go             — internal typed node structs
  compat.go            — typed nodes → EvalAST + renderExpr normalizer
  ast_access.go        — safe EvalAST accessors (Stage A; shared with handlers)
  testdata/corpus/     — golden corpus (Phase 0)
  corpus_test.go       — corpus harness (Phase 0)
  lexer_test.go, parser_v2_test.go, differential_test.go
```

### 3.2 Engine gating

```go
// engine.go
type ParserEngine int

const (
    EngineLegacy ParserEngine = iota
    EngineV2
)

var currentEngine = engineFromEnv() // CLICKHOUSE_GRAFANA_PARSER=v2 → EngineV2, else legacy

func SetEngine(e ParserEngine) ParserEngine // returns previous; test/rollback hook
func Engine() ParserEngine
```

`(*EvalQueryScanner).ToAST()` becomes a 5-line dispatcher: `EngineV2` → `toASTv2(s._sOriginal)`, else the legacy body (moved verbatim to `toASTLegacy`). `Next()`/`RemoveComments()` keep legacy implementations until Phase 4 (they are exported; corpus pins them).

### 3.3 Token model

```go
// token.go
type TokenKind uint8

const (
    TokWS TokenKind = iota
    TokComment     // '-- …\n', '/* … */', '# …', '#! …'
    TokString      // '…' with '' and \' escapes
    TokQuotedIdent // `…` or "…"
    TokIdent       // bare word (keyword-ness decided by the parser, not the lexer)
    TokNumber      // int | float | 1e6 | 1E+6
    TokOp          // => || >= <= == != <> -> + - / % * = < > . !
    TokLParen; TokRParen; TokLBracket; TokRBracket
    TokComma; TokQuestion; TokColon; TokSemicolon
    TokMacro       // $ident   ${ident} ${ident:fmt}
)

type Token struct {
    Kind       TokenKind
    Start, End int    // byte offsets into the original input (position-preserving)
    Text       string // exact source slice, unmodified
}
```

Design choices vs legacy: **keywords are not a lexer concept.** The parser matches case-insensitive *token sequences* over `TokIdent` (`group`+`by`, `union`+`all`, the JOIN modifier set `{global, any, all, inner, left, right, full, cross, outer} … join`, `array join`, `global not in` …). This deletes the 75-branch `joinsRe` and fixes the #256 word-boundary class structurally: `FromField` is a single `TokIdent`, never a keyword.

### 3.4 Lexer

Hand-written single pass over bytes (rune-aware only inside identifiers/strings), ~250 lines:

```go
func Tokenize(src string) ([]Token, error)
```

State handling: line comments `--`, `#`, `#!` (start-of-token position only — `#` inside an ident or string is data); block comments `/* … */` (non-nesting, unterminated → error with offset); strings `'…'` honoring `''` and `\'`; quoted idents `` ` `` and `"`; numbers with exponent forms; `$ident` and `${ident:fmt}` as `TokMacro`; multi-char operators longest-match. Errors carry byte offsets (`fmt.Errorf("unterminated string literal at offset %d", pos)`) — replacing the legacy opaque `cannot find next token in […]`.

**Property:** at every position the lexer is in exactly one state; the entire §3.1-comment/§3.4-quoting bug class from the audit (`#374, #610, #121, #648`) becomes unrepresentable.

### 3.5 Parser v2 — grammar (clause skeleton only; no expression semantics)

```
query        := macroHead | unionChain
unionChain   := selectStmt ( UNION ALL selectStmt )*
selectStmt   := [WITH items] [SELECT items] [FROM source join*]
                [PREWHERE cond] [WHERE cond] [GROUP BY items]
                [HAVING cond] [ORDER BY items] [LIMIT items] [FORMAT item]
macroHead    := TokMacro(func) '(' balancedArgs ')' FROM source …rest-of-selectStmt
source       := '(' query ')' [alias]           — subquery (recursion)
              | ident '(' balancedTokens ')'    — table function (structural, no whitelist)
              | tableRef                        — [db .] table
join         := joinKind source [aliases] [ USING items | ON cond ]
cond items   := expression token runs; '(' … ')' tracked by recursion;
                IN-subqueries: IN '(' query ')' recurse (fixes #565/#277 class)
```

Internal nodes (`nodes.go`) are small typed structs (`queryNode`, `clauseNode`, `itemNode{tokens []Token; sub *queryNode}`, `joinNode`); **pointer-only, constructed via constructors** — the `EvalAST`-value-vs-pointer panic class (#799) is unconstructible. Exact field set is owned by Phase 2's plan; the contract is only: `compat.go` can emit §2.2's EvalAST from them.

### 3.6 Compat layer — the byte-parity mechanism

```go
// compat.go
func (q *queryNode) toEvalAST() (*EvalAST, error)
func renderExpr(tokens []Token) string // THE single normalizer
```

`renderExpr` re-implements §2.3 in one auditable place (space-join; suppression after `( . ! [` and before `) ] , .`; `", "` for commas; comment `\n`; strings/quoted idents verbatim). It is locked by (a) unit tests derived from every leaf-string literal already asserted in `eval_query_test.go`, and (b) the Phase-2 differential gate. If legacy normalization proves position-dependent in some corner, `renderExpr` gains a mode flag — the corpus decides, not intuition.

## 4. Golden corpus (Phase 0) — the regression gate for everything

**Layout:** `pkg/eval/testdata/corpus/<name>.sql`, first line optional directive:
`-- corpus: issue=565 expect=error tags=macro,subquery engine_diff=610`

**Golden outputs per case (generated, checked in):**
- `<name>.ast.golden.json` — `json.MarshalIndent` of `ToAST()` result (EvalAST marshals cleanly: maps/arrays/strings);
- `<name>.printed.golden.sql` — `PrintAST(ast, " ")`;
- `<name>.expanded.golden.sql` — `ApplyMacrosAndTimeRangeToQuery()` under the **fixed EvalQuery**: `From=2025-01-02T03:04:05Z`, `To=2025-01-02T04:05:06Z`, `Interval="30s"`, `IntervalFactor=1`, `Database="default"`, `Table="test_grafana"`, `DateTimeType="DATETIME"`, `DateTimeColDataType="event_time"`, `DateColDataType="event_date"`, both `UseWindowFuncForMacros` variants where the output differs.
- `expect=error` cases pin the error **message** too (they are part of the contract surface).

**Sources:** (1) every query literal in `eval_query_test.go` (~60); (2) every `query`/`rawSql`/`sql` string extracted from `docker/grafana/dashboards/*.json` (66 dashboards — issue-named regression fixtures); (3) hand-written backlog constructs for every §2.4 quirk and every issue in the analysis doc's §3 catalog, tagged `issue=NNN`.

**Harness:** `corpus_test.go` — `TestGoldenCorpus` iterates cases, compares byte-exact, `go test ./pkg/eval -run TestGoldenCorpus -args -update` regenerates. **Differential mode (Phases 1–2):** run both engines; assert identical output unless the case carries `engine_diff=NNN` — each allowed diff is tied to an issue number and asserted against its *own* golden (`<name>.v2.golden.*`).

**Oracle:** `oracle_test.go` under build tag `//go:build corpusoracle`: every non-error case's *expanded* SQL must parse with `github.com/AfterShip/clickhouse-sql-parser` (test-only usage; dep in `go.mod` but never imported by shipped code — Go links nothing from it into the plugin binary). CI runs it as a separate non-blocking job initially.

## 5. Stages, gates, effort

| Stage | Content | Gate to merge | Effort |
|---|---|---|---|
| **A. Pre-parser stabilization** (plan written, see link above) | safe AST accessors; panic fixes (`:345/:362/:604`, `parser.go:222/240`, `$lttbMs`); marshal sweep; handler characterization tests; extract `buildQueryContext` + `applyAdhocFiltersToAST` from the 3 duplicated handlers; golangci-lint in CI | `go test ./pkg/...` green; characterization goldens unchanged post-refactor; lint green | ~1 wk |
| **0. Corpus** | §4 harness + corpus + oracle; zero production changes | corpus green on legacy engine; oracle job runs | ~1 wk |
| **1. Lexer** | `token.go`+`lexer.go`; differential *token-stream* test vs a legacy-tokenizer shim over the corpus | token streams identical on corpus (modulo tagged diffs: `#`-comments, double-quoted idents); fuzz run (`go test -fuzz=FuzzTokenize -fuzztime=10m`) no panics | ~1 wk |
| **2. Parser v2 + compat** | `nodes.go`+`parser_v2.go`+`compat.go`+`engine.go`; dispatcher in `ToAST` | **byte-identical** AST-JSON, printed and expanded goldens on every non-tagged corpus case; tagged cases match their v2 goldens; oracle green on v2 output | ~1.5–2 wk |
| **3. Flip** | default → `EngineV2`; legacy kept behind env var for one release | full suite + `npm run test` + testflows matrix green; one release of burn-in | ~0.5 wk |
| **4. Cleanup + intended fixes** | delete legacy `toASTLegacy`/regexes/`regexp2` dep; land the fix-list (§2.4 dispositions; #565/#277/#38 GROUP-BY-injection scope, #871/#319 CTE, whitelist removal) each with corpus case flipped from `engine_diff` to default | corpus green; issues closed with regression cases | ~1 wk |

Rollback at any point = env var (`CLICKHOUSE_GRAFANA_PARSER=legacy`) until Phase 4 deletes the fallback.

## 6. Coupling between Stage A and the parser (why A is first)

1. **Single integration point.** Today the parse→inject→print pipeline is copy-pasted in 3 handlers (with an already-diverged `$adhoc` branch, §2.4). After extraction, Phase 2's engine dispatch has *one* consumer path to validate.
2. **Safe accessors are shared vocabulary.** `ast_access.go` (Stage A) is used by handlers now and by `compat.go` later; panic class dies once, in one place.
3. **Characterization tests are the outer gate.** Corpus (Phase 0) pins `pkg/eval` behavior; Stage A's handler goldens pin the HTTP surface *above* it. Phase 3's flip is validated by both layers without writing new tests.

Interface locked for Stage A (consumed by later phases; full code in the Stage A plan):

```go
// pkg/eval/ast_access.go
func (e *EvalAST) SubAST(key string) (*EvalAST, bool)  // tolerates *EvalAST and EvalAST values
func (e *EvalAST) StringAt(i int) (string, bool)
func InnermostFrom(ast *EvalAST) *EvalAST              // replaces the :345/:587 navigation loops

// pkg/query_context.go
type queryContext struct { SQL string; AST *eval.EvalAST; From, To time.Time; HasAdhocMacro bool }
func buildQueryContext(request interface{}, rawQuery string, timeRange timeutils.TimeRangeStruct, handler string) (*queryContext, *ErrorContext)
func applyAdhocFiltersToAST(qc *queryContext, filters []adhoc.AdhocFilter, target Target, replaceAdhocMacroAlways bool) (string, *ErrorContext)
```

## 7. Risks

1. **Silent output drift** (highest): mitigated by byte-exact gate + oracle + testflows dashboards; residual risk is inputs outside the corpus — mitigated by fuzzing the lexer and by the one-release legacy fallback.
2. **Normalization corner-cases** resist a single `renderExpr` rule set: fallback is per-context render modes; budget 2–3 extra days in Phase 2.
3. **Corpus freezes bugs users depend on**: intended diffs are explicit (`engine_diff=NNN`), reviewed one-by-one in Phase 4, never bundled into the flip.
4. **Scope creep to full SQL grammar**: the grammar in §3.5 is the whole grammar; expression semantics are out of scope, permanently.
5. **Open maintainer questions** (block Phase 2 start, not Stage A/0): (a) is `PrintAST` byte-format a contract or is equivalent-SQL acceptable? (assumed: contract); (b) AfterShip as test-only dep OK? (assumed: yes); (c) confirm `$adhoc`-divergence disposition (§2.4).

## 8. Explicitly out of scope

Macro engine rewrite on top of v2 AST ("Phase 5" — the real code-size payoff; separate design after Phase 4); interpolation contract (Theme B — own spec, `2026-07-04-variable-interpolation-contract-design.md`); type-resolution consolidation (Theme A); frontend changes of any kind; `pkg/parser.go` (response parser — unrelated despite the name).
