# Issue #905 / PR #906 — Single-value variable quoting regression: full history analysis

Deep-dive analysis against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (master + PR branch `fix/single-value-raw-passthrough`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/905> — **OPEN**, author `oplehto` (2026-06-24).
- PR: <https://github.com/Altinity/clickhouse-grafana/pull/906> — **OPEN**, author `oplehto` (2026-06-26), +42/−33, 2 files, no reviews, **not linked** to #905 (`closingIssuesReferences` is empty).
- Related history: #712, #797, #827, #829, #847, #869.

---

## 0. TL;DR

PR 906 is a one-line logic change in `interpolateQueryExpr` (`src/datasource/helpers/index.ts:460`): the raw-passthrough guard is relaxed from strict equality (`variable.multi === false && variable.includeAll === false`) back to a falsy test (`!variable.multi && !variable.includeAll`) — byte-identical to the pre-3.4.0 guard in `v3.3.1:src/datasource/sql-query/sql-query-helper.ts:158-170`. The strict guard (introduced in the 3.4.x line) quoted single values of variables whose `multi`/`includeAll` are `undefined`/`null` — i.e. **constant/textbox/interval** variables and **query/custom variables from old dashboard JSON with `multi: null`** — breaking identifier-position interpolation (`FROM $var` → `FROM 'schema.table'`, issue #905). Empirically verified: exactly **one cell** of the behavior matrix changes (single non-numeric string, falsy-but-not-false multi, plain position: quoted → raw); the user-requested quoting from #712 (repeated panels) and #847 (IN clauses) lives in separate code paths (`isRepeated` flag, Priority 3 of `interpolateQueryExprWithContext`) and is **not affected**. The fix is correct and minimal, but the 15-month regression survived because the test suite was characterization (written with the code, blessing its behavior), not a spec — the structural remedy is an executable behavior contract, designed in `docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md`.

---

## 1. PR 906 — what it changes

Core change (the only production-code delta; the rest is JSDoc + flipped test expectations):

```diff
- // Single value with multi=false and includeAll=false - return raw value
- if (variable.multi === false && variable.includeAll === false && !Array.isArray(value)) {
+ // Single value without multi/includeAll - return raw value (pre-3.4.0 semantics).
+ if (!variable.multi && !variable.includeAll && !Array.isArray(value)) {
    return value;
  }
```

The difference materializes only when `multi`/`includeAll` are `undefined` or `null`:

| Variable population | strict `=== false` (master) | falsy `!multi` (PR 906) |
|---|---|---|
| `multi:false, includeAll:false` (query/custom with multiselect off) | raw | raw |
| `multi:undefined/null` (constant/textbox/interval; old JSON) | falls through → `clickhouseEscape` → **`'value'`** | **raw** |
| `multi:true` or `includeAll:true` | escape path | escape path (unchanged) |

PR declares BREAKING: value positions that relied on 3.4.x auto-quoting must quote in dashboard SQL (`WHERE x = '$var'`).

Process gaps found: no `Closes #905` link; no CHANGELOG entry; version bump not decided; no test for the escaping footgun (§7).

---

## 2. Timeline of the fix saga (15+ months)

| Version / commit | Date | Trigger | Change | Effect on `undefined`-multi scalars |
|---|---|---|---|---|
| `v3.3.1` (`sql-query-helper.ts:158`) | 2024-12 | — | `if (!multi && !includeAll && !isArray) return value` | **raw** (the baseline PR 906 restores) |
| `7163ae34` (in **v3.4.0**) | 2025-02-19 | **#712** "Repeat By Variable doesn't add single quotes for in($Var)" | Added first-position branch: `multi === undefined && includeAll === undefined → '${value}'` | **→ quoted. The regression is born here** — the fix overshot: #712 asked for quotes in `IN()` for repeated panels; the branch quoted *every* undefined-multi scalar everywhere |
| `ee4e7c22` | 2025-07-05 | **#797** concatenation broke (`$a.$b.svc` → `'a'.'b'.svc`) | Introduced `interpolateQueryExprWithContext` + `detectConcatenationContext`; **also created the 387-line test file in the same commit** (see §6) | quoted (unless concatenation) |
| `a2bc047f`, `49fd62e1`, `b889f134`, `280ade37` (in **v3.4.5**) | 2025-08-09 | #712/#797 interplay | Introduced `isRepeated` (value ≠ `current.value`); replaced the `undefined→quote` branch with `isRepeated→quote`; **tightened the raw guard to strict `=== false`** | still quoted (now via `clickhouseEscape` fallthrough) — mechanism changed, symptom identical |
| `584ff517` | 2025-10-10 | context edge cases | improved concatenation detection | unchanged |
| `776b77f5`, `bcbfe239`, `b8f1cebe`, `49bf9c96` (in **v3.4.9**) | 2025-11 – 2026-02 | **#847** "no single quotes in $conditionalTest" | Priority 2/3 in context function: arrays/scalars inside `IN()/tuple()` → comma-quoted / `clickhouseEscape` | unchanged |
| `0a7dfa2b`, `4d64bdf1` | 2026-03 | #869 | `$conditionalTest` 3-param fixes | unchanged |
| **PR 906** (`199b16ff`) | 2026-06-25 | **#905** "Constant template variables are single-quoted" | falsy guard restored | **→ raw (revert to v3.3.1 semantics)** |

Note on attribution: issue #905 says the strict `=== false` appeared "in 3.4.0"; in fact strict equality appeared in **v3.4.5** (`a2bc047f`). v3.4.0–3.4.4 produced the same symptom via the explicit `undefined→quote` branch from `7163ae34`. Same symptom, two different mechanisms across the 3.4.x line. Does not affect the fix's correctness.

---

## 3. Runtime wiring — why #712/#847 guarantees hold

All 8 interpolation call sites in `src/datasource/datasource.ts` (lines 823, 829, 892, 979, 1002, 1011, 1019) go through `createContextAwareInterpolation(query, templateSrv.getVariables())`. There are **zero** bare `interpolateQueryExpr` call sites in `src/` outside the helpers module and tests. Therefore:

- **#712 (repeated panels)**: quoting flows through the `isRepeated` flag (`JSON.stringify(value) !== JSON.stringify(current.value)`, with `$__all` expansion) computed in `interpolateQueryExprWithContext` — hit **before** the changed guard. Unaffected.
- **#847 (IN clause)**: single values inside `IN()/tuple()` are quoted by Priority 3 (`needsComma && !isArray → clickhouseEscape`) — also before the guard. Unaffected.
- **#797/#827 (concatenation, vars in string literals)**: already raw (Priority 1). Unaffected.

The strict-equality pattern `multi === false && includeAll === false` occurs in production code **exactly once** (`helpers/index.ts:460`); PR 906 leaves no sibling occurrences behind. The Go backend quoting (`pkg/adhoc/adhoc_filters.go`, `pkg/eval/eval_query.go` identifier escaping) is a fully separate system, untouched.

Latent risk retained: if any future code calls `interpolateQueryExpr(value, variable)` directly (no context, no `isRepeated`), repeated-panel quoting silently disappears. Nothing enforces the context-aware entry point today (addressed by the Phase-2 module design in the spec).

---

## 4. Empirical verification (exact branch reconstruction, node run)

Both guards were extracted verbatim (incl. `clickhouseEscape` with its `NumberOnlyRegexp`/`returnAsIs` logic) and run over test vectors:

| Case | OLD (strict, master) | NEW (falsy, PR 906) | Changed |
|---|---|---|---|
| query var, string, `multi:false/includeAll:false` | `my_schema.tbl` | `my_schema.tbl` | — |
| constant/textbox, string, `undefined/undefined` | `'my_schema.tbl'` | `my_schema.tbl` | **Δ** |
| constant, numeric string `'12345'` | `12345` | `12345` | — (numbers pass `clickhouseEscape` raw in both) |
| constant, `O'Brien` | `'O\'Brien'` | `O'Brien` | **Δ** (quoting **and escaping** both disappear — §7) |
| `multi:false, includeAll:true` | `'val'` | `'val'` | — |
| `multi:true`, array | `'a','b'` | `'a','b'` | — |
| repeated panel (`isRepeated=true`) | `'oneval'` | `'oneval'` | — |

Two non-obvious findings:

1. **The change is narrower than "undefined → raw"**: numeric values were already raw under the strict guard (via `NumberOnlyRegexp` in `clickhouseEscape`). Actual blast radius: **non-numeric string scalars** of falsy-but-not-false-multi variables in plain (non-concat, non-IN, non-repeated) positions.
2. **Escaping disappears together with quoting**: raw passthrough performs no `'` escaping. This is inherited pre-3.4.0 behavior (v3.3.1 did the same), not a new defect of PR 906 — but it makes the documented workaround `WHERE x = '$var'` unsafe for values containing quotes (§7).

---

## 5. Characterization matrix — what actually lives in `multi`/`includeAll`

### Layer A — compile-time model (`@grafana/data` `templateVars.d.ts`)

| Variable type | inherits | `multi` | `includeAll` |
|---|---|---|---|
| query / custom / datasource | `VariableWithMultiSupport` | `boolean` (required) | `boolean` (required) |
| constant / textbox / interval / switch / snapshot | `VariableWithOptions` | **field absent → `undefined`** | **`undefined`** |
| groupby | `VariableWithOptions` + literal | `true` | `undefined` |
| adhoc | `AdHocVariableModel` (separate path) | — | — |

The older serialization schema (`@grafana/schema` `raw/dashboard/x/types.gen.d.ts`) declares `multi?: boolean` / `includeAll?: boolean` — **optional even for query variables**.

### Layer B — serialized reality (repo dashboards, `docker/grafana/dashboards/` + `public_dashboards/`)

| Type | Observed `multi`/`includeAll` combos |
|---|---|
| query | `false/false`, `true/true`, `true/false`, **`null/false`** (`trace_id`, `split`), **`null/null`** (`Tenant`) |
| custom | `true/true`, `true/false`, **`null/false`** (`metric`, `test_default`, `test_single`, `container`, `selectednamespace`), **`null/null`** |
| datasource | `null/null`, `null/false` |
| textbox | `null/null` |
| adhoc | `null/null` |

Key facts: (a) a **third value `null`** exists in the wild, including on query/custom types whose current type model promises required booleans; (b) **mixed combos** (`null/false`) are real; (c) repo dashboards contain **no** `constant`/`interval` examples — blind spots.

### Layer C — runtime equivalence lemma

| runtime value | strict `=== false` | falsy `!x` |
|---|---|---|
| `false` | raw | raw |
| `undefined` | quote | raw |
| `null` | quote (`null !== false`) | raw |
| `true` | escape | escape |

`null` and `undefined` behave identically under **both** guards. The only normalization that would change anything is `null → false` at Grafana load time — and it would only *shrink* the delta (strict would already have been raw for those). Direction of the PR 906 decision is therefore normalization-independent; only the *size* of the affected set depends on it. The e2e repro dashboard (spec, Phase 1) settles this empirically against a live Grafana.

---

## 6. Test-suite analysis — why the regression survived 15 months

- `src/datasource/helpers/index.test.ts` was created wholesale (387 lines) in `ee4e7c22` **in the same commit as the implementation** — characterization tests (snapshots of what the code already did), not TDD specs.
- The flipped test `'should quote variables in WHERE clauses'` (comment: `// Should have quotes`) pinned the **unrequested side effect** of the #712 fix as if it were a requirement. No issue ever asked to quote `WHERE col = $var` equality positions.
- Decisive evidence PR 906 is surgical, not test-gaming: the adjacent test `'should quote variables in repeated panels (original issue #712)'` is **left untouched and still passes**. Only assertions pinning the incidental `undefined→quote` behavior are flipped, each renamed with an explicit reason (`(pre-3.4.0 semantics)`).
- Consequence in both directions: the old suite could not catch #905 (it enshrined it), and the flipped suite does not *prove* pre-3.4.0 is "right" (it re-characterizes). Correctness is established by #905 + the v3.3.1 baseline, not by the suite. The structural fix is a table-driven contract test (see spec).

---

## 7. Risks of PR 906

1. **BREAKING (declared)**: dashboards authored/adjusted during 3.4.x with bare `WHERE x = $var` (non-numeric string values) break. Mostly **loud** (ClickHouse `Unknown identifier` / syntax error); rarely **silent** if the raw value collides with a column name (`WHERE col = abc` becomes a column-to-column comparison). Migration: `= '$var'`.
2. **Escaping footgun**: raw passthrough does not escape `'`. `$var = O'Brien` inside a manually-quoted `'$var'` yields broken SQL. Inherited from pre-3.4.0; Priority 3 still escapes inside `IN()`. Mitigation candidate (spec, Phase 2): escape-but-not-quote when the variable sits inside a single-quoted literal (the #827 detector already identifies this context).
3. **Process**: no issue link, no CHANGELOG, patch-level bump would understate the change (spec: 3.5.0).
4. **Latent bare-call risk** (§3) — nothing prevents future non-context calls; Phase-2 module privatizes the raw functions.

---

## 8. Root-cause diagnosis — why every fix bred the next one

1. **Decisions ride on proxy signals.** `multi`/`includeAll` → variable type → author intent (value vs identifier): two lossy inference hops over a tri-state (`false|undefined|null`) input that varies by variable type, Grafana version, and dashboard age.
2. **The boundary is global.** Any rule shift hits all dashboards at once; winners are silent, losers file the issue that triggers the next global flip. Ping-pong is built into the design.
3. **Tests were characterization.** Green CI defended the bug (§6).
4. **Losers of a quote-default have no exit.** See §9.

## 9. The asymmetry argument (why raw is the only self-stabilizing default)

- Default **raw**, author needs quotes → writes `WHERE x = '$var'` in dashboard SQL. Local, immediate, no plugin release.
- Default **quote**, author needs raw (`FROM $var`) → **no SQL syntax can strip quotes**. Dead end → issue → next global flip.

History confirms it: the raw default lived stably for years (v2.x–v3.3.1); the quote default lasted one minor line (3.4.x) and had to be reverted, because identifier users (#905) had no workaround. Any future "let's auto-quote by default again" proposal must be measured against this asymmetry.

---

## 10. Verdict and follow-up

PR 906 is **correct, minimal, and complete** for the frontend interpolation path: it reverts exactly the unrequested side effect of the #712 fix, relying on the context-aware layer (built during 3.4.x) to keep every requested quoting behavior alive. Its weaknesses are procedural (no issue link/changelog/version plan) and structural (nothing prevents regression #6). The remedy — executable behavior contract, e2e repro dashboard, and an optional consolidation of interpolation into a single module — is designed in:

**`docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md`**
