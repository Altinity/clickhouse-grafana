# Issue #785 — Improve target coverage from 71% to 85%

Data-driven coverage-gap analysis and test-writing plan for the codebase at
`/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend in `src/`, Go backend in `pkg/`).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/785>
- Status at time of writing: **OPEN**, author `Slach` (Eugene Klimov), opened 2025-05-05. Body is one line: *"let's add more unit tests"*. **No comments.** Title: *"improve target coverage form 71% to 85%"*.
- The issue does not state whether "71%→85%" is frontend Jest, Go, or both. It says "unit tests" and gives a single number, so it most plausibly refers to a **single frontend Jest number** measured with the project's default jest config at the time the issue was filed (see §1 for why, and why the number is denominator-sensitive).

---

## 0. TL;DR

- **The "71%" and "85%" numbers are only meaningful relative to a denominator, and this repo has no pinned coverage denominator.** `jest.config.js` / `.config/jest.config.js` define **no `collectCoverageFrom`**, so `npm run test:coverage` only instruments files that tests happen to `import`. That produces a flattering number over a tiny slice of the code.
- **Three measured numbers (all real, 2026-07-04, same commit):**
  | Measurement | Statements | Lines | Denominator |
  |---|---|---|---|
  | `npm run test:coverage` (default config, imported-files-only) | **85.99%** (964/1121) | 85.70% | 18 files |
  | Same, but `--collectCoverageFrom='src/**/*.{ts,tsx}'` (whole project) | **43.27%** (1187/2743) | 43.41% | 71 files |
  | Go `go test ./pkg/... -cover` | **47.6%** of statements | — | 5 packages |
- **Interpretation:** the default-config number (86%) already exceeds the 85% target, but that is an artifact — it ignores ~53 source files (all of `src/views/`, `datasource.ts`, `src/utils/`). The *honest* project-wide frontend number is **43%**. The realistic reading of #785 is: **pin a project-wide `collectCoverageFrom`, then raise whole-project frontend statement coverage from ~43% toward 85%** (and optionally lift Go from 47.6%). If the maintainer only wants the default-config number to hit 85%, that is *already met* and the issue can be closed with a note — this should be confirmed first (see §7 Risk R1).
- **Top-5 highest-leverage frontend files** (by uncovered statements, whole-project run):
  1. `src/datasource/datasource.ts` — 7.6%, **379 uncovered** stmts (1036 LOC). Mixed pure/async.
  2. `src/utils/indexedDBManager.ts` — 2.8%, **243 uncovered** (250 LOC). Needs `fake-indexeddb`.
  3. `src/datasource/adhoc.ts` — 36.3%, **58 uncovered** (91 stmts). Promise-based, mockable.
  4. `src/views/QueryEditor/QueryEditor.tsx` + hooks (`useConnectionData`, `useAutocompletionData`, `useSystemDatabases`, `useQueryState`, `useFormattedData`) — 0–20%, **~200 uncovered** combined. React hooks/components.
  5. `src/views/ConfigEditor/**` (`ConfigEditor.tsx`, `DefaultValues.tsx`, `DefaultValues.api.ts`) — **0%, 140 uncovered**. React components + one pure api helper.
- **Effort estimate to reach ~85% project-wide statements:** ~**6–8 work packages of ~1 day each** (see §4). Roughly 3 "easy pure-logic" packages get the biggest gain per hour; the rest are React-component/hook packages that need `@testing-library/react` + Grafana runtime mocks.

---

## 1. Why the number is ambiguous (methodology-critical)

Statement/line coverage = `covered / total`, and `total` is the set of instrumented files. Istanbul (via jest) instruments **only files that are loaded during the test run** unless you force a static set with `collectCoverageFrom`.

- `jest.config.js` extends `.config/jest.config.js`. Neither sets `collectCoverageFrom` (grep-verified). So the default `--coverage` run instruments **18 files** — exactly the files transitively imported by the 15 existing test files.
- Result: the 86% figure describes only `src/datasource/**` + a couple of helpers. `src/views/` (7754 LOC) and `datasource.ts` (1036 LOC) are **not in the denominator at all**.
- The issue's "71%" almost certainly came from a run like this at an earlier commit (fewer files, different import graph). It is not reproducible today because the codebase and test set have changed. **Do not anchor on reverse-engineering exactly 71%.** Anchor on: *pick a denominator, publish it, drive it up.*

**Recommended denominator to adopt** (and the one used for all "whole-project" numbers below):

```
collectCoverageFrom:
  'src/**/*.{ts,tsx}'
  '!src/**/*.{test,spec,jest}.{ts,tsx}'
  '!src/**/__mocks__/**'
  '!src/**/*.d.ts'
