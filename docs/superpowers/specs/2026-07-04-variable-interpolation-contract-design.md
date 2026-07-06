# Variable Interpolation: Behavior Contract + Consolidation

**Issue:** [#905](https://github.com/Altinity/clickhouse-grafana/issues/905) (and the fix saga: #712, #797, #827, #829, #847)
**PR under adoption:** [#906](https://github.com/Altinity/clickhouse-grafana/pull/906)
**Analysis:** `docs/issue-analysis/905-pr906-single-value-interpolation.md`
**Target branch:** `master` (independent of `feature/advanced-logs-field-settings`)
**Date:** 2026-07-04
**Status:** Phase 1 implemented on `fix/interpolation-contract-905` (awaiting local review); Phase 2 pending

## Context

Single-value variable quoting has flip-flopped across releases (#712 → #797 → #827 → #847 → #905) because the quote/raw decision (a) rides on unreliable proxy inputs (`multi`/`includeAll` arrive as `false | undefined | null` depending on variable type, Grafana version, and dashboard age), (b) is a single global boundary where every shift breaks somebody, and (c) was pinned only by characterization tests that blessed whatever the code did. This design adopts PR 906's semantics and adds the machinery that stops the regression cycle: a written, executable behavior contract; an e2e repro dashboard; and (Phase 2) consolidation of all interpolation logic behind a single entry point.

## Decision

**Default rule: a single scalar variable value interpolates raw.** Quoting happens only in the explicitly recognized contexts that users actually requested: `IN()/tuple()` scalars (#847), repeated panels (#712), multi-value arrays. Authors quote value positions in dashboard SQL (`WHERE x = '$var'`).

Rationale — the asymmetry argument (analysis §9): raw is the only self-stabilizing default. With raw, an author who needs quotes adds them locally in SQL; with quote, an author who needs raw (`FROM $var`) has no possible workaround and must file an issue that forces the next global flip. History confirms: raw lived for years (v2.x–v3.3.1), quote lasted one minor line (3.4.x).

## Behavior contract (the executable table)

Column Δ = differs from current `master` (strict guard). All Δ rows are the single contested cell of the matrix and its equivalents.

### Group A — single scalar, plain position (the battleground)

| # | query | variable | value | expected | Δ | reason |
|---|---|---|---|---|---|---|
| A1 | `WHERE x = $v` | `multi:false, includeAll:false` | `'abc'` | `abc` | — | baseline, all eras |
| A2 | `WHERE x = $v` | `multi:undefined, includeAll:undefined` | `'abc'` | `abc` | **Δ** | **#905**: constant/textbox |
| A3 | `WHERE x = $v` | `multi:null, includeAll:null` | `'abc'` | `abc` | **Δ** | tri-state equivalence trap |
| A4 | `WHERE x = $v` | `multi:null, includeAll:false` | `'abc'` | `abc` | **Δ** | mixed combo (real dashboards: `test_single`, `metric`) |
| A5 | `WHERE x = $v` | `multi:false, includeAll:true` | `'abc'` | `'abc'` | — | truthy includeAll → escape path |
| A6 | `WHERE x = $v` | `multi:true` (scalar value) | `'abc'` | `'abc'` | — | truthy multi → escape path |
| A7 | `WHERE x = $v` | `multi:undefined` | `'123'` | `123` | — | numbers always raw |
| A8 | `WHERE x = $v` | `multi:undefined` | `"O'Brien"` | `O'Brien` | **Δ** | documents the escaping footgun (Phase 2 hardening) |

**Equivalence trap (dedicated assert):** A1 ≡ A2 ≡ A3 ≡ A4 must produce the identical result — structurally blocks reintroduction of strict `=== false`.

### Group B — IN/tuple: quoting preserved (#847)

| # | query | variable | value | expected | Δ |
|---|---|---|---|---|---|
| B1 | `WHERE x IN ($v)` | `multi:undefined` | `'abc'` | `'abc'` | — |
| B2 | `WHERE x IN ($v)` | `multi:true` | `['a','b']` | `'a','b'` | — |
| B3 | `WHERE x NOT IN ($v)` | `multi:undefined` | `'abc'` | `'abc'` | — |
| B4 | `SELECT tuple($v)` | `multi:undefined` | `'abc'` | `'abc'` | — |
| B5 | `IN ($v)` and `$db.$v` in one query | `multi:undefined` | `'abc'` | `'abc'` | — IN outranks concatenation (#847) |

### Group C — repeated panels: quoting preserved (#712)

| # | condition | value vs `current.value` | expected | Δ |
|---|---|---|---|---|
| C1 | repeated: value ≠ current | `'mysql'` ≠ `'postgres'` | `'mysql'` | — |
| C2 | not repeated: value = current | equal | → guard → `mysql` | **Δ** (same cell as A2) |
| C3 | `current.value = ['$__all']`, value = all options | equal after expansion | not repeated; `$__all` implies `includeAll:true` → escape path → quoted in both eras | — |

### Group D — concatenation & string literals (#797, #827)

| # | query | value | expected | Δ |
|---|---|---|---|---|
| D1 | `FROM $db.$table` | `'mydb'` | `mydb` | — |
| D2 | `= 'prefix$v'` (inside literal) | `'abc'` | `abc` (Phase 2: escape `'` here) | — |
| D3 | `$v.8090.svc` | `'host'` | `host` | — |

### Group E — arrays outside IN (#829) & multiselect

| # | query | variable | value | expected | Δ |
|---|---|---|---|---|---|
| E1 | `arrayIntersect($v, col)` | `multi:true` | `['a','b']` | `['a', 'b']` | — |
| E2 | `WHERE x IN ($v)` | `multi:true, includeAll:true` | `['a','b']` | `'a','b'` | — |

### Group F — known quirks (pinned as-is to detect drift)

| # | condition | current behavior | note |
|---|---|---|---|
| F1 | numeric-string value, but `options` contain non-numeric entries | quoted (`'123'`) | `returnAsIs` logic in `clickhouseEscape` |
| F2 | variable with empty `current: {}` | `isRepeated=true` → quoted | comparison-vs-`undefined` quirk; fix separately (Phase 2 normalization) |

## Phase 1 — behavioral (adopt PR 906 + protection)

| # | File | Change |
|---|---|---|
| 1 | `src/datasource/helpers/index.ts` | The falsy guard (= PR 906), extracted into a named predicate with a contract comment: `isSingleScalarVariable = (v) => !v.multi && !v.includeAll` — comment explains the tri-state input, the exceptions (IN/tuple, repeated), issue refs, and links this spec |
| 2 | `src/datasource/helpers/interpolation-contract.test.ts` (new) | Table-driven `it.each` over the contract table above (IDs preserved), plus the dedicated equivalence-trap test (`false ≡ undefined ≡ null`) |
| 3 | `docker/grafana/dashboards/single_value_variables_issue_905.json` (new) + e2e spec | constant + textbox + query(single) variables used in `FROM $var` and `WHERE x = '$var'` positions; Playwright asserts queries succeed. Exercises the real `templateSrv` runtime shapes (`null` vs `undefined`), closing the only gap static analysis could not (precedent: `conditionalTest_quotes_issue_847.json`, commit `177e5f02`) |
| 4 | `CHANGELOG.md` + version | BREAKING entry naming the exact blast radius (non-numeric string scalars of falsy-multi variables in plain value positions; mostly loud errors, rare silent column-name collision) with migration `= $var` → `= '$var'`. Bump **3.5.0**, not a patch |
| 5 | PR 906 hygiene | Request `Closes #905` in the PR body; contract test + e2e can land as a follow-up by the team (don't burden the external contributor) |

Behavior changes in exactly the Δ rows (A2–A4, A8, C2) — one matrix cell and its equivalents. Everything else is regression armor.

## Phase 2 — structural (separate PR, behavior-neutral)

Consolidate interpolation into `src/datasource/variables/` **under the protection of the (already green) Phase-1 contract test** — every table row must stay green through the refactor.

```
src/datasource/variables/
├── index.ts                       ← public API: ONE function
├── normalize.ts                   ← dirty Grafana input → clean internal model
├── rules.ts                       ← ordered rule list (mirrors the contract table)
├── escape.ts                      ← clickhouseEscape + escaping rules
├── detectors.ts                   ← regex context detectors (private)
└── interpolation-contract.test.ts ← moved from Phase 1
```

Key properties:

1. **Single entry point.** `createVariableInterpolator(query, variables): FormatFn`. `interpolateQueryExpr` / `interpolateQueryExprWithContext` become module-private — the "bare call loses isRepeated/context" risk class becomes unwritable. 8 call sites in `datasource.ts` swap mechanically.
2. **Normalization at the boundary.** `normalize.ts` converts `multi: false|null|undefined` → `isMulti: boolean` (same for `includeAll`), unwraps `current`, expands `$__all`, handles empty `current {}` (fixes quirk F2 explicitly). Downstream code only ever sees booleans — the strict-vs-falsy debate becomes inexpressible. Keeps `variable.type` in the model for future use (warnings, diagnostics).
3. **Priorities as data.** An ordered `RULES` array — first match wins; each rule carries `name` + `issue` ref (`concatenation #797/#827`, `list-array #847`, `list-scalar #847`, `array-literal #829`, `repeated-panel #712`, `multi-scalar`, `single-scalar-raw #905`). Future fixes = add/move a named rule; review diffs show exactly where it lands in precedence. Query context is computed once per query, not per format callback.
4. **Optional hardening (same phase, behind contract rows):**
   - *Escaped-raw inside single-quoted literals*: the #827 detector already identifies `'…$var…'`; escape `'` there (strictly-better: currently such values produce broken SQL). Updates row D2.
   - *Position linter, not decider*: a `= $var` regex may emit a console warning suggesting `'$var'` — never changes output (false positive = spurious warning, not a broken query).

**Sequencing rule: never both phases in one diff.** Phase 1 lands the net; Phase 2 walks the wire.

## Out of scope (deliberate)

- Position-aware quoting that **changes output** (e.g. auto-quote after `=`) — reproduces root cause #1 (another unreliable proxy); the file's history is the counter-evidence.
- `variable.type`-based decision branches — requires a runtime matrix across Grafana versions and doesn't resolve textbox ambiguity; possible future project only alongside positional substitution via backend AST.
- `conditionalTest` / macros, adhoc filters (frontend + `pkg/adhoc`), backend macro processing — separate subsystems.
- Grafana format specifiers (`${var:singlequote}`) — ruled out by team constraint.

## Acceptance criteria

1. All contract-table rows pass as `it.each` cases against the Phase-1 code (Δ rows with new expectations, armor rows unchanged).
2. Equivalence-trap test passes: `false ≡ undefined ≡ null` → identical raw output.
3. Existing suites stay green except assertions superseded by the contract (documented in the PR).
4. e2e: `single_value_variables_issue_905.json` renders and queries succeed against live Grafana + ClickHouse.
5. CHANGELOG BREAKING entry + 3.5.0 bump.
6. Phase 2 only: `grep` finds no imports of the private interpolation functions outside `src/datasource/variables/`; contract test file unchanged and green through the refactor.

## Open questions

1. **Phase 2 timing** — immediately after Phase 1, or parked until the next interpolation-related change? (Recommendation: immediately, while context is loaded and the contract is fresh.)
2. **PR 906 handling** — merge as-is + team follow-up with contract/e2e (recommended), or request the author add them?
3. **`null` normalization at Grafana load** — decision-irrelevant for the falsy guard (analysis §5, Layer C), settled empirically by the e2e dashboard; recorded here so nobody re-litigates it.
