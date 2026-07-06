# Repository Health Audit — July 2026

Deep audit of the Altinity ClickHouse Grafana datasource plugin, identifying problem areas, refactoring opportunities, and the highest-leverage investment points.

- **Date:** 2026-07-06, branch `issue-908-ci-grafana-13` (master-equivalent + #908 fix).
- **Method:** five parallel research passes (Go backend, frontend core, frontend UI + tests, infrastructure/CI/build, and a meta-synthesis of the 20 deep-dive documents in `docs/issue-analysis/`), followed by **manual verification of every critical claim** — several agent findings were rejected as false positives (see §8).
- **Companion documents:** per-issue deep dives live in [`docs/issue-analysis/`](./issue-analysis/); the parser rewrite (#733) is fully scoped in [`733-rewrite-sql-parser.md`](./issue-analysis/733-rewrite-sql-parser.md) and is *not* re-derived here.

---

## 1. Executive summary

The codebase is functional, actively maintained (291 commits in the last 12 months, healthy PR flow), and its dependencies are essentially current (`go 1.26.3`, `grafana-plugin-sdk-go` one patch behind latest, `@grafana/*` 13.1.0). The problems are structural, and they **concentrate in exactly the four files that change most often**:

| File | Size | Changes since 2025-01 | Unit tests |
|---|---|---|---|
| `src/datasource/datasource.ts` | 1071 lines | **51** | partial (smoke only) |
| `pkg/eval/eval_query.go` | 2447 lines | 13 | good (2544-line suite) |
| `pkg/resource_handlers.go` | 1079 lines | 14 | **none** |
| `src/datasource/helpers/index.ts` | 540 lines | 14 | yes |

Change-frequency × size × missing tests = where bugs are born. Everything below is, one way or another, about de-risking these hotspots.

**Three verified, shipped bugs** were found during this audit (§2). **One security-relevant design flaw** exists in adhoc filter value handling (§2.3). The **test pyramid is inverted**: ~14 000 lines of slow Selenium/TestFlows E2E vs. a thin unit layer, with zero unit tests for the 6 HTTP resource handlers and effectively one test file for the entire `src/views/` UI layer. **CI has real gaps**: no Go static analysis at all, a dead (never-executing) E2E section, and no coverage gates. **Developer documentation actively misleads**: `CLAUDE.md` describes a Playwright E2E suite that does not exist and is itself excluded from version control.

The single largest strategic finding (from the issue-corpus synthesis): **at least ~50 historical issues trace back to three subsystems independently *guessing* types and quoting** — template-variable interpolation guesses from variable config, adhoc filters guess from the value's regex shape, and macros guess by re-parsing SQL text. Consolidating type/quoting decisions into one canonical, schema-informed path is the highest-value medium-term investment in the repository, alongside the already-scoped #733 parser rewrite.

---

## 2. Verified bugs and security findings (fix now)

Every item in this section was confirmed by direct code reading, not just agent report.

### 2.1 `toLogs.ts` — `omitBy` callback missing `return` (correctness bug)

`src/datasource/sql-series/toLogs.ts:135-137`:

```ts
const data = omitBy(ser, (_value: any, key: string) => {
  labelFields.includes(key);   // <-- no return: callback is always undefined/falsy
});
```

`omitBy` therefore omits **nothing**, and label fields are never separated from log data fields. Line 129 directly above uses the correct expression-body form with `pickBy`, which is what makes this a classic copy-edit slip. **Effort: S. Impact: logs field separation silently broken.**

### 2.2 `datasource.ts` — dead trace-ID branch in `getLogRowContext`

`src/datasource/datasource.ts:240`: `let traceId;` is declared and **never assigned**; the entire `if (traceId)` branch (~20 lines building a trace-scoped context query) is unreachable. Either the trace-ID extraction from `row` was never wired up, or the branch should be deleted. **Effort: S–M (decide: implement or remove).**

### 2.3 `pkg/adhoc/adhoc_filters.go` — raw value passthrough (security-relevant)

`pkg/adhoc/adhoc_filters.go:61-64`: if a string filter value already contains `'` or `, `, it is emitted into SQL **verbatim, unquoted**:

```go
if regexp.MustCompile(`^\s*\d+(\.\d+)?\s*$`).MatchString(v) ||
    strings.Contains(v, "'") ||
    strings.Contains(v, ", ") {
    value = v // used as-is
```

and line 78 interpolates the **field name unescaped**: `fmt.Sprintf("%s %s %s", parts[2], operator, value)`.

This is partly *deliberate* (lets users pass pre-quoted IN-lists like `'a','b'`), but the threat model matters: **adhoc filter values are settable by dashboard *viewers*, including via URL parameters (`var-adhoc=...`)**, while the query executes with the datasource's credentials. A viewer can therefore inject arbitrary SQL tail (`x' OR '1'='1`, `UNION SELECT ...`) without editor rights. Note this is distinct from the query editor, where users can already type arbitrary SQL by design.

**Fix direction:** stop guessing from value shape; make quoting type-aware via `system.columns` (this is exactly Theme A, §4.1, and the in-flight direction of #794/#678). Interim hardening: always escape-and-quote strings, backtick-quote the column identifier, support IN-lists explicitly for the array case instead of via raw passthrough. **Effort: S interim / M proper. Impact: high.**

### 2.4 `pkg/resource_handlers.go` — unchecked type assertions (panic vectors)

Verified at `pkg/resource_handlers.go:345, 346, 362` (and reported at `:604`):

```go
for ast.HasOwnProperty("from") && ast.Obj["from"].(*eval.EvalAST).Arr == nil {  // :345 panics before...
    nextAst, ok := ast.Obj["from"].(*eval.EvalAST)                              // :346 ...this ok-check runs
```

The ok-checked assertion at `:346` is dead protection — the loop *condition* at `:345` performs the same assertion unchecked and panics first. `:362` chains two unchecked assertions plus an unchecked `Arr[0]` index. These are reachable from the HTTP resource API with user-supplied SQL. This is the same defect class that already shipped as panics #799, #859, #860. Repo-wide, production Go code contains **~83 single-form type assertions**. **Fix: small set of safe AST-navigation helpers (`fromClause(ast) (*EvalAST, error)` etc.) + a sweep. Effort: S–M. Impact: crash class eliminated.**

### 2.5 CI: E2E section is dead scaffolding

`.github/workflows/ci.yml:86-112`: the "Check for E2E" step looks for a `cypress/` directory that does not exist in this repo, so every E2E step silently skips on every PR; additionally the artifact-upload condition references `steps.run-e2e-tests.outcome`, but no step has `id: run-e2e-tests`, so it can never fire. This is leftover plugin-template scaffolding, and it means **no E2E runs gate PRs at all** (TestFlows runs in a separate workflow). **Fix: delete the section (or wire a real smoke E2E); document that TestFlows is the E2E gate. Effort: S.**

### 2.6 Error-swallowing sweep (backend)

13 occurrences of `body, _ := json.Marshal(response)` in `pkg/resource_handlers.go` (`:422, :432, :452, :487, :536, :546, :560, :571, :607, :700, :722, :906, :1071`) plus one in `pkg/requests/request_response.go:26`. On marshal failure the frontend receives an empty/invalid body with no log line. **Effort: S (mechanical). Impact: debuggability.**

---

## 3. High-priority code-quality findings

### 3.1 Backend (`pkg/`)

| Finding | Location | Notes | Effort/Impact |
|---|---|---|---|
| **Query-building logic duplicated 3×** | `resource_handlers.go` — `handleCreateQuery` (:258), `handleProcessQueryBatch` (:522, 186 lines), `handleCreateQueryWithAdhoc` (:918, 162 lines) | Time parsing + macro expansion + AST creation copy-pasted; adhoc-injection duplicated in 3 handlers. ~250 duplicated lines. Every parser/adhoc fix must land in 3 places. | M–L / 4 |
| **Zero unit tests for 6 of the most complex files** | `resource_handlers.go`, `streaming.go`, `client.go`, `datasource.go`, `query.go`, `adhoc/` | Only `eval`, `response`, `datasource_settings` are tested. Handlers are pure JSON-in/JSON-out — cheaply testable. | L / 4 |
| `reflect.ValueOf(value).Float()/.String()` on unexpected types | `parser.go:222, :240` | Panics if a ClickHouse response contains an unexpected type in the default branch. | S / 3 |
| Streaming error loop lacks backoff | `streaming.go:212-278` | Repeated failing queries emit error frames at full tick rate. | S / 1 |

### 3.2 Frontend core (`src/datasource/`, `src/utils/`)

| Finding | Location | Notes | Effort/Impact |
|---|---|---|---|
| **`CHDataSource` god class** | `datasource.ts` (1071 lines, 51 changes/18 mo) | Streaming, logs context, variables, annotations, adhoc, query building, response processing in one class. Extract `LogContextManager`, streaming handler, variable-query handler. | L / 4 |
| `_toFieldType` duplicated | `sql_series.ts:73-106` vs `toLogs.ts:51-84` | Two diverging copies of the type mapper (see Theme A). | S / 3 |
| ~40 lines of `console.log` in streaming path | `datasource.ts:608-647` | Debug logging left in production hot path. | S / 2 |
| Swallowed errors | `adhoc.ts:169-173` (tag values → silent `[]`), `indexedDBManager.ts` (multiple catch-and-continue) | Users can't distinguish "no data" from "failed". | M / 2 |
| `any`-typing | 207 uses of `: any`/`as any` in `src/` (81+ in datasource core), 32 lint/ts suppressions | Blocks safe refactoring of the god class; do the typing pass *before* decomposition. | L / 3 |
| Ineffective guard | `datasource.ts:419` sets `result = []` for empty meta, then `:477` unconditionally overwrites | Misleading control flow. | S / 1 |

### 3.3 Frontend UI (`src/views/`)

| Finding | Location | Notes | Effort/Impact |
|---|---|---|---|
| **Autocomplete data duplicated across two giant hand-maintained files** | `editor/autocompletions/functions.ts` (2082 lines, ~331 documented functions) vs `editor/constants/funcs.ts` (1249 lines, ~1247 names) | Both feed Monaco (tokenizer vs suggestions) with no cross-coverage check; both go stale independently as ClickHouse adds functions. Generate both from one source (`system.functions` snapshot at build time). | M / 4 |
| **`QueryEditor` / `QueryEditorVariable` near-twins** | `QueryEditor.tsx:16-103` vs `:105-196` | ~170 duplicated lines; differences: init function + one prop. Merge with a mode prop. | M / 3 |
| **`initializeQueryDefaults` / `...ForVariables` twins** | `helpers/initializeQueryDefaults.ts:4-112` vs `:114-222` | 109-line duplication; one real difference (`datasourceMode`). | S / 2 |
| 4+ `useEffect` deps suppressed with `eslint-disable` | `QueryEditor.tsx:28, :53`, `hooks/useQueryState.ts:82`, `SQLCodeEditor.tsx:19` | Stale-closure risk in query state sync — the flakiest area of the UI per issue history. | M / 3 |
| Identifier interpolation by string concat | `QueryBuilder/hooks/useConnectionData.ts:27, :33-37, :49-50, :118-122` | *Correctness* bug (DB/table names with quotes break the builder), **not** a security boundary — editor users can already run arbitrary SQL. Escape identifiers. | S / 2 |
| 8 copy-pasted Select blocks | `ConfigEditor/FormParts/DefaultValues/DefaultValues.tsx:216-305` | Loop over a config array instead. | S / 2 |
| Debug `console.log` | `helpers/initializeQueryDefaults.ts:99` | Remove. | S / 1 |
| Convoluted Monaco init latch | `SQLCodeEditor.tsx:22-42` | `initialized` flag + `setTimeout(20ms)` theme hack + `window.monaco` via `@ts-ignore`. Works (one-shot latch — the reported "infinite loop" was a false positive), but should be a `useRef` + proper monaco handle. | S / 1 |

### 3.4 Tests

- **Frontend:** 8 test files total; `src/views/` has **one** (`getAdHocFilters.test.ts`) for ~7500 lines of UI code. Untested critical paths: query state initialization, Builder↔SQL mode switching, `useConnectionData` fetch logic, Monaco integration, config-editor fetch/permission handling.
- **Backend:** `pkg/eval` is well tested; the six resource handlers (the plugin's HTTP API surface) have zero tests despite being pure JSON transformations.
- **Coverage reporting is misleading:** the "71%" headline collects only ~18 files under the default jest config; true project-wide line coverage is closer to ~43% (per #785 analysis). No `coverageThreshold` is set in jest config; no Go coverage gate in CI.
- **E2E:** TestFlows (Python/Selenium, ~14k lines of test code excluding venv, 17 suites, 66 regression dashboards, ~60 min per Grafana version) runs in its own workflow and does not gate PRs. It is the *only* real E2E. `tests/testflows/` locally accumulates ~216 MB of untracked artifacts (venv 195 MB, tmp, coverage) — not in git, but worth a cleanup script / README note.

### 3.5 Infrastructure / CI / docs

| Finding | Location | Notes | Effort/Impact |
|---|---|---|---|
| **No Go static analysis anywhere in CI** | `ci.yml`, `release.yml` | No `golangci-lint`, no `go vet`. Given §2.4's panic class, `govet` + `errcheck` + `staticcheck` would have flagged real shipped bugs. | S / 4 |
| **`CLAUDE.md` describes a non-existent Playwright suite and is gitignored** | `CLAUDE.md` (large "E2E Testing with Playwright" section), `.gitignore:75` | There is no `playwright.config.ts`, no `tests/e2e/*.spec.ts`; `npm run e2e` invokes `grafana-e2e` (Cypress-based) with a bare `cypress.json` (`{"video": false}`) and no specs. Developers and AI agents are actively misdirected. Rewrite the testing section around Jest + TestFlows; remove `CLAUDE.md` from `.gitignore` so it's versioned. | S–M / 4 |
| Dead cypress E2E steps in PR CI | `ci.yml:86-112` | See §2.5. | S / 3 |
| Node version drift | `ci.yml` Node 22 vs `testflows.yml:199` Node 20; action majors mixed (v4–v7) across workflows | Standardize. | S / 2 |
| No coverage thresholds | jest config, Coveralls `fail-on-error: false`, no `go tool cover` gate | Ties into #785 (71%→85% goal is meaningless until `collectCoverageFrom` is pinned). | S / 3 |
| No issue templates | `.github/` | Structured bug reports would help triage the parser/quoting bug flow. | S / 2 |
| `docs/` undiscoverable | no index, not linked from README | Add `docs/README.md` index. | S / 1 |
| `.DS_Store` not ignored | `.gitignore` | Add `**/.DS_Store`. | S / 1 |

---

## 4. Cross-cutting themes — where effort pays most

Synthesized from the 20-document issue corpus plus this audit. These are the *root causes*; the tables above are their symptoms.

### Theme A — One canonical type-resolution path *(highest strategic value after #733)*

**Root cause:** quoting/formatting/typing decisions are made from heuristics in ≥4 independent places: `toTable.ts:_toJSTypeInTable` (strict whitelist), `sql_series.ts`/`toLogs.ts` `_toFieldType` (permissive, duplicated), `response.go:NewDataFieldByTypeOptimized` (intermediate), and adhoc's numeric-regex guess (`adhoc_filters.go:61`). **Issue cluster:** #794, #678, #793, #788, #781, historical #832/#859/#860. **Investment:** consolidate into one schema-informed resolver (backend `system.columns` lookup with fallback), feed adhoc, frame generation, and table output from it. **Effort:** M–L (~3–5 days). Unblocks three open milestone issues at once.

### Theme B — Executable interpolation contract (the 47-issue quoting saga)

**Root cause:** no written contract for whether `$var` is an identifier or a literal; three subsystems guess independently; five documented behavior flip-flops since 2019, each breaking a different user cohort (#905 vs #809 being the latest collision). **Investment:** a table-driven contract test (variable type × syntactic context × value type × operator) as the single source of truth in CI, then consolidate interpolation into one module with rules-as-data. **Effort:** M (~2–3 days). Design already drafted in `docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md`; PR #906 is the tactical first step.

### Theme C — Frontend/backend query-path divergence

**Root cause:** the plugin overrides `query()` client-side (raw HTTP → JS transforms), so Grafana server-side features (SQL Expressions #820, alerting-consistent frames, data links #432, proper labels #788) see different frames than panels do. **Investment, phase 1 (M, 2–3 days):** make backend `QueryData` frames dataplane-conformant (one wide frame per table, `Frame.Meta.Type` stamped). **Phase 2 (L, weeks, after #733):** progressively route simple formats through the backend path.

### Theme D — Parser rewrite (#733)

Fully scoped in [`733-rewrite-sql-parser.md`](./issue-analysis/733-rewrite-sql-parser.md): in-house state-machine lexer + recursive-descent clause parser behind the frozen `EvalAST`/`PrintAST` contract, golden corpus first, AfterShip as test oracle only. 4–6 weeks phased. Gates #678 phases 2–5 and Theme C phase 2. The §2.4 safe-AST-helpers work is a *prerequisite-compatible* quick win, not a substitute.

### Theme E — Deduplicate the hotspots

`resource_handlers.go` 3× query-building, `datasource.ts` god class, `QueryEditor` twins, `initializeQueryDefaults` twins, `_toFieldType` twins, autocomplete double-file. Roughly **~1000 lines of duplication** concentrated in the four hotspot files. Each dedup directly reduces the "fix it twice/thrice" failure mode that the issue history repeatedly shows.

### Theme F — Errors must surface

Silent `catch`/`_ =` across backend marshal calls, adhoc tag loading, IndexedDB, JWT header path (#622), generic "Unexpected error" on batched panel failures (#846). One consistent error-classification pass (user-visible vs retry vs log) is ~1–2 days and materially cuts support burden.

### Theme G — Right-side-up test pyramid

Order of operations: (1) pin `collectCoverageFrom` + thresholds (hours); (2) unit-test the resource handlers (pure JSON I/O — days, huge de-risking for both #733 and Theme A); (3) contract tests from Theme B; (4) only then grow E2E. A TestFlows→Playwright migration is **not** recommended now — 14k lines of working coverage is an asset; revisit after 3.5.0.

---

## 5. Priority matrix

### Tier 0 — hours each, do immediately
1. Fix `toLogs.ts:135` missing `return` (§2.1) + add a regression test.
2. Resolve `traceId` dead branch (§2.2) — implement or delete.
3. Interim adhoc hardening (§2.3): always-quote strings, backtick field names, explicit IN-list handling.
4. Safe AST helpers + fix `:345/:362/:604` (§2.4).
5. `json.Marshal` error sweep (§2.6).
6. Delete dead E2E section in `ci.yml` (§2.5).
7. Remove debug `console.log`s; add `.DS_Store` to `.gitignore`; un-ignore `CLAUDE.md`.

### Tier 1 — days each, high leverage
1. `golangci-lint` + `go vet` in CI (catches §2.4's class permanently).
2. Rewrite `CLAUDE.md` testing sections to match reality (Jest + TestFlows; no Playwright).
3. Unit tests for `resource_handlers.go` (JSON in/out; also the safety net for Theme A/E refactors).
4. Extract shared query-building from the 3 handlers (Theme E).
5. Jest `collectCoverageFrom` + thresholds; Node/action version alignment in workflows.
6. Theme B contract test + land PR #906 with migration notes.
7. Merge the `QueryEditor` and `initializeQueryDefaults` twins.

### Tier 2 — 1–2 weeks each
1. Theme A type-resolution consolidation (unblocks #794, #678 phase 1, #793, #788).
2. Theme C phase 1 (backend frame conformance; likely closes #820's main gap).
3. `datasource.ts` decomposition (typing pass first, then extract log-context/streaming/variables).
4. Autocomplete generation from `system.functions` (kills the 3331-line double file).

### Tier 3 — epics (sequence deliberately)
1. **#733 parser rewrite** (4–6 weeks, phased, golden-corpus-gated) — the flagship of milestone 3.5.0; gates #678 full fix and Theme C phase 2.
2. Theme C phase 2 (query-path unification) — only after #733.
3. TestFlows evolution (parallelization #786 first; migration decision deferred).

**Suggested sequencing logic:** Tier 0 + Tier 1 items 1–3 form one "stabilization week" and are prerequisites that make every later refactor safer. Theme A before #793/#794 fixes; Theme B before touching interpolation again; #733 Phase 0 (corpus) can start in parallel with everything else since it changes no production code.

---

## 6. What is *not* broken (explicitly)

- **Dependencies are current:** `go 1.26.3`, `grafana-plugin-sdk-go` v0.292.1 (latest is v0.292.2, 2026-06-30), `@grafana/*` 13.1.0, React 19, Jest 30 — all fine for mid-2026. No dependency emergency exists.
- **`pkg/eval` test suite** is genuinely strong (2544 lines, ~29 full-AST cases) and is the foundation the #733 golden corpus builds on.
- **Docker dev environment** is mature: multi-version Grafana, multiple ClickHouse instances, Selenium, coverage-instrumented builders, 66 regression dashboards that double as a real-query corpus.
- **TestFlows E2E**, while slow and post-merge-only, provides real multi-version coverage that most Grafana plugins lack.
- **PR flow is healthy:** #610, #905/#906, #816, #908 all have open PRs as of this audit.

## 7. Metrics snapshot (2026-07-06)

| Metric | Value |
|---|---|
| Go production code | 5 832 lines (13 files); 4 test files |
| Frontend production code | ~11 100 lines; 8 test files |
| `any` usages in `src/` | 207 (+32 lint/TS suppressions) |
| Unchecked-style type assertions in `pkg/` | ~83 |
| Open issues / PRs | 17 / 7 |
| Milestone 3.5.0 open issues | 14 (incl. #733 epic) |
| TestFlows | 17 suites, ~14k lines, ~60 min/Grafana version |
| Change hotspot #1 | `datasource.ts` — 51 changes since 2025-01 |

## 8. Rejected findings (agent claims that did not survive verification)

Kept for transparency; do **not** act on these:

1. **"Go 1.26 does not exist / builds broken"** — false; stale model knowledge. Go 1.26 shipped Feb 2026; local toolchain is `go1.26.3`, matching `go.mod`.
2. **"grafana-plugin-sdk-go v0.292.1 is old (late 2024)"** — false; it is one patch behind the latest v0.292.2 (2026-06-30).
3. **"Infinite loop in `SQLCodeEditor` useEffect"** — false; the `initialized` flag is a one-shot latch (effect early-returns after the first initialization). It is a code smell, not a loop.
4. **"SQL injection in `useConnectionData` (critical)"** — downgraded to correctness: the query *editor* is an arbitrary-SQL surface by design for its users; unescaped identifiers there break functionality but don't cross a privilege boundary. The genuine privilege-boundary issue is the backend adhoc path (§2.3).
5. **"React 19 / Jest 30 / TS 5.9 too new/risky"** — date-confused agent reasoning; all are mature as of mid-2026.
6. Various date attributions ("@swc pinned since early 2024" etc.) were unreliable and are excluded; only structural dependency findings were retained.
