# Issue #905 — Breaking change in 3.4.x: constant template variables are single-quoted

Deep-dive analysis against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/905>
- Labels: **bug**, **p1**. Status at time of writing: **OPEN**, author `oplehto` (Olli-Pekka Lehto, 2026-06-24).
- One maintainer comment from `Slach`: *"use `${var:raw}`"* — a workaround, not a fix (see §8).
- **There is already an open PR from the issue author: [PR #906](https://github.com/Altinity/clickhouse-grafana/pull/906)** ("fix(interpolation): restore pre-3.4.0 raw passthrough for single-value variables"), branch `fix/single-value-raw-passthrough`, base `master`, currently `MERGEABLE`, no reviews. This analysis evaluates that PR critically and confirms it as the recommended fix, with one caveat and additional tests (see §4, §7). **PR #906 is NOT on the current working branch / master HEAD** — HEAD still has the buggy strict guard.

The issue body (verbatim, paraphrased for clarity):

> A `constant` variable used as an identifier gets single-quoted. This is a behavior change; both `query` and `constant` variables were unquoted at least until v3.3.1.
>
> Repro:
> ```sql
> SELECT count() FROM $var        -- with $var a constant "system.query_log"
> -- 3.4.x produces:  SELECT count() FROM 'system.query_log'   ← broken (quoted identifier)
> -- expected      :  SELECT count() FROM system.query_log
> ```
>
> Cause: in `interpolateQueryExpr` (moved to `src/datasource/helpers/index.ts` in 3.4.0) the raw-identifier guard changed from `!variable.multi && !variable.includeAll` to strict `variable.multi === false && variable.includeAll === false`.

The author's diagnosis is essentially correct. The precise mechanism and offending commit are pinned below.

---

## 0. TL;DR

- **Root cause.** `interpolateQueryExpr` (`src/datasource/helpers/index.ts:449`) decides whether a single value is emitted raw (`system.query_log`) or single-quoted (`'system.query_log'`). In v3.3.1 the "emit raw" guard was a **falsy** check `!variable.multi && !variable.includeAll`. In 3.4.x it became a **strict** check `variable.multi === false && variable.includeAll === false`, plus an explicit "`=== undefined → quote`" branch was added ahead of it. **`constant` (and `textbox`/`interval`/`switch`) variables carry `multi`/`includeAll` as `undefined`** — Grafana's `ConstantVariableModel` extends `VariableWithOptions`, which has no `multi`/`includeAll` fields — so they stop matching the raw branch and get quoted. Using a constant in identifier position (`FROM $var`) now emits invalid SQL `FROM 'schema.table'`.
- **Offending commit.** [`09b7b96a`](#) "apply clickhouse dashboard fixes" (Roman M, 2025-04-06) added the leading `variable.multi === undefined && variable.includeAll === undefined → return \`'${value}'\`` branch to the new `helpers/index.ts`. **First shipped in v3.4.0.** A later commit [`a2bc047f`](#) "change isRepeat check behavior" (2025-08-09, first shipped in v3.4.5) refactored this into the current strict `=== false` guard + `isRepeated` path, but the observable break for constant variables was already present from v3.4.0. (The v3.3.1 → v3.4.0 refactor split `SqlQueryHelper.interpolateQueryExpr` out of `sql-query/sql-query-helper.ts` into `helpers/index.ts`; the falsy guard survived that split — it was `09b7b96a` that changed the behavior, not the refactor `d4903a5f`.)
- **Recommendation.** Adopt PR #906's approach: relax the guard back to falsy `!variable.multi && !variable.includeAll`. This is **type-safe**: `undefined` only occurs for constant/textbox/interval/switch variables (which are inherently single-value, identifier-like), while `query`/`custom`/`datasource` variables always carry explicit booleans and are therefore unaffected by the relaxation. The `isRepeated` (#712) and IN-clause single-value quoting (#847) paths run *before* this guard and are preserved. One caveat: this reverts to "raw in value position too", so a constant used as `WHERE x = $var` needs the dashboard to quote it (`WHERE x = '$var'`) — this is exactly the pre-3.4.0 contract and is documented in the PR. Effort: **Small (~0.5 day)**, mostly test updates.

---

## 1. Map of all relevant code

| Location | Symbol | Role |
|---|---|---|
| `src/datasource/helpers/index.ts:449` | `interpolateQueryExpr(value, variable, isRepeated?)` | **The fix site.** Decides raw vs quoted for single values. |
| `src/datasource/helpers/index.ts:453-455` | `isRepeated` branch | Repeated-panel single values → always `'value'` (issue #712). Runs first. |
| `src/datasource/helpers/index.ts:460-462` | **the offending guard** | `variable.multi === false && variable.includeAll === false && !Array.isArray(value)` → return raw `value`. Strict `=== false` excludes `undefined` (constant/textbox). |
| `src/datasource/helpers/index.ts:465-467` | default single-value branch | Everything else non-array → `clickhouseEscape` (quoted). This is where constant vars wrongly land today. |
| `src/datasource/helpers/index.ts:470-473` | array branch | Multi-value → per-element `clickhouseEscape`, comma-joined. |
| `src/datasource/helpers/index.ts:240-287` | `interpolateQueryExprWithContext(query, variables)` | The context-aware wrapper actually used at runtime. Priority chain (concat / IN-comma / IN-single / array / default). Delegates single non-IN values to `interpolateQueryExpr`. |
| `src/datasource/helpers/index.ts:265-267` | Priority 1 (concat) | `isInConcatenation && !needsComma && !Array.isArray` → raw. (`$db.$table` etc.) |
| `src/datasource/helpers/index.ts:275-277` | Priority 3 (IN single) | `needsComma && !Array.isArray` → `clickhouseEscape` (quoted, issue #847). |
| `src/datasource/helpers/index.ts:284-285` | default | `interpolateQueryExpr(value, variable, isRepeated)` — the delegation to the buggy function. |
| `src/datasource/helpers/index.ts:162-193` | `clickhouseEscape(value, variable)` | The actual quoter: numbers pass raw, arrays → `[...]`, strings → `'...'` with `\` and `'` escaped. |
| `src/datasource/helpers/index.ts:511-515` | `createContextAwareInterpolation(query, variables)` | Thin wrapper returning the fn for `templateSrv.replace`. |
| `src/datasource/datasource.ts:828,831-835,894-897,981-984,1004-1007,1016,1021-1024` | runtime call sites | Every panel/annotation/adhoc query interpolates via `createContextAwareInterpolation(...)`. |
| `src/datasource/helpers/index.test.ts` | unit tests | 60+ interpolation cases; several assert the *quoting* behavior that this fix reverses (see §7). |
| `node_modules/@grafana/data/dist/types/types/templateVars.d.ts` | Grafana models | `ConstantVariableModel`/`TextBoxVariableModel` extend `VariableWithOptions` (no `multi`/`includeAll`); `QueryVariableModel`/`CustomVariableModel`/`DataSourceVariableModel` extend `VariableWithMultiSupport` (`multi: boolean`, `includeAll: boolean`). **This is the linchpin of the whole analysis.** |

Backend note: `pkg/` macros are **not** involved. Template-variable value substitution happens entirely in the frontend via Grafana's `templateSrv.replace` before the SQL is sent to the backend. The backend only expands `$table`, `$timeFilter`, etc. No Go change is needed for #905.

---

## 2. The Grafana variable-model fact that drives everything

From `node_modules/@grafana/data/dist/types/types/templateVars.d.ts`:

```ts
export interface VariableWithOptions extends BaseVariableModel {
  current: VariableOption | Record<string, never>;
  options: VariableOption[];
  query: string;
  // NOTE: no `multi`, no `includeAll`
}

export interface VariableWithMultiSupport extends VariableWithOptions {
  multi: boolean;        // always present
  includeAll: boolean;   // always present
  allValue?: string | null;
  allowCustomValue?: boolean;
}

export interface ConstantVariableModel extends VariableWithOptions { type: 'constant'; }
export interface TextBoxVariableModel  extends VariableWithOptions { type: 'textbox'; originalQuery: string | null; }
export interface IntervalVariableModel extends VariableWithOptions { type: 'interval'; /* ... */ }
export interface SwitchVariableModel   extends VariableWithOptions { type: 'switch'; }

export interface QueryVariableModel      extends VariableWithMultiSupport { type: 'query'; /* ... */ }
export interface CustomVariableModel     extends VariableWithMultiSupport { type: 'custom'; /* ... */ }
export interface DataSourceVariableModel extends VariableWithMultiSupport { type: 'datasource'; /* ... */ }
```

Consequence at runtime:

| Variable type | `multi` | `includeAll` | Falsy guard `!multi && !includeAll` | Strict guard `multi===false && includeAll===false` |
|---|---|---|---|---|
| `constant` | `undefined` | `undefined` | **matches → raw** | does NOT match → **quoted (BUG)** |
| `textbox` | `undefined` | `undefined` | **matches → raw** | does NOT match → **quoted (BUG)** |
| `interval` | `undefined` | `undefined` | matches → raw | does NOT match → quoted |
| `switch` | `undefined` | `undefined` | matches → raw | does NOT match → quoted |
| `query` (single) | `false` | `false` | matches → raw | matches → raw *(same)* |
| `query` (multi) | `true` | `false`/`true` | not matched → quoted/array | not matched → quoted/array *(same)* |
| `custom` (single) | `false` | `false` | matches → raw | matches → raw *(same)* |
| `datasource` | `false`/`true` | `false`/`true` | same as query | same as query |

**Key insight:** the falsy vs strict distinction is observable *only* for the four `undefined`/`undefined` types (constant/textbox/interval/switch). For every `VariableWithMultiSupport` type the two guards produce identical results, because those types never hold `undefined`. So relaxing to falsy is a targeted revert affecting *only* the value types that the issue is about — it cannot regress `query`/`custom`/`datasource` behavior.

---

## 3. Root-cause analysis: old vs new behavior

### 3.1 v3.3.1 (pre-break) — `src/datasource/sql-query/sql-query-helper.ts:158`

```ts
static interpolateQueryExpr(value: any, variable: any, defaultFormatFn: any) {
  // if no (`multiselect` or `include all`) and variable is not Array - do not escape
  if (!variable.multi && !variable.includeAll && !Array.isArray(value)) {
    return value;                                   // RAW — matches constant (undefined/undefined)
  }
  if (!Array.isArray(value)) {
    return SqlQueryHelper.clickhouseEscape(value, variable);
  }
  let escapedValues = value.map((v) => SqlQueryHelper.clickhouseEscape(v, variable));
  return escapedValues.join(',');
}
```

A single value from a constant/textbox/query-single variable → **raw** (`system.query_log`). `FROM $var` works.

### 3.2 v3.4.0 — first broken release — `helpers/index.ts` (introduced by commit `09b7b96a`)

```ts
export const interpolateQueryExpr = (value: any, variable: any) => {
  // Repeated Single variable value                       ← NEW leading branch
  if (variable.multi === undefined && variable.includeAll === undefined && !Array.isArray(value)) {
    return `'${value}'`;                                  // QUOTE — now catches constant/textbox!
  }
  // Single variable value
  if (!variable.multi && !variable.includeAll && !Array.isArray(value)) {
    return value;                                         // dead for undefined/undefined now
  }
  ...
};
```

The intent of the new branch was issue #712 ("repeated panels"): a repeated single-value variable inside `IN (...)` needs quotes. But the condition used to detect "repeated panel" was *"multi and includeAll are both undefined"* — which is exactly the fingerprint of a **constant/textbox** variable. So the branch mis-fired on constants and quoted them. This is the regression.

### 3.3 v3.4.5 (current master / HEAD) — `helpers/index.ts:449` (refactored by commit `a2bc047f`)

The #712 detection was moved out of `interpolateQueryExpr` into an explicit `isRepeated` flag computed by `interpolateQueryExprWithContext` (comparing the interpolated value against the variable's `current.value`). The leftover guard was then rewritten as the strict form:

```ts
export const interpolateQueryExpr = (value: any, variable: any, isRepeated?: boolean) => {
  if (isRepeated && !Array.isArray(value)) return `'${value}'`;          // #712, runs first

  if (variable.multi === false && variable.includeAll === false && !Array.isArray(value)) {
    return value;                                                        // RAW — strict, excludes undefined
  }
  if (!Array.isArray(value)) return clickhouseEscape(value, variable);   // constant lands here → QUOTED (bug)
  return value.map((v) => clickhouseEscape(v, variable)).join(',');
};
```

Net effect for a constant variable (`undefined/undefined`, not repeated): skips `isRepeated`, fails the strict `=== false` guard, falls to `clickhouseEscape` → **`'system.query_log'`**. Same visible bug as v3.4.0, now via a different code shape.

### 3.4 Why the author's "3.4.x" framing is right, and the precise commit trail

- `git show v3.3.1:src/datasource/sql-query/sql-query-helper.ts` → falsy guard, raw. ✅ unquoted.
- Refactor `d4903a5f` ("refactor and split into smaller files") moved the fn to `helpers/index.ts` **preserving** the falsy guard.
- `09b7b96a` ("apply clickhouse dashboard fixes", 2025-04-06) **added the `=== undefined → quote` branch** → first quoting regression. Shipped in **v3.4.0**.
- `a2bc047f` ("change isRepeat check behavior", 2025-08-09) rewrote it to the strict `=== false` guard + `isRepeated`. Shipped in **v3.4.5**.

So: introduced in **v3.4.0** (`09b7b96a`), reshaped in **v3.4.5** (`a2bc047f`). Both leave constants quoted. The author points at the strict `=== false` guard — which is the current HEAD form and the correct fix site — even though the very first regression predates the strict rewrite. For the implementer, the single line to change is `helpers/index.ts:460`.

### 3.5 Runtime path (why the strict guard is actually reached)

`datasource.ts:831` → `templateSrv.replace(query, scopedVars, createContextAwareInterpolation(query, variables))`. For a constant `$var` used as `FROM $var`:

1. Grafana resolves `$var` → `"system.query_log"` and calls the custom format fn with `(value="system.query_log", variable={type:'constant', multi:undefined, includeAll:undefined, ...})`.
2. `interpolateQueryExprWithContext`: `isInConcatenation=false`, `needsComma=false`, value is a string (not array) → falls to the **default** branch `interpolateQueryExpr(value, variable, isRepeated=false)`.
3. `interpolateQueryExpr`: not repeated; strict guard fails (`undefined !== false`); non-array → `clickhouseEscape("system.query_log", variable)` → `'system.query_log'`. ❌

With the falsy guard the strict-guard step becomes a match → returns `"system.query_log"` raw. ✅

---

## 4. Proposed fix + full quoting decision matrix

### 4.1 The change (one line, mirrors PR #906)

`src/datasource/helpers/index.ts:460`

```diff
- // Single value with multi=false and includeAll=false - return raw value
- // This is used for identifier contexts (table names, column names, etc.)
- // For IN clause contexts, interpolateQueryExprWithContext handles quoting via Priority 3
- if (variable.multi === false && variable.includeAll === false && !Array.isArray(value)) {
+ // Single value without multi/includeAll - return raw value (pre-3.4.0 semantics).
+ // Identifier contexts (table/column names) AND constant/textbox variables, whose
+ // multi/includeAll are `undefined` in Grafana's model. Falsy (not strict === false)
+ // so undefined passes through raw. query/custom/datasource carry explicit booleans,
+ // so their behavior is unchanged. IN-clause single-value quoting is handled earlier
+ // by interpolateQueryExprWithContext Priority 3 (#847); repeated panels by isRepeated (#712).
+ if (!variable.multi && !variable.includeAll && !Array.isArray(value)) {
    return value;
  }
```

PR #906 also rewrites the JSDoc table (the `| string | undef | undef | ... | 'value' (quoted) |` row is removed / merged into a `falsy` row) — adopt that verbatim.

### 4.2 Full quoting decision matrix (post-fix)

Order of evaluation inside `interpolateQueryExprWithContext` → `interpolateQueryExpr`:

| # | Context (query shape) | Value | `multi`/`includeAll` | `isRepeated` | Result | Fixed / preserved |
|---|---|---|---|---|---|---|
| 1 | `$db.$table`, `'$prefix%'`, `host.$domain` (concatenation, not IN) | single | any | any | **raw** `value` | #797/#827 preserved (Priority 1) |
| 2 | `IN ($v)`, `NOT IN`, `GLOBAL IN`, `IN [$v]`, `tuple($v)` | array | any | any | `'a','b'` (no brackets) | #829/#838 preserved (Priority 2) |
| 3 | same IN/tuple contexts | single | any | any | `'v'` (quoted) | #847 preserved (Priority 3) — runs *before* the guard, so constants in `IN ($c)` still quote correctly |
| 4 | array function `arrayIntersect($v,..)`, `hasAny($v,..)` | array | any | any | `['a','b']` (brackets) | #829 preserved (Priority 4) |
| 5 | any other position (`FROM $v`, `WHERE x = $v`, bare `$v`) | single | isRepeated=true | true | `'v'` (quoted) | #712 preserved (runs first in `interpolateQueryExpr`) |
| 6 | any other position | single | `false`/`false` (query/custom single) | false | **raw** `value` | unchanged by fix (matched both guards) |
| 7 | any other position | single | `undefined`/`undefined` (**constant/textbox/interval/switch**) | false | **raw** `value` | **← THE FIX** (was quoted; now raw) |
| 8 | any other position | single | `true`/any (query/custom multi, single current value) | false | `'v'` (quoted via `clickhouseEscape`) | unchanged |
| 9 | any position | array | multi=true | any | `'a','b'` or `['a','b']` per context | unchanged |

Rows 3 and 5 are the two guards that prevent this fix from being a naive "never quote": a constant inside an `IN (...)` clause still gets quoted (Priority 3), and a repeated-panel single value still gets quoted (`isRepeated`). The fix only affects **row 7** — a single value from an `undefined`/`undefined` variable in a non-IN, non-repeated position — flipping it from quoted back to raw.

### 4.3 The trade-off (documented, intentional, pre-3.4.0 contract)

After the fix, `WHERE status = $env` with a constant `$env="prod"` interpolates to `WHERE status = prod` (raw, invalid unless `prod` is a column). To use a constant as a **value** the dashboard must quote it in SQL: `WHERE status = '$env'`. This is exactly how v3.3.1 behaved and is the documented ClickHouse-plugin convention (identifiers unquoted, values quoted by the author). PR #906's commit message calls this out as `BREAKING` relative to 3.4.x auto-quoting. This is acceptable and is the point of the issue: the plugin's contract is "single-value variables are raw; you quote values yourself", and 3.4.x silently broke it.

### 4.4 Alternatives considered

- **A. Relax to falsy (PR #906) — RECOMMENDED.** One line, type-safe (only touches `undefined` types), restores documented pre-3.4.0 behavior, keeps #712/#847/#797/#827/#829/#838. Con: reverts value-position auto-quoting for constants (intended).
- **B. Type-aware guard**, e.g. also return raw when `variable.type` is one of `constant|textbox|interval|switch`. Pro: explicit intent. Con: functionally identical to A for every real case (those are exactly the `undefined` types), more code, must import/trust `variable.type` which is sometimes absent in tests/mocks. Falsy check is a cleaner proxy. Rejected in favor of A, but a `type`-based *fallback* could be added defensively if desired.
- **C. Keep strict guard, add a `constant`/`textbox` special-case only.** Narrower but leaves `interval`/`switch` quoted and diverges from the historical single guard; more branches. Rejected.
- **D. Do nothing, tell users `${var:raw}`** (Slach's comment). This is the current workaround; `${var:raw}` bypasses the custom format fn entirely and emits the raw value. Not a fix — it silently changed a documented default and every existing dashboard using `FROM $constant` is now broken until edited. Rejected as the resolution (but keep documenting it as an interim workaround).

**Recommendation: A (PR #906).** Optionally fold in B's `variable.type` fallback as belt-and-suspenders, but it is not required.

---

## 5. Step-by-step implementation plan

1. **Branch.** Either review/rebase **PR #906** (`fix/single-value-raw-passthrough`, commit `199b16ff`) onto current `master`, or create `fix/905-constant-raw-passthrough` from `master`.
2. **Edit** `src/datasource/helpers/index.ts:460`: replace the strict guard `variable.multi === false && variable.includeAll === false` with the falsy guard `!variable.multi && !variable.includeAll` (keep `&& !Array.isArray(value)`). Update the comment to state the constant/textbox/`undefined` rationale (§4.1).
3. **Update JSDoc** for `interpolateQueryExpr` (`helpers/index.ts:403-448`): change the behavior table `multi/includeAll` column from `false`/`undef` split rows to a single `falsy` row, and fix the "`undefined → 'value' (quoted)`" example to `undefined → value (raw)`. (PR #906 already does this — copy it.)
4. **Update the unit tests** in `src/datasource/helpers/index.test.ts` that assert the *old quoting* for `undefined`/`undefined` single values (full list in §7.1). PR #906 already flips ~9 assertions; verify each against the matrix in §4.2 rather than blindly accepting.
5. **Add new regression tests** for the constant-identifier scenario and to lock the intended behavior (§7.2).
6. **Run** `npm run test` (or `jest src/datasource/helpers/index.test.ts`) and `npm run lint`. Confirm the `conditionalTest`, #712, #847, #829, #838, #797, #827 suites still pass unchanged (they should — those paths are before or independent of the guard).
7. **Manual smoke** (`docker compose up --no-deps -d grafana clickhouse`): create a `constant` variable `tbl = system.query_log` and a panel `SELECT count() FROM $tbl`; confirm it runs (no `FROM 'system.query_log'`). Repeat with a `textbox` variable. Then confirm a `query` multi-var in `IN ($svc)` still quotes, and a repeated panel still quotes.
8. **Commit** referencing #905 (and note it supersedes/matches PR #906). PR body should state: root cause (`undefined` multi/includeAll on constant/textbox), offending commit `09b7b96a` (v3.4.0) reshaped by `a2bc047f` (v3.4.5), the falsy relaxation, the type-safety argument (§2), and the documented value-position trade-off (§4.3).

---

## 6. Effort breakdown

| Sub-task | Estimate |
|---|---|
| Edit guard + JSDoc (`helpers/index.ts`) | 0.1 h |
| Update ~9 existing test assertions | 0.5–1 h |
| Add 4–6 new regression tests (constant/textbox identifier; matrix rows 3/5/7) | 1–1.5 h |
| Run jest + lint, fix fallout | 0.5 h |
| Manual smoke in Grafana (constant, textbox, query-multi IN, repeated) | 1 h |
| **Total** | **~0.5 day (Small)** |

---

## 7. Test plan

### 7.1 Existing assertions that MUST be updated (they currently encode the bug)

These assert quoting for `undefined`/`undefined` single values and become raw after the fix. Line numbers are current HEAD (`src/datasource/helpers/index.test.ts`); PR #906 already changes exactly these — cross-check:

| Line | Test | Old expected | New expected |
|---|---|---|---|
| 5-9 | `should quote single variables when multi/includeAll are undefined` | `"'testvalue'"` | `"testvalue"` (rename test) |
| 91-98 | `should quote variables in WHERE clauses` | `"'testname'"` | `"testname"` (rename — WHERE value position now raw) |
| 203 | mixed concat/non-concat: `serviceVar` | `"'myservice'"` | `"myservice"` |
| 213 | empty-query edge case | `"'value'"` | `"value"` |
| 222 | undefined-variable-name edge case | `"'value'"` | `"value"` |
| 241 | values-with-dots edge case | `"'my.host.com'"` | `"my.host.com"` |
| 399 | regex-pattern variable | `"'/^prefix_.*/'"` | `"/^prefix_.*/"` |
| 640-649 | backward-compat: `multi=undefined` | `"'testvalue'"` | `"testvalue"` |
| 664-683 | "only change behavior for concatenation…" | `"'myvalue'"` in normal position | `"myvalue"` (retitle) |
| 720-733 | partially-replaced patterns: `serviceVar` | `"'api'"` | `"api"` |
| 757-770 | "should not interfere with backend macros": `tableVar` | `"'events'"` | `"events"` |

> ⚠️ Review note: some of these tests' *names/comments* claim "should have quotes" or "backward compatible". After the fix those names are misleading — rename them to reflect "raw passthrough (pre-3.4.0 semantics)" as PR #906 does. Do NOT weaken tests that assert quoting for a legitimate reason: keep #847 IN-clause single-value quoting (lines 837-867), #712 repeated (100-108, 805-818), and multi-value array quoting (17-21, 651-662) exactly as-is — verify they still pass.

### 7.2 New tests to add (lock the fix, prevent re-regression)

1. **Constant variable as identifier (the issue).** `interpolateQueryExpr('system.query_log', { name:'v', type:'constant', multi:undefined, includeAll:undefined })` → `'system.query_log'` **without** surrounding quotes (i.e. equals the raw string). Also via `interpolateQueryExprWithContext('SELECT count() FROM $v', [...])`.
2. **Textbox variable as identifier.** Same, `type:'textbox'` → raw.
3. **Constant still quoted inside IN clause (matrix row 3 / #847 interaction).** `interpolateQueryExprWithContext('WHERE x IN ($v)', ...)('prod', {type:'constant', multi:undefined, includeAll:undefined})` → `"'prod'"` (Priority 3 must win over the relaxed guard). This is the most important guardrail test — it proves the fix does not over-revert.
4. **Repeated panel still quoted (matrix row 5 / #712).** With `current.value` differing from the interpolated value so `isRepeated=true` → `"'mysql'"`. (Existing test at 805-818 already covers this; assert it is unchanged.)
5. **Query single-value variable unchanged (matrix row 6).** `{ type:'query', multi:false, includeAll:false }` single value → raw, identical before and after (regression guard for the "don't touch query vars" claim).
6. **Query multi-value unchanged (matrix rows 8/9).** `IN ($svc)` with `multi:true` array → `'a','b'`; `arrayIntersect` → `['a','b']`. (Existing #829/#838 suite; assert unchanged.)

### 7.3 Commands

```bash
npm run test                                   # or: jest src/datasource/helpers/index.test.ts
npm run lint
# manual: docker compose up --no-deps -d grafana clickhouse   → constant/textbox panel smoke
```

---

## 8. Risks / backward-compatibility

- **Type safety of the relaxation (low risk).** As shown in §2, `undefined`/`undefined` occurs *only* for `constant`/`textbox`/`interval`/`switch`. `query`/`custom`/`datasource` always send explicit booleans, so `!multi && !includeAll` gives them the same answer as `=== false`. The relaxation therefore cannot change `query`/`custom`/`datasource` behavior — it only re-enables raw passthrough for the four value types the issue names. This is the strongest argument that PR #906 is safe.
- **Value-position behavior change (intended, documented).** Constants/textboxes used as *values* (`WHERE x = $v`) revert to raw; dashboards relying on 3.4.x auto-quoting must add quotes (`= '$v'`). This restores the pre-3.4.0 contract but is a change *relative to 3.4.x*. Call it out in release notes. Note this is the mirror-image of the current bug: 3.4.x fixed nobody's value-quoting on purpose — the auto-quoting was an accidental side effect of the #712 branch mis-firing on constants.
- **#712 / #847 interaction (verified safe).** `isRepeated` (row 5) and IN-clause Priority 3 (row 3) both run *before/around* the relaxed guard, so repeated panels and single values inside `IN (...)` still quote. The two dedicated regression tests (§7.2 #3, #4) lock this.
- **`interval` / `switch` variables.** Now also raw. `interval` values (`1m`, `1h`) are almost always used raw in `$interval`-style positions, so raw is correct. `switch` is niche; raw is the historical behavior. No known regression.
- **`${var:raw}` workaround still works.** Grafana's built-in `raw` format modifier bypasses the custom format fn, so existing dashboards that adopted Slach's workaround keep working (they emit the raw value either way). No migration needed for them.
- **Numeric constants.** `clickhouseEscape` already passes pure numbers through raw, so `count() > $threshold` with a numeric constant was *not* affected by the bug (numbers were never quoted). The fix does not change numeric handling.
- **Backend / macros.** Unaffected — this is a pure frontend interpolation change; the backend never sees `$var`, only the already-substituted SQL.

---

## 9. Key file:line references

- `src/datasource/helpers/index.ts:460` — **the fix site** (strict `=== false` guard → falsy).
- `src/datasource/helpers/index.ts:449-474` — full `interpolateQueryExpr` body.
- `src/datasource/helpers/index.ts:453-455` — `isRepeated` (#712), runs first.
- `src/datasource/helpers/index.ts:240-287` — `interpolateQueryExprWithContext` priority chain (concat / IN-comma / IN-single / array / default).
- `src/datasource/helpers/index.ts:275-277` — Priority 3, IN single-value quoting (#847) — the guard that keeps constants quoted *inside* IN.
- `src/datasource/helpers/index.ts:162-193` — `clickhouseEscape` (the quoter).
- `src/datasource/datasource.ts:831-835` — main runtime interpolation call.
- `src/datasource/helpers/index.test.ts` — tests to update (§7.1) and extend (§7.2).
- `node_modules/@grafana/data/dist/types/types/templateVars.d.ts` — `ConstantVariableModel`/`VariableWithOptions` vs `VariableWithMultiSupport` (§2).
- Offending commits: `09b7b96a` "apply clickhouse dashboard fixes" (v3.4.0, introduced `=== undefined → quote`); `a2bc047f` "change isRepeat check behavior" (v3.4.5, reshaped to strict `=== false`). Pre-break reference: `git show v3.3.1:src/datasource/sql-query/sql-query-helper.ts:158`.
- Existing fix: **PR #906**, commit `199b16ff` on branch `fix/single-value-raw-passthrough` (not on master/HEAD).
