# Issue #733 — Rewrite the SQL parser

Deep architectural analysis + phased migration plan, against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/733> — **OPEN**, author `Slach` (maintainer), 2025-03-10, milestone **3.5.0**, no comments.
- Issue body (verbatim): *"candidates: https://github.com/AfterShip/clickhouse-sql-parser, https://github.com/alecthomas/participle"*.
- Predecessor: **#688 "Rewrite parser to golang only"** (CLOSED) — that goal (kill the duplicated TS parser, keep one Go parser) is **already done**: `scanner.ts` was removed on 2024-12-09 (commit `185d08b5`). So #733 is a different, larger ask: replace the *implementation* of the surviving Go parser.

This document builds on the format and the tokenizer walkthrough in [`610-clickhouse-hash-comments.md`](./610-clickhouse-hash-comments.md); it does not re-derive the `commentRe`/`tokenRe` internals already documented there.

---

## 0. TL;DR

**Verdict: do NOT do a full drop-in replacement with a third-party ClickHouse grammar (`AfterShip/clickhouse-sql-parser`). Instead, do a scoped, in-house rewrite of the tokenizer + a small structural parser behind the *existing* Go API, gated by a golden-test corpus.** Optionally use `participle` for the tokenizer/lexer layer only. Rationale in one paragraph:

The plugin does **not** need to understand ClickHouse SQL. It needs six narrow capabilities (see §2): find macro boundaries, extract database/table, find the WHERE injection point for adhoc filters, strip/preserve comments, detect the FROM/subquery structure, and re-serialize a lightly-modified query. A full ClickHouse AST library (`AfterShip`) parses *far* more than that, has its **own** normalization/format output that will **not** match the plugin's current `PrintAST` output byte-for-byte, does not model the plugin's `$`-macros as first-class tokens, and would force every one of the plugin's clause-injection tricks to be re-expressed against a foreign AST — a rewrite of comparable size with a new, un-owned dependency that "has a long way to go on syntax compatibility" (the maintainers' own words on that library). The current parser's real problems (catalogued in §4) are **tokenizer state-tracking gaps** (comments/quotes) and **AST-builder scope confusion on nested subqueries/CTEs/IN/JOIN** — both are fixable in a focused in-house rewrite that keeps the public contract identical and is protected by a snapshot corpus.

- **Chosen approach:** Option 2 (in-house recursive-descent lexer + thin clause-level parser), keeping the `pkg/eval` public API and the `EvalAST` shape **byte-for-byte compatible**, with an optional `participle`-based lexer under it. Reject Option 3 (`AfterShip`) as the primary path; keep it as a possible *validation oracle* only.
- **Effort estimate:** **Large — ~4–6 engineer-weeks** end to end (corpus + lexer + parser + macro re-wiring + hardening the known-bug backlog). This is a multi-phase epic, not a single PR.
- **Risk level:** **High** if done as a big-bang swap; **Medium** with the phased, corpus-gated plan below (each phase independently shippable and revertable behind the unchanged API). The single biggest risk is silent output drift: the parser's AST strings are a *normalized* form (operators re-spaced, see §1.3) consumed by adhoc-filter injection and `PrintAST`, so any behavioral change ripples into generated SQL.

---

## 1. Current-state inventory

### 1.1 The one and only SQL parser: `pkg/eval/eval_query.go`

| Fact | Value |
|---|---|
| File | `pkg/eval/eval_query.go` |
| Size | **2447 lines** (parser + macro expansion combined) |
| Test file | `pkg/eval/eval_query_test.go` — **2544 lines** |
| Tokenizer engine | `github.com/dlclark/regexp2 v1.12.0` (a .NET-flavored regex engine with lookahead/backtracking, needed because Go's stdlib `regexp` (RE2) can't do the string-literal-aware lookaheads) |
| Parser style | Hand-rolled, single-pass, **leading-anchored regex tokenizer** (`tokenReComplied`, `eval_query.go:2076`) feeding an ad-hoc statement-grouping loop (`ToAST`, `eval_query.go:1637-1793`) |
| AST type | `EvalAST` (`eval_query.go:1489-1492`) — an untyped `map[string]interface{}` + `[]interface{}` blob, **not** a typed node tree |