```

Optionally also exclude the two pure static-data files (see §3.1) since they carry almost no statements and no logic. Note that adding this `collectCoverageFrom` is itself a **code change to `jest.config.js`** and is out of scope for the analysis (§7 R1) — but it is the first implementation step any test-writing agent must do, otherwise new tests on `src/views` files won't move the headline number.

### Note on static-data files (why big LOC ≠ big coverage weight)

`functions.ts` (2082 LOC) and `funcs.ts` (1249 LOC) are pure constant arrays. In statement terms they are tiny: `functions.ts` = **3 statements**, `funcs.ts` = **2 statements**. Importing them once already marks them ~33–50% covered. They inflate LOC totals but are irrelevant to statement coverage. Ignore them for prioritization (or exclude them).

---

## 2. Methodology (commands + date)

All measurements taken **2026-07-04** on branch `feature/advanced-logs-field-settings`, HEAD `78610c77`, with no source modifications. `coverage/` and `go_coverage` are git-ignored (`git check-ignore` verified); nothing was committed.

Environment note: `node_modules/.bin/` was empty in this checkout, so `jest` was invoked directly as `node node_modules/jest/bin/jest.js` (equivalent to `npm run test:coverage`). Agents in a normal shell should just use `npm run test:coverage`.

```bash
# Frontend — default config (imported-files-only denominator)
npm run test:coverage
#   → coverage/coverage-summary.json

# Frontend — whole-project denominator (the honest number)
node node_modules/jest/bin/jest.js --coverage \
  --collectCoverageFrom='src/**/*.{ts,tsx}' \
  --collectCoverageFrom='!src/**/*.{test,spec,jest}.{ts,tsx}' \
  --collectCoverageFrom='!src/**/__mocks__/**' \
  --collectCoverageFrom='!src/**/*.d.ts' \
  --coverageReporters=json-summary --coverageReporters=text-summary