The frontend has **no** SQL parser anymore. The historical TypeScript `scanner.ts`/`sql_query.ts` duplication (the thing #688 was about, and the source of the #132 "fix it twice" hazard) was deleted:

- `185d08b5 remove scanner.ts` (2024-12-09)
- `e9dc1307 Remove SQL query helper` (2024-12-09)
- `162344cf Remove Dead code` (2025-08-24)

The surviving TS files `.../editor/constants/macros.ts` (34 lines) and `.../editor/autocompletions/macros.ts` (223 lines) are **Monaco autocomplete/highlight metadata only** — no parsing, no macro expansion. **The rewrite is therefore a Go-only, single-implementation problem.** This is a large de-risking fact relative to older discussions of this issue.

There is a **second, unrelated parser** — `pkg/parser.go` (556 lines) — but it parses **ClickHouse *response* values and column types** (`ParseValue`, `ParseTimeZone`, `NewDataFieldByType`), not query syntax. It does **not** import `pkg/eval` and is **out of scope** for #733.

### 1.2 Public API surface of `pkg/eval` (the contract a rewrite must preserve)

Exported symbols (definitions in `eval_query.go`):

| Symbol | Signature | Line | Role |
|---|---|---|---|
| `EvalQuery` (struct) | 24 fields incl. `Query`, `Table`, `Database`, `DateTimeType`, `SkipComments`, `AddMetadata`, `UseWindowFuncForMacros`, `From`, `To` | `:33` | The request/config bundle |
| `NewEvalQuery(request, from, to)` | `func(interface{}, time.Time, time.Time) EvalQuery` | `:2414` | Build `EvalQuery` from a request via reflection |
| `(*EvalQuery) ApplyMacrosAndTimeRangeToQuery()` | `() (string, error)` | `:166` | **Primary entry.** Parse → expand macros → strip comments → add metadata → replace time filters |
| `(*EvalQuery) ReplaceTimeFilters(query, round)` | `(string, int) string` | `:319` | Replace only `$from/$to/$__from/$__to` (no full parse) |
| `EvalQueryScanner` (struct) | tokenizer state | `:1528` | The scanner object |
| `NewScanner(query)` | `func(string) EvalQueryScanner` | `:1539` | Construct scanner |
| `(*EvalQueryScanner) ToAST()` | `() (*EvalAST, error)` | `:1637` | **Parse to AST** (the core parser) |
| `(*EvalQueryScanner) Next()` | `() (bool, error)` | `:1550` | Advance one token |
| `(*EvalQueryScanner) Format()` | `() (string, error)` | `:1589` | Pretty-print (ToAST → PrintAST) |
| `(*EvalQueryScanner) RemoveComments(query)` | `(string) (string, error)` | `:1934` | Strip comments via `commentRe` |
| `(*EvalQueryScanner) AddMetadata(query, q)` | `(string, *EvalQuery) string` | `:1938` | Prepend `/* grafana ... */` |
| `(*EvalQueryScanner) SetRoot`, `CheckArrayJOINAndExpectNextOrNext` | — | `:1618`, `:1917` | Exported but effectively internal |
| `EvalAST` (struct) | `{Obj map[string]interface{}; Arr []interface{}}` | `:1489` | **The AST — a public data contract** |
| `PrintAST(ast, tab)` | `func(*EvalAST, string) string` | `:2284` | **Serialize AST → SQL** |

### 1.3 The AST is a *public contract*, and it emits a *normalized* string form

This is the load-bearing subtlety for the whole rewrite. `ToAST` does not just locate structure — it **re-tokenizes and re-spaces expressions**. Example from AST test case 1 (`eval_query_test.go:861,879`):

- Input: `... toUInt32(col1 > 0 ? col2/col1*10000 : 0)/100 AS percent ...`
- AST `select[3]` (output): `toUInt32(col1 > 0 ? col2 / col1 * 10000 : 0) / 100 AS percent`

The `/` and `*` got spaces inserted; `AND(- 1 IN ...)` in case 2 (`:969`) shows `-1` became `- 1`. So the AST leaf strings are a **canonicalized rewrite of the input**, not the input verbatim. Any replacement parser must reproduce this normalization *exactly*, because these strings flow into `PrintAST` and back out as executed SQL, and into adhoc-filter injection. **This is why a third-party library's own formatter cannot be a drop-in: it will normalize differently.**

### 1.4 Callers — who consumes the parser, and do they need the AST or just macro expansion?

All callers are in `pkg/` (backend); none in the frontend.

**Macro-expansion only (need `ApplyMacrosAndTimeRangeToQuery`, not the AST):**
- `pkg/datasource.go:65` — expand macros for a live query before execution.
- `pkg/resource_handlers.go` `handleReplaceTimeFilters` — uses `ReplaceTimeFilters` only (preview, no full parse).
- `pkg/streaming.go:673` — copies the `AddMetadata` flag into an `EvalQuery` (field use, not a parse).

**Full-AST consumers (call `NewScanner`→`ToAST`, then read/mutate `EvalAST`, then `PrintAST` back):**
- `handleCreateQuery` (`resource_handlers.go:292-293`) — parse expanded SQL, read GROUP BY for editor autocomplete.
- `handleApplyAdhocFilters` (`:329-392`) — parse, **inject adhoc predicates into the WHERE `Arr`**, then `PrintAST(topQueryAst, " ")` (`:392`).
- `handleGetAstProperty` (`:472-473`) — parse, extract a named AST property (GROUP BY / FROM / …).
- `handleProcessQueryBatch` (`:568-633`) — parse, adhoc-inject, `PrintAST` (`:633`).
- `handleGetMultipleAstProperties` (`:720-721`) — parse, extract several properties.
- `handleCreateQueryWithAdhoc` (`:976-1044`) — parse, adhoc-inject, `PrintAST` (`:1044`).

**Conclusion:** the `EvalAST` structure and `PrintAST` are a **hard public contract consumed by six resource handlers**, principally for **adhoc-filter WHERE-injection** and **property extraction (FROM/GROUP BY)**. A rewrite cannot treat the AST as a private implementation detail of macro expansion; it must either keep `EvalAST`/`PrintAST` behavior identical or migrate all six handlers in lockstep. Adhoc column typing (`pkg/adhoc_columns.go`) sits *alongside* this (it fetches `system.columns` to type filters) but does not itself parse SQL.

### 1.5 Test coverage today

- `TestScannerAST` (`eval_query_test.go:857`) — a table of **~29 `newASTTestCase(name, query, expectedAST)` entries** asserting the full nested `EvalAST` via `CheckASTEqual` (deep structural compare, `:793`). Coverage includes JOIN (GLOBAL ANY LEFT … USING), PREWHERE, subqueries, `$rateColumns`, backtick aliases, FORMAT, comments (cases 18/20), UNION ALL, `$columns`+WITH.
- `TestMacrosBuilder` (`:34`) and the `Test*` macro/time-filter functions (`:668`, `:687`, `:748`, `:1894`, `:1946`, `:2036`, `:2075`, `:2091`) — end-to-end `ApplyMacrosAndTimeRangeToQuery` assertions.
- **Golden fixtures already on disk:** `docker/grafana/dashboards/*.json` — dozens of dashboards, many named for the issue they regress-test (`columns_union_all_with.json`, `adhoc_from_template_variable_issue_805.json`, `array_join_nested.json`, `macros_window_functions.json`, `aggregated_macros_issue_386.json`, …). These are a ready-made corpus of *real* queries.

**Assessment:** coverage is decent for the happy paths but is expressed as hand-written expected-AST literals — brittle to maintain and not exhaustive over the bug backlog in §4. The migration plan (§6) turns these plus the dashboard queries into an automated **golden snapshot** first.

---

## 2. The minimal parser contract (what the plugin *actually* needs)

The plugin is **not** a SQL engine. Enumerating what the code in `eval_query.go` genuinely relies on, the parser must provide exactly these capabilities:

1. **Macro boundary detection.** Locate `$`-macro-functions (`$columns`, `$rate`, `$perSecond`, `$delta`, `$increase`, `$lttb`, their `*Ms`/`*Columns`/`*ColumnsAggregated` variants — the set in `macroFuncRe`, `eval_query.go:2039`) and capture their comma-separated argument list and the `FROM …` tail that follows the macro call (`_parseMacro`/`_fromIndex`, `:470-481`, `:879-888`). Simple `$`-token macros (`$table`, `$timeFilter`, `$timeSeries`, `$from`, `$to`, `$interval`, `$dateCol`, …) are pure regex replacements (`:269-282`) and do **not** need the AST at all.
2. **Clause segmentation.** Split a SELECT into its clauses — `WITH / SELECT / FROM / PREWHERE / WHERE / GROUP BY / HAVING / ORDER BY / LIMIT / FORMAT / UNION ALL` (`statementRe`, `:1957`) — so macros can find "the FROM tail", GROUP BY can be extracted/injected, and HAVING/ORDER BY reordering works (`_columns`, `:526-555`).
3. **Table / database extraction.** From the `FROM` clause, recover the table (and `db.table`) identifier for autocomplete and adhoc typing — including table *functions* (`remote`, `cluster`, `numbers`, `s3`, …; `tableFuncRe`, `:2048`) which must **not** be treated as plain tables.
4. **WHERE injection point.** Identify where adhoc filters and `$timeFilter` get spliced (`_applyTimeFilter`, `:1258-1272`; adhoc injection into `EvalAST.where.Arr` in the resource handlers). Requires knowing the WHERE clause's token list *at top query level* (not inside a subquery/IN-list/JOIN-ON).
5. **Comment handling.** Recognize `--`, `/* */` (and, per #610, ideally `#`/`#!`) as comments that are **string-literal-aware**, and either strip (`RemoveComments`, when `SkipComments`) or preserve them in the AST (`isComment` branch, `:1777-1779`).
6. **Structure-aware nesting.** Correctly track **subqueries in FROM, IN-lists, JOIN sources/ON/USING, ARRAY JOIN, and CTE bodies**, so that clause extraction/injection targets the *right* nesting level. This is precisely where the current parser fails (§4).
7. **Lossless-ish round-trip.** Serialize the (possibly mutated) structure back to executable SQL via `PrintAST`, preserving semantics. It need **not** be a canonical pretty-printer — but its output must stay stable across the rewrite because it *is* the executed SQL for adhoc paths.

Notably **out of scope**: expression type-checking, function-signature validation, operator precedence semantics, DDL, full DML. The parser only needs *structural* understanding down to the clause + nesting level, plus string-literal/comment/identifier lexing. This is a **much smaller contract than a ClickHouse grammar**, and is the core argument for an in-house rewrite over a general library.

---

## 3. Known bugs & limitations catalog

Compiled from the issue tracker (open + closed) and the test suite. Two dominant failure modes:

- **TOK** = tokenizer failure — scanner throws `parse AST error: cannot find next token in [...]` (or panics), macros never expand.
- **AST** = AST-builder correctness — parses, but emits wrong SQL (mis-scoped clause injection, dropped label column, spurious glue words).

### 3.1 Comments & string literals (tokenizer state-tracking)
| # | State | Construct that breaks | Class |
|---|---|---|---|
| #95 | CLOSED | `-- line comment` not tokenized at all (baseline) | TOK |
| #374 | CLOSED | `--` **inside a string literal** (`'ccc--bert'` in an IN-list) wrongly eaten as comment | TOK |
| #610 | **OPEN** (3.5.0) | `#` / `#!` ClickHouse comments unsupported → hard parse error | TOK |
| #648 | CLOSED (3.2.4) | `/* … '(' … */` in a `WITH` clause with an unbalanced paren inside the comment → whole query parsed as one `WITH` node (paren-balance ignores comments) | AST |
| #383 | CLOSED | comment chars arriving via a template variable value break parsing | TOK+ordering |

### 3.2 CTE / WITH
| # | State | Construct | Class |
|---|---|---|---|
| #319 | CLOSED | `WITH (SELECT groupArray(...) FROM …) AS x … UNION ALL …` skips the UNION ALL branch (workaround: alias inside the scalar subquery) | AST |
| #871 | CLOSED (3.4.10) | `WITH cte AS (…)` feeding `GLOBAL IN`: timeSeries renders a single line (label column dropped); table format OK | AST/serialization |

### 3.3 Nested subqueries / IN / JOIN / ARRAY JOIN (macro clause-injection scope)
| # | State | Construct | Class |
|---|---|---|---|
| #565 | CLOSED | `$columns(...) FROM $table WHERE (a,b) IN (SELECT … LIMIT 10)` → injected `GROUP BY t, desc` attached to wrong nesting level / omitted | AST |
| #277 | CLOSED | `$columns(...) … IN (SELECT … LIMIT 20)` → ClickHouse `Syntax error at 'GROUP'` | AST |
| #38 | CLOSED | `$columns(...)` + `JOIN` → `Code: 62 Syntax error` | AST |
| #156 / #464 | CLOSED | outer-SELECT over an aggregating subquery → "No Data" / can't split multiple series | AST/serialization |
| #799 | CLOSED (3.4.4) | `… WHERE name IN (SELECT Names FROM (…) ARRAY JOIN Names)` → **Go panic** `interface conversion: eval.EvalAST, not *eval.EvalAST` | AST panic (value vs pointer node) |
| #167 | CLOSED | subquery with an alias → `AST parser error` | TOK/AST |
| #739 | CLOSED | `$lttb` over a subquery grouped by category mis-serializes | AST |

### 3.4 Quoting / identifiers
| # | State | Construct | Class |
|---|---|---|---|
| #121 | CLOSED | `count() AS "Count of samples"` (double-quoted alias after AS) → `cannot find next token` | TOK |
| #815 | CLOSED (3.4.5) | `FROM $database.$table` (from template var) → garbage `` `billing.``.billing` `` | quoting |
| #132/#440/#98 | CLOSED | table name with `.` / `-` / space not backtick-escaped by `$table` | quoting |
| #256 | CLOSED | a field name containing the substring `From` or `$rate` confuses keyword/macro detection | TOK (word-boundary) |

### 3.5 FORMAT / macro-arg parsing / macro recognition
| # | State | Construct | Class |
|---|---|---|---|
| #837 | CLOSED (3.4.9) | empty query editor emits bare `FORMAT JSON` with no SELECT | AST edge case |
| #869 | CLOSED (3.4.10) | `$conditionalTest(a, b, c)` 3-arg else form emits **both** branches with a stray comma (arg-splitter mis-parses commas inside args) | macro-arg |
| #49 | CLOSED | `(` inside a macro argument breaks the arg parser | macro-arg |
| #864 / #238 | CLOSED | `$step` / `$interval` not expanded | macro recognition |
| #804 / #779 | CLOSED | `$adhoc` emits a spurious leading `AND` even with no preceding predicate | macro correctness |

### 3.6 Cross-cutting / robustness
| # | State | Note |
|---|---|---|
| #130 / #480 | CLOSED | `remote()`/`cluster()` etc. absent from the hardcoded table-function whitelist → `AST parse error`. The whitelist (`tableFuncRe`, `:2048`) is inherently incomplete. |
| #859 / #860 / #799 | CLOSED | several AST-builder paths reach **Go panics** (nil-deref / bad type assertion) instead of returning errors. |
| #794 / #678 | **OPEN** | adhoc filters on complex column types (`Map`, nested) generate invalid predicates. |
| #815 / #797 | CLOSED | interpolation-vs-macro **ordering** is fragile (3.4 dropped a pre-pass and broke variable-value-contains-SQL cases). *Architectural, not purely a parser bug.* |

**The pattern:** the recurring, hard-to-fix bugs are (1) **lexer state-tracking** around comments/quotes/identifiers, and (2) **the `ToAST` loop's inability to reason about nesting** — it uses `strings.Index(..., "having")`, `findKeywordOutsideBrackets`, and manual `betweenBraces` paren-counting (`:526-555`, `:651-677`, `:2247`) instead of a real recursive grammar, so any macro clause-injection over a nested query attaches to the wrong level. A rewrite that fixes *these two things specifically* clears most of the backlog.

---

## 4. Options analysis

Scored 1–5 (5 = best) on: **Fit** (matches the minimal contract in §2), **Risk** (of behavioral regression / breaking the AST contract), **Effort** (5 = cheapest), **Maintainability**, **Fixes-backlog** (how much of §3 it resolves).

### Option 1 — Incrementally harden the current regexp2 tokenizer + `ToAST` loop
Keep the architecture; fix bugs one by one (as #610 proposes for `#` comments).

- **Pros:** lowest immediate risk per change; each fix is small, testable, revertable; no new dependency; team already knows the code.
- **Cons:** does **not** address the root cause — the `ToAST` loop is fundamentally not nesting-aware (`strings.Index`/`betweenBraces` heuristics). The nested-subquery/CTE/JOIN backlog (§3.3, §3.2) is structural and keeps recurring; each patch risks a new edge case (the very churn that motivated #733).
- **Scores:** Fit 3 · Risk 5 · Effort 5 · Maintainability 2 · Fixes-backlog 2.
- **Verdict:** the status quo. Good as a *stopgap* (ship #610 now) but does not satisfy #733.

### Option 2 — In-house rewrite: proper lexer + thin clause/nesting parser, same API *(RECOMMENDED)*
Replace the innards of `NewScanner`/`ToAST` with (a) a real tokenizer that tracks string-literal / identifier / comment state as a state machine (killing the whole class of §3.1/§3.4 lexer bugs), and (b) a small recursive-descent parser that understands **only** the clause skeleton and nesting (subquery, IN-list, JOIN, CTE) — exactly the §2 contract — while keeping `EvalAST` and `PrintAST` **byte-for-byte compatible**. The lexer may optionally be built with `participle`'s stateful lexer (§Option 4) or `text/scanner`; the *parser* stays hand-written because the target AST is bespoke.

- **Pros:** directly fixes both root causes (lexer state + nesting). Keeps the public contract, so the six AST-consuming handlers and all macro code are untouched. No large foreign dependency. Team owns the grammar and can special-case `$`-macros as first-class tokens (which no general library does). Can drop the fragile `tableFuncRe` whitelist in favor of "identifier immediately followed by `(` in FROM position = table function".
- **Cons:** it *is* a rewrite of the hardest 900 lines in the file (the `ToAST` loop + `parseJOIN`); reproducing the exact string normalization (§1.3) is finicky; needs the golden corpus to be trustworthy before the swap.
- **Scores:** Fit 5 · Risk 3 · Effort 2 · Maintainability 5 · Fixes-backlog 4.
- **Verdict:** **best fit for the actual contract.** The recommended path.

### Option 3 — Adopt `AfterShip/clickhouse-sql-parser` (the issue's first candidate)
Full ClickHouse SQL AST library. MIT, v0.5.1 (Apr 2026), ~239★, actively maintained, supports CTE/window/JOIN/subquery/multi-line comments, and round-trips via `clickhouse.Format()`.

- **Pros:** real grammar, real nesting, maintained upstream, would in principle understand every ClickHouse construct the plugin might see; comment support; formatter included.
- **Cons (decisive):**
  - **Its AST and `Format()` output are its own** — they will **not** match the plugin's `EvalAST`/`PrintAST` normalization (§1.3). Every one of the six AST-consuming handlers and every macro-injection routine would have to be rewritten against a foreign, richer AST → **larger** change than Option 2, not smaller.
  - It does **not** model Grafana `$`-macros (`$table`, `$columns(...)`, `$timeFilter`). Those are not valid ClickHouse; the library would reject or mis-lex them, forcing a pre-pass to stub macros out and splice back — reintroducing exactly the position-tracking fragility we're trying to remove.
  - Maturity caveat: community feedback explicitly says it "has a long way to go on the syntax compatibility level"; the plugin would inherit upstream gaps and be blocked on upstream fixes for ClickHouse-specific exotica.
  - New external dependency in the hot path of every query; version-pinning and supply-chain surface.
- **Scores:** Fit 2 · Risk 2 · Effort 2 · Maintainability 3 · Fixes-backlog 4.
- **Verdict:** **reject as the primary implementation.** Best *secondary* use: a **validation oracle** — parse the plugin's macro-*expanded* SQL (which is real ClickHouse, no `$`-macros left) with `AfterShip` in tests to assert the output is syntactically valid ClickHouse. That is high-value and low-risk.

### Option 4 — Grammar-generated: `participle` (the issue's second candidate), or ANTLR/goyacc
`participle` (MIT, v2, mature, LL(k), grammar-in-struct-tags, optional codegen lexer ~10× faster). ANTLR/goyacc = heavier generated grammars.

- **Pros:** `participle`'s **stateful lexer** is an excellent, well-tested tokenizer engine — usable *inside* Option 2 to replace `regexp2` for the lexing layer, with `$`-macros as explicit token classes and proper string/comment states. Declarative, testable.
- **Cons:** `participle` is **LL(k), no left recursion** — expressing full SQL expression precedence in it is awkward (a known pain for SQL grammars), and we don't need it anyway (§2 says no expression semantics). ANTLR pulls in a Java-toolchain codegen step and a large runtime; goyacc yields a hard-to-maintain LALR grammar and still needs a hand-written lexer. Building a *full* SQL grammar here is over-engineering for the minimal contract.
- **Scores** (as full-grammar approach): Fit 3 · Risk 2 · Effort 1 · Maintainability 3 · Fixes-backlog 4.
- **Verdict:** **do not build a full generated grammar.** **Do** consider `participle`'s lexer as the tokenizer inside Option 2 (that's the pragmatic sweet spot; it's why the maintainer listed it).

### Scoreboard
| Option | Fit | Risk | Effort | Maint. | Backlog | Recommendation |
|---|---|---|---|---|---|---|
| 1 Harden current | 3 | 5 | 5 | 2 | 2 | Stopgap only |
| **2 In-house lexer+parser** | **5** | **3** | **2** | **5** | **4** | **Chosen** |
| 3 AfterShip lib | 2 | 2 | 2 | 3 | 4 | Reject as primary; use as test oracle |
| 4 participle/ANTLR full grammar | 3 | 2 | 1 | 3 | 4 | Reject as full grammar; reuse participle *lexer* inside Opt. 2 |

---

## 5. Recommended phased migration plan

Guiding principles: **API frozen** (`ApplyMacrosAndTimeRangeToQuery`, `ToAST`, `EvalAST`, `PrintAST` signatures unchanged); **golden corpus before any behavioral change**; **each phase independently shippable and revertable**; **the new parser lands behind a flag and must be output-identical to the old one on the corpus before it becomes the default.** Each phase is sized ≤ ~1 week.

### Phase 0 — Golden corpus + oracle harness (≈1 week) — *ship first, no behavior change*
1. Build a corpus loader that collects every query from: (a) all `newASTTestCase` inputs in `eval_query_test.go`; (b) every `sql`/`query`/`rawSql` string in `docker/grafana/dashboards/*.json`; (c) a curated set of the §3 backlog constructs (both currently-passing and currently-failing, tagged).
2. Add a snapshot test: for each corpus query, record the current `(ToAST → PrintAST)` output **and** the current `ApplyMacrosAndTimeRangeToQuery` output (with a fixed `From/To/Interval`) into checked-in golden files. This freezes today's exact behavior — including its bugs — as the baseline.
3. Add the **AfterShip oracle** (test-only dep): assert that the macro-*expanded* SQL for each non-error corpus query parses as valid ClickHouse. This catches "we generated invalid SQL" independently of the plugin's own parser.
4. Deliverable: a red/green corpus. **No production code changes.** This phase alone is valuable and can merge on its own.

### Phase 1 — New tokenizer behind an interface, off by default (≈1 week)
1. Define an internal `tokenizer` interface matching what `ToAST`'s `Next()` loop consumes (token string + classification). Wrap the existing `regexp2` tokenizer as `legacyTokenizer` implementing it — **no behavior change**, corpus stays green.
2. Implement `stateTokenizer`: a hand-written (or `participle`-stateful-lexer-backed) scanner that tracks quote/identifier/comment state as a state machine. Classify `$`-macros, `#`/`#!` comments (closes #610), double-quoted identifiers (closes #121), word-boundary keywords (closes #256) as first-class tokens.
3. Gate selection with an env/config flag (default = legacy). Add a differential test: for every corpus query, assert `stateTokenizer` produces the same token stream as `legacyTokenizer` (except the *intended* fixes, which get explicit expected-diff entries).
4. Deliverable: two tokenizers, legacy still default, differential-tested. Shippable.

### Phase 2 — New clause/nesting parser behind the same interface, off by default (≈1.5 weeks)
1. Implement a recursive-descent `structParser` that consumes the token stream and emits the **existing `EvalAST` shape** (same keys: `root/with/select/from/prewhere/where/group by/having/order by/limit/format/union all/join/$macro`; same normalized leaf strings per §1.3). Model nesting properly: subquery-in-FROM, IN-list, JOIN source/ON/USING, ARRAY JOIN, CTE bodies — each as a real recursion, not `strings.Index`/`betweenBraces`. This is where §3.2/§3.3 get fixed and the value-vs-pointer panic (#799) is designed out (typed nodes internally, converted to `EvalAST` at the boundary).
2. Reproduce the operator re-spacing normalization exactly (write a small normalizer unit-tested against the AST-leaf strings already asserted in `eval_query_test.go`).
3. Gate with the same flag. **Acceptance gate: new parser must produce byte-identical golden output to legacy on all currently-green corpus entries**, and must additionally turn the tagged §3 failing cases green.
4. Deliverable: full new parser, still opt-in, corpus-verified equal-or-better. Shippable.

### Phase 3 — Flip the default + burn-in (≈0.5 week)
1. Flip the flag: new parser is default; legacy retained behind the flag as a one-release safety valve.
2. Run the full suite: `go test ./pkg/...`, `npm run test`, `npm run e2e` (dashboards exercise the resource handlers end-to-end).
3. Monitor / dogfood one release cycle. Deliverable: new parser is default; legacy removable next release.

### Phase 4 — Backlog cleanup + delete legacy (≈1 week)
1. With a nesting-aware parser in place, land the fixes that were structurally impossible before: `$columns`/`$rate` GROUP BY injection over IN-subqueries/JOIN (#565/#277/#38), CTE label-column preservation (#871/#319), `$adhoc` glue-word (#804/#779), `$conditionalTest` arg-splitter (#869/#49), empty-query FORMAT (#837), drop the table-function whitelist (#130/#480).
2. Delete `legacyTokenizer`/legacy `ToAST` and the flag. Remove `regexp2` if no longer used elsewhere.
3. Deliverable: single implementation, backlog cleared, `regexp2` dependency potentially gone.

**Total: ≈4–6 weeks.** Phases 0 and 1 are pure risk-reduction and ship independently; the irreversible flip is Phase 3, fully gated by Phase 0's corpus.

---

## 6. Test plan

- **Golden snapshot corpus** (Phase 0): `ToAST→PrintAST` and `ApplyMacrosAndTimeRangeToQuery` outputs for every query in the test suite + `docker/grafana/dashboards/*.json` + tagged backlog cases. This is the primary regression gate; the new parser must match it (minus intended fixes).
- **Differential tests** (Phases 1–2): legacy vs. new tokenizer token streams; legacy vs. new AST, per corpus query, with an explicit allow-list of intended behavioral diffs (each tied to an issue number).
- **AfterShip oracle** (Phase 0, test-only): every macro-expanded query must parse as valid ClickHouse.
- **Backlog regression tests**: one focused test per §3 issue that is intended to be fixed, asserting the *correct* generated SQL (not just "no error").
- **Existing suites unchanged**: `TestScannerAST`, `TestMacrosBuilder`, the time-filter tests must stay green throughout (they're part of the corpus).
- **E2E**: `npm run e2e` against the Docker Grafana+ClickHouse, driven by the existing dashboards, validates the six resource handlers (adhoc filters, autocomplete) against a live server.
- Commands: `go test ./pkg/eval/... ./pkg/...`, `npm run test`, `npm run lint`, `npm run e2e`.

---

## 7. Risks & open questions

**Risks**
1. **Silent output drift (highest).** AST leaf strings are a normalized form consumed by adhoc injection + `PrintAST` → executed SQL. A subtle normalization difference ships wrong-but-valid SQL that tests may not catch. *Mitigation:* byte-exact golden gate before the flip; AfterShip oracle for validity.
2. **Reproducing bug-for-bug behavior.** Some downstream code (or user dashboards) may depend on current quirks. *Mitigation:* corpus freezes current behavior; intended diffs are explicit and issue-tagged.
3. **`regexp2`→state-machine lexer parity** on pathological inputs (quote-heavy lines, CRLF, unicode `\xA0`). *Mitigation:* differential tokenizer tests over the corpus; fuzz the lexer.
4. **Interpolation ordering (#815/#797)** is an *architectural* issue partly outside the parser (template-var apply vs. macro expansion order). A parser rewrite alone won't fix it; scope it separately.
5. **Scope creep** toward a full SQL engine. *Mitigation:* hold the line at the §2 minimal contract; no expression semantics.

**Open questions (for the maintainer / Slach)**
1. Is the exact `PrintAST` output format (spacing/normalization) a contract we must preserve, or are downstream consumers tolerant of a reformatted-but-equivalent output? (Determines how strict the golden gate must be.)
2. Should `#`/`#!` comments (#610) be folded into this rewrite, or shipped first as the small Option-1 patch (recommended: ship #610 now, independently)?
3. Is a test-only dependency on `AfterShip/clickhouse-sql-parser` (oracle) acceptable, given the issue lists it as a candidate?
4. Should the fragile interpolation-vs-macro ordering (#815/#797) be tackled in this epic or tracked separately? (Recommend: separate.)
5. Milestone reality check: #733 is filed under 3.5.0 but is a 4–6 week epic — confirm it's the flagship item for that milestone (the milestone appears to be essentially this rewrite plus #610).

---

## 8. Key file:line references
- `pkg/eval/eval_query.go:166` — `ApplyMacrosAndTimeRangeToQuery` (primary entry)
- `pkg/eval/eval_query.go:1528-1544` — `EvalQueryScanner`, `NewScanner`
- `pkg/eval/eval_query.go:1550-1579` — `Next()` (tokenizer step; error origin `:1556-1559`)
- `pkg/eval/eval_query.go:1637-1793` — `ToAST()` (the hand-rolled AST loop — the rewrite target)
- `pkg/eval/eval_query.go:1795-1915` — `parseJOIN` (the other hard part)
- `pkg/eval/eval_query.go:1489-1526` — `EvalAST` (the public AST contract)
- `pkg/eval/eval_query.go:2284-2411` — `PrintAST` (AST → SQL serializer)
- `pkg/eval/eval_query.go:1949-2076` — token regexes (`commentRe`, `statementRe`, `joinsRe`, `tableFuncRe`, `macroFuncRe`, `tokenReComplied`)
- `pkg/eval/eval_query.go:2247-2281` — `betweenBraces`/`betweenSquareBraces` (the non-recursive nesting heuristics to replace)
- `pkg/eval/eval_query.go:651-677` — `findKeywordOutsideBrackets` (heuristic clause finder to replace)
- `pkg/eval/eval_query_test.go:857-1869` — `TestScannerAST` (~29 expected-AST cases → corpus seed)
- `pkg/eval/eval_query_test.go:781-855` — `astTestCase` / `CheckASTEqual` (deep AST compare harness)
- `pkg/resource_handlers.go:292,329,472,568,720,976` — the six `NewScanner`/`ToAST` AST consumers
- `pkg/resource_handlers.go:392,633,1044` — `PrintAST` round-trip sites (adhoc injection)
- `pkg/datasource.go:65` — live-query macro expansion
- `docker/grafana/dashboards/*.json` — real-query golden corpus (issue-named regression dashboards)
- Removed TS parser: commits `185d08b5` (remove scanner.ts), `e9dc1307`, `162344cf` — confirms Go is now the only parser.