# Go — per-package + per-function
go test ./pkg/... -coverprofile=go-cover.out
go tool cover -func=go-cover.out            # per-function
go tool cover -func=go-cover.out | tail -1  # total: 47.6%
```

Test run health at measurement time: **301/303 tests pass**, **2 suites fail** (see §7 R2). Coverage numbers are collected regardless of those 2 failures.

Existing frontend test files (15):
`src/spec/{adhoc-macro.test.ts, bigIntUtils.spec.ts, datasource-get-request-options.spec.ts, datasource-response-pairing.spec.ts, datasource.jest.ts, interval-interpolation.test.ts, response_parser.jest.ts, sql_series_specs.jest.ts}`,
`src/datasource/helpers/index.test.ts`, `src/datasource/log-context-query.test.ts`,
`src/datasource/sql-series/{logsFieldModes,toAnnotation,toLogs}.test.ts`,
`src/views/QueryEditor/helpers/getAdHocFilters.test.ts`,
`src/views/QueryEditor/components/QueryTextEditor/components/AdvancedLogsFields/AdvancedLogsFieldsModal.test.tsx`.

Existing Go test packages: `pkg/`, `pkg/adhoc/`, `pkg/eval/`.

---

## 3. Ranked coverage-gap table

### 3.1 Frontend — whole-project denominator, ranked by uncovered statements

Testability legend: **E** = pure logic, no mocking (easiest, best ROI); **M** = React component/hook, needs `@testing-library/react` + Grafana runtime mocks; **H** = needs environment shims (IndexedDB, Monaco) or heavy async orchestration.

| # | File | Stmts % | Uncovered | Stmts (cov/tot) | What lives there | Test |
|---|---|---:|---:|---|---|:--:|
| 1 | `src/datasource/datasource.ts` | 7.6% | **379** | 31/410 | Main `CHDatasource`: `query()`, `metricFindQuery`, `annotationQuery`, `getLogContextQuery`, `_getRequestOptions` (static, pure), `toggleQueryFilter`/`queryHasFilter` (pure), `processQueryResponse` (pure-ish), `simpleHash` (pure), `executeQueries` (async, mock fetch) | M/H (split: pure methods E, async M) |
| 2 | `src/utils/indexedDBManager.ts` | 2.8% | **243** | 7/250 | IndexedDB CRUD, TTL cleanup, per-datasource query-state cap, size stats | H (needs `fake-indexeddb`) |
| 3 | `src/views/ConfigEditor/FormParts/DefaultValues/DefaultValues.tsx` | 0.0% | 88 | 0/88 | Config UI: default DB/table/date/round fields, add'l settings | M |
| 4 | `src/views/QueryEditor/components/QueryBuilder/hooks/useConnectionData.ts` | 4.5% | 85 | 4/89 | Fetch DBs/tables/columns for query builder | M (mock datasource) |
| 5 | `src/views/QueryEditor/helpers/initializeQueryDefaults.ts` | 6.3% | 59 | 4/63 | Query default seeding, layout mode, format defaults | E/M (mostly pure) |
| 6 | `src/datasource/adhoc.ts` | 36.3% | 58 | 33/91 | `AdHocFilter`: `GetTagKeys`, `GetTagValues`, `processTagKeysResponse`, Enum parsing | M (Promise + mock `metricFindQuery`) |
| 7 | `src/views/QueryEditor/QueryEditor.tsx` | 18.8% | 56 | 13/69 | Top-level editor wiring | M |
| 8 | `src/views/QueryEditor/components/QueryTextEditor/editor/initiateEditor.ts` | 17.9% | 55 | 12/67 | Monaco language/tokenizer/autocomplete registration | H (Monaco runtime) |
| 9 | `src/views/QueryEditor/hooks/useAutocompletionData.ts` | 9.6% | 47 | 5/52 | Autocomplete data assembly | M |
| 10 | `src/views/ConfigEditor/ConfigEditor.tsx` | 0.0% | 35 | 0/35 | Datasource config editor shell | M |
| 11 | `src/views/QueryEditor/components/QueryBuilder/QueryBuilder.tsx` | 21.6% | 29 | 8/37 | Visual query builder | M |
| 12 | `src/views/QueryEditor/hooks/useSystemDatabases.ts` | 15.2% | 28 | 5/33 | System DB fetch hook | M |
| 13 | `src/views/QueryEditor/hooks/useQueryState.ts` | 16.1% | 26 | 5/31 | Query state reducer/hook | M |
| 14 | `src/views/QueryEditor/components/QueryHeader/helpers/findDifferences.ts` | 4.0% | 24 | 1/25 | Deep object diff for query-header change detection | **E** (pure) |
| 15 | `src/datasource/resource_handler.ts` | 8.0% | 23 | 2/25 | Backend resource-call wrapper | M (mock fetch) |
| 16 | `src/views/QueryEditor/components/QueryTextEditor/QueryTextEditor.tsx` | 30.3% | 23 | 10/33 | SQL editor container | M |
| 17 | `src/views/QueryEditor/components/QueryHeader/QueryHeader.tsx` | 21.4% | 22 | 6/28 | Query header toolbar | M |
| 18 | `src/utils/clickhouseErrorHandling.ts` | 12.5% | 21 | 3/24 | `isPermissionError`, `getPermissionErrorMessage` | **E** (pure) |
| 19 | `src/views/QueryEditor/components/QueryBuilder/components/UniversalSelectComponent.tsx` | 12.5% | 21 | 3/24 | Generic select | M |
| 20 | `src/views/QueryEditor/hooks/useFormattedData.ts` | 16.0% | 21 | 4/25 | SQL formatting hook | M |
| 21 | `src/views/QueryEditor/components/QueryTextEditor/SQLCodeEditor.tsx` | 25.9% | 20 | 7/27 | Monaco wrapper | H |
| 22 | `src/views/QueryEditor/components/QueryTextEditor/hooks/useQueryHandlers.ts` | 4.8% | 20 | 1/21 | Editor event handlers | M |
| 23 | `src/views/ConfigEditor/FormParts/DefaultValues/DefaultValues.api.ts` | 0.0% | 17 | 0/17 | Pure api-URL/params builder for defaults | **E** (pure) |
| 24 | `src/views/QueryEditor/helpers/detectVariableMacroIntersections.ts` | 10.5% | 17 | 2/19 | Detect `$var`/macro name collisions | **E** (pure) |

Files already ≥85% statements (small remaining gaps, low priority): `toTimeSeries.ts` (87.4%), `request-options.ts` (65.7% — see WP-A), `sql_series.ts` (87.0%), `response_parser.ts` (86.7%), `helpers/index.ts` (94.8%), `toLogs.ts` (91.8%), `bigIntUtils.ts` (94.1%), `logsFieldModes.ts` (99.2%), `AdvancedLogsFieldsModal.tsx` (93.8%).

### 3.2 Frontend coverage grouped by area (where the mass of the gap is)

| Area | Stmts % | Cov/Total | Note |
|---|---:|---|---|
| `src/datasource` | 61.9% | 854/1380 | Already decent; `datasource.ts` + `adhoc.ts` are the holes |
| `src/views/QueryEditor` | 33.5% | 311/928 | Big surface, mostly React/hooks |
| `src/views/ConfigEditor` | **0.0%** | 0/141 | Untouched entirely |
| `src/utils` | **3.6%** | 10/274 | Dominated by `indexedDBManager.ts` |
| `src/types` | 83.3% | 5/6 | n/a |

### 3.3 Go — per-package and per-file

Total: **47.6%** of statements. Test packages exist only for `pkg/`, `pkg/adhoc`, `pkg/eval`.

| Package | Coverage | Note |
|---|---:|---|
| `pkg/adhoc` (`adhoc_filters.go`) | **92.3%** | Well covered |
| `pkg/eval` (`eval_query.go`) | **79.6%** | Well covered (this is the SQL macro/AST engine) |
| `pkg/` (aggregate) | 14.1% | Dragged down by the files below |
| `pkg/requests` (`request_response.go`) | **0.0%** | No test |
| `pkg/timeutils` (`time_parsing.go`) | **0.0%** | No test — `ParseTimeRange` is pure, easy |

Per-file within `pkg/` (mean of per-function %, approximate — `go tool cover -func` gives per-function not per-statement-per-file):

| File | ~Coverage | Functions | What lives there | Test |
|---|---:|---:|---|:--:|
| `pkg/streaming.go` | 0.0% | 20 | Live streaming: heartbeat, error frames, notices | H (channels/goroutines) |
| `pkg/resource_handlers.go` | 0.0% | 12 | HTTP resource endpoints (databases, tables, columns…) | M (httptest) |
| `pkg/datasource.go` | 0.0% | 6 | Datasource entry, `QueryData` | M |
| `pkg/query.go` | 0.0% | 3 | Query execution | M |
| `pkg/client.go` | 0.0% | 2 | ClickHouse HTTP client | M (httptest) |
| `pkg/requests/request_response.go` | 0.0% | 2 | Request/response structs + helpers | E/M |
| `pkg/timeutils/time_parsing.go` | 0.0% | 1 | `ParseTimeRange` (pure) | **E** |
| `pkg/main.go` | 0.0% | 1 | plugin `main()` | skip (entrypoint) |
| `pkg/parser.go` | 24.6% | 22 | SQL parsing/macro helpers | M |
| `pkg/datasource_settings.go` | 39.6% | 2 | Settings load/validate | E/M |
| `pkg/adhoc_columns.go` | 53.6% | 4 | Adhoc column introspection | M |
| `pkg/response.go` | 79.5% | 11 | Response → dataframe conversion | E/M |

---

## 4. Work packages (~1 day each, independently assignable)

Each package is self-contained: files, target, approach, mocks/fixtures, existing test to extend, effort. Do **WP-0 first** (it makes every other package count toward the headline number).

### WP-0 — Pin the coverage denominator (prerequisite, ~0.5 day)
- **File:** `jest.config.js`.
- **Do:** add the `collectCoverageFrom` block from §1. Optionally add `coverageThreshold` gates once the number is up. Optionally exclude `functions.ts`/`funcs.ts`.
- **Why first:** without it, tests written against `src/views/*` and `datasource.ts` do not move `npm run test:coverage` (those files aren't in the default denominator). This is the only package that edits config rather than adding tests.
- **Verify:** `npm run test:coverage` now reports ~71 files and ~43% baseline.
- **Effort:** S.

### WP-1 — Pure frontend logic (highest ROI, ~1 day)
- **Files:** `src/utils/clickhouseErrorHandling.ts` (21 uncov), `src/views/QueryEditor/components/QueryHeader/helpers/findDifferences.ts` (24), `src/views/QueryEditor/helpers/detectVariableMacroIntersections.ts` (17), `src/views/ConfigEditor/FormParts/DefaultValues/DefaultValues.api.ts` (17).
- **Target:** ≥95% each → ~+79 covered statements.
- **Approach:** plain input/output unit tests. No React, no mocks. `isPermissionError` has a rich truth table (codes vs message patterns vs `Code: NNN` format — see `clickhouseErrorHandling.ts:40-68`); `getPermissionErrorMessage` is a lookup over `PermissionErrorContext`. `findDifferences` is a deep diff — feed nested objects. `DefaultValues.api.ts` builds URL/params — assert the string.
- **Mocks/fixtures:** none.
- **Extend:** create new `*.test.ts` next to each file.
- **Effort:** S–M. **Best gain-per-hour in the whole plan.**

### WP-2 — `datasource.ts` pure methods (~1 day)
- **File:** `src/datasource/datasource.ts` (379 uncov — target the pure slice).
- **Target:** cover the pure/synchronous methods → ~+120–150 covered statements.
- **Approach:** instantiate `CHDatasource` with a minimal `instanceSettings` stub and test the pure methods directly: `_getRequestOptions` (static), `toggleQueryFilter`, `queryHasFilter`, `processQueryResponse` (feed a canned ClickHouse response + targets), `simpleHash`, `getLogContextQuery`/trace-id SQL builders (`:207`). These need only data in/out.
- **Mocks/fixtures:** `@grafana/data` `DataSourceInstanceSettings` stub; reuse the response fixtures from `src/spec/datasource.jest.ts`. Do NOT try to cover `query()`/`executeQueries()` here (that's WP-3).
- **Extend:** `src/spec/datasource.jest.ts` or a new `datasource-methods.spec.ts`.
- **Effort:** M.

### WP-3 — `datasource.ts` async + `adhoc.ts` + `resource_handler.ts` (~1 day)
- **Files:** `datasource.ts` async paths (`executeQueries`, `metricFindQuery`, `annotationQuery`, `getLogContextQuery` fetch path), `src/datasource/adhoc.ts` (58 uncov), `src/datasource/resource_handler.ts` (23).
- **Target:** ~+120 covered statements.
- **Approach:** mock Grafana runtime + fetch. Reuse the `jest.mock('@grafana/runtime', …)` pattern already in `src/views/QueryEditor/helpers/getAdHocFilters.test.ts:8` and `src/spec/datasource-response-pairing.spec.ts`. For `adhoc.ts`, stub `datasource.metricFindQuery` to return canned rows and assert `processTagKeysResponse` (incl. the Enum-parsing branch, `adhoc.ts:64-75`) and the `isPermissionError` catch path.
- **Mocks/fixtures:** `getBackendSrv().fetch` mock returning `Observable`/promise; template-srv mock.
- **Extend:** `src/spec/adhoc-macro.test.ts`, `src/spec/datasource-response-pairing.spec.ts` (fix its ESM issue first — see R2).
- **Effort:** M–L.

### WP-4 — `indexedDBManager.ts` (~1 day)
- **File:** `src/utils/indexedDBManager.ts` (243 uncov — single biggest single-file win).
- **Target:** ≥80% → ~+195 covered statements.
- **Approach:** add dev-dep **`fake-indexeddb`** (NOT currently installed — verified) and `import 'fake-indexeddb/auto'` in the test (or a jest setup entry). Then exercise `set`/`get`/`remove`/cleanup/`MAX_QUERY_STATES_PER_DATASOURCE` eviction/size stats. Reset the static `dbPromise` between tests.
- **Mocks/fixtures:** `fake-indexeddb`; fake timers for TTL expiry (`expiry`/`timestamp`).
- **Extend:** new `src/utils/indexedDBManager.spec.ts`.
- **Effort:** M. **Second-best single-file ROI after WP-1**, but gated on adding a dependency (§7 R3).

### WP-5 — ConfigEditor React tree (~1 day)
- **Files:** `src/views/ConfigEditor/ConfigEditor.tsx` (35), `FormParts/DefaultValues/DefaultValues.tsx` (88). (`.api.ts` handled in WP-1.)
- **Target:** ~+100 covered statements; whole `ConfigEditor` area 0% → ~60%.
- **Approach:** `@testing-library/react` render with `onOptionsChange` spy; assert field wiring and `useDefaultConfiguration` branch. Follow the render+`findBy*` style already in `AdvancedLogsFieldsModal.test.tsx`.
- **Mocks/fixtures:** Grafana `DataSourcePluginOptionsEditorProps` stub; mock `DefaultValues.api.ts` fetch.
- **Extend:** new tests co-located with each component.
- **Effort:** M.

### WP-6 — QueryEditor hooks (~1 day)
- **Files:** `useConnectionData.ts` (85), `useAutocompletionData.ts` (47), `useSystemDatabases.ts` (28), `useQueryState.ts` (26), `useFormattedData.ts` (21), `useQueryHandlers.ts` (20).
- **Target:** ~+150 covered statements.
- **Approach:** `@testing-library/react`'s `renderHook` with a mocked datasource (`fetchDatabases`/`fetchTables`/`fetchColumns`) and mocked runtime. Assert loading/error/success transitions and the permission-error fallbacks.
- **Mocks/fixtures:** datasource mock, runtime mock, `act()` for async state.
- **Extend:** new tests co-located per hook.
- **Effort:** M–L.

### WP-7 (optional) — QueryEditor components + Monaco (~1 day)
- **Files:** `QueryEditor.tsx` (56), `QueryTextEditor.tsx` (23), `QueryHeader.tsx` (22), `QueryBuilder.tsx` (29), `UniversalSelectComponent.tsx` (21). Monaco files (`initiateEditor.ts` 55, `SQLCodeEditor.tsx` 20) are **H** — mock `monaco-editor` or extract pure tokenizer regexes into a testable helper.
- **Target:** ~+120 covered statements.
- **Approach:** RTL render with mocked child editors; for Monaco, prefer extracting/unit-testing the pure config (regex/keyword lists) rather than driving the editor.
- **Effort:** L. Lower ROI; do last.

### WP-G (optional, Go) — lift backend from 47.6% (~1 day)
- **Files (ordered by ROI):** `pkg/timeutils/time_parsing.go` (pure `ParseTimeRange` — trivial), `pkg/requests/request_response.go` (structs/helpers), `pkg/response.go` (→85%+), `pkg/datasource_settings.go`, `pkg/parser.go` (raise from 24.6%), then `pkg/resource_handlers.go`/`pkg/client.go` via `net/http/httptest`. Skip `pkg/streaming.go` (goroutines/channels — H) and `pkg/main.go` (entrypoint).
- **Target:** package total 47.6% → ~70%.
- **Approach:** table-driven Go tests; `httptest.Server` for client/resource handlers.
- **Effort:** M–L. Only if #785 is deemed to include Go.

**Approximate math to 85% (whole-project frontend):** baseline 1187/2743 = 43.3%. To reach 85% you need ~2331 covered → **+1144 statements**. WP-1..WP-6 sum to roughly +810–870 (≈73–75%); adding WP-7 (+120) and cleaning up the near-miss files in §3.1 (request-options, response_parser, sql_series, toTimeSeries ≈ +40) reaches the low-80s. Hitting a clean 85% likely also needs excluding the two static-data files and the Monaco/streaming H-files from the denominator (documented, defensible exclusions), which is why WP-0's exclusion choices matter. **Realistic honest target with reasonable exclusions: 82–86%.**

---

## 5. Ordering & dependencies

```
WP-0 (config)  ─┬─> WP-1 (pure logic)         ─┐
                ├─> WP-2 (datasource pure)      │
                ├─> WP-4 (indexedDB, +dep)      ├─ all independent, parallelizable
                ├─> WP-5 (ConfigEditor)         │
                ├─> WP-6 (hooks)                │
                └─> WP-3 (datasource async) ────┘  (do after WP-2; shares fixtures)
WP-7 (components/Monaco)  ── last, lowest ROI, depends on nothing but least gain
WP-G (Go)                 ── independent track, only if issue includes Go
```

- **WP-0 is a hard prerequisite** for the headline number to move — everything else assumes it is merged.
- **WP-2 before WP-3** (WP-3 reuses the datasource instantiation + response fixtures WP-2 establishes).
- **WP-4 requires a dependency decision** (`fake-indexeddb`) before it can start.
- WP-1, WP-5, WP-6, WP-G are mutually independent and can go to separate agents in parallel.
- **Fix the 2 failing suites (R2) before or alongside WP-0**, so the suite is green and coverage is trustworthy.

---

## 6. Recommended sequencing for max coverage-per-day

1. WP-0 + fix failing suites (R2). Establishes honest baseline (~43%).
2. WP-1 (pure logic) + WP-4 (indexedDB). Biggest gain-per-hour; ~43% → ~53%.
3. WP-2 + WP-3 (datasource). ~53% → ~63%.
4. WP-6 (hooks) + WP-5 (ConfigEditor). ~63% → ~76%.
5. WP-7 + near-miss cleanup + exclusion tuning. ~76% → ~83–86%.
6. (Optional) WP-G if Go is in scope.

---

## 7. Risks

**R1 — The target is ambiguous; "already done" is a real possibility.** With the current default jest config, coverage is *already 86% > 85%*. Before spending days writing tests, confirm with `Slach` **which denominator #785 means**. If it's the default-config number, close the issue (or the ask is really "add a `collectCoverageFrom` so the number stops lying" — which is WP-0 alone). If it's whole-project, the plan above applies. **This confirmation should gate the work.**

**R2 — Two failing test suites at HEAD** (measured 2026-07-04):
  - `src/views/.../AdvancedLogsFields/AdvancedLogsFieldsModal.test.tsx` — an assertion failure (`toHaveBeenCalledWith` at `:391`). This file has **uncommitted local edits** (part of the in-progress `feature/advanced-logs-field-settings` branch — the modal `.tsx` and its test are both modified in the working tree). This is WIP, not a coverage-plan artifact.
  - `src/spec/datasource-response-pairing.spec.ts` — *"Jest encountered an unexpected token"* (ESM transform issue; a transitively-imported ESM package isn't in `transformIgnorePatterns`). Add the offending package to the `nodeModulesToTransform([...])` list in `jest.config.js` (same fix already applied for `react-calendar`).
  Both must be green before coverage gating (`coverageThreshold`) is enabled, or CI will fail for unrelated reasons.

**R3 — `fake-indexeddb` not installed.** WP-4 needs it as a dev-dependency. Adding a dependency needs maintainer sign-off. Without it, `indexedDBManager.ts` (the single biggest hole, 243 stmts) is effectively untestable without hand-rolling an IDB mock (much more effort).

**R4 — Monaco/streaming are genuinely hard to test.** `initiateEditor.ts`/`SQLCodeEditor.tsx` (frontend) and `pkg/streaming.go` (backend) drive external runtimes (Monaco editor, streaming channels/goroutines). Chasing their coverage has low ROI and high flakiness. Prefer **extracting pure helpers** (regex/keyword builders, frame constructors) into separately-testable functions, or **excluding these files from the denominator** with a documented rationale. Do not let them block 85%.

**R5 — Test-timeout flakiness.** `jest.config.js` already raised `testTimeout` to 15000ms because the async RTL Advanced-logs test can exceed 5s under the full parallel suite. New RTL/`renderHook` tests (WP-5, WP-6) add more heavy async renders; keep them isolated/fast (mock fetch, use fake timers) to avoid re-introducing timeout flakes. Run `--maxWorkers` consistently (`test:ci` uses 4).

**R6 — Coverage ≠ correctness.** Statement coverage can be gamed by importing static-data files (functions.ts/funcs.ts) or shallow "renders without crashing" tests. The plan targets *branches* in the pure-logic packages (WP-1, WP-2) where tests have real value; guard against reviewers accepting import-only "coverage" on the big data files.

---

### Key file references
- `jest.config.js`, `.config/jest.config.js` — no `collectCoverageFrom` (the root cause of the ambiguous number); WP-0 edits here.
- `coverage/coverage-summary.json` — default-config summary (86%, 18 files).
- `src/datasource/datasource.ts:151` `_getRequestOptions`, `:292` `toggleQueryFilter`, `:331` `queryHasFilter`, `:335` `processQueryResponse`, `:446` `executeQueries`, `:486` `simpleHash` — WP-2/WP-3 targets.
- `src/utils/indexedDBManager.ts:16-60` — WP-4 target; static `dbPromise` at `:24` must be reset per test.
- `src/utils/clickhouseErrorHandling.ts:40-68` `isPermissionError`, `:92-114` `getPermissionErrorMessage` — WP-1 (pure).
- `src/datasource/adhoc.ts:31` `GetTagKeys`, `:54-87` `processTagKeysResponse` (Enum branch `:64-75`), `:93` `GetTagValues` — WP-3.
- `src/views/QueryEditor/helpers/getAdHocFilters.test.ts:1-11` — reusable `jest.mock('@grafana/runtime', …)` pattern.
- `src/spec/datasource.jest.ts` — reusable ClickHouse response fixtures.
- `src/views/QueryEditor/components/QueryTextEditor/components/AdvancedLogsFields/AdvancedLogsFieldsModal.test.tsx` — RTL render+`findBy*` pattern (currently failing, WIP).
- `pkg/timeutils/time_parsing.go:15` `ParseTimeRange` (pure, easiest Go win), `pkg/eval/eval_query.go` (already 79.6%), `pkg/streaming.go` (0%, hard).
