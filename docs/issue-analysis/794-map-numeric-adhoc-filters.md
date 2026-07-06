# Issue #794 — Numeric values in `Map(String,String)` log [+]/[-] adhoc filters break queries

> Deep-dive analysis. Repo: `Altinity/clickhouse-grafana` (TS frontend + Go backend). Branch analyzed: `feature/advanced-logs-field-settings`. **READ-ONLY analysis — no source modified.**

- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/794>
- **Title:** "numeric values in Map(String,String) log [+]/[-] adhoc filters, broke queries"
- **Author / state:** Slach (Eugene Klimov), collaborator. **OPEN**, no labels, filed 2025-05-21.
- **Body (verbatim core):** "we have field with `Map(String, String)`, but when there's a numerical value (even as a string) to be added to AdHoc filters via the button in a logs panel …, it adds it as numeric to the filters, breaking every query. It should not be converted. The screenshot shows it goes back to normal after adding quotes." (three screenshots, not readable here).
- **Comments:** `ADovgalyuk` asks whether the same happens for `value IN ($value)` with `(abc, 00101)` → `metrics_group_value IN ('abc',00101)`; `Slach` replies that is a different case, "not related to adhoc filters for Map field types," and asks for a separate issue. **So #794 is scoped strictly to the Map log [+]/[-] adhoc filter numeric-value case — the `IN ($value)` template-variable interpolation is explicitly out of scope.**

## Relation to #678

Issue #678 ("Complex types in Logs panel +/- filters and adhoc, doesn't work") is the umbrella issue for complex-type filter SQL generation; see `docs/issue-analysis/678-complex-types-filters.md`. #794 is a **narrow slice** of the #678 bug surface: specifically bug **(C) "numeric-looking string value left unquoted"** applied to a `Map(String,String)` leaf. That doc's §1.3 already names the exact defect (the `numericValueRegex` short-circuit in the value formatter) and its §9 "Phase 0" prescribes the type-aware quoting fix. **This document does not re-derive the #678 tiering/decoder design; it focuses only on: (a) whether the recent branch work closes #794, and (b) the residual gaps specific to the numeric-Map-value case.** Where #678 concepts are needed (leaf-type resolution, `system.columns` introspection) they are cited, not restated.

---

## 0. TL;DR

**Root cause.** The backend value formatter for adhoc filters historically quoted a `string` value *unless* it matched `^\s*\d+(\.\d+)?\s*$` (a numeric-looking string), in which case it emitted the value **unquoted**. For a `Map(String,String)` leaf whose value is the string `"200"`, this produced `_map['code'] = 200` — ClickHouse then compares a `String` map value against a `UInt`, raising `Illegal types of arguments` / `Cannot parse`. The `[+]/[-]` buttons and the adhoc-variable path both feed `query.adHocFilters` → the same backend `adhoc.ProcessAdhocFilters`, so both hit this.

**What the current branch ALREADY fixes.** The `feature/advanced-logs-field-settings` branch implements exactly the #678 "Phase 0 + Phase 1" plan and closes the **primary** #794 case:
- `pkg/adhoc_columns.go` introspects `system.columns` (cached, graceful-fallback) to learn each column's ClickHouse type.
- `pkg/adhoc/adhoc_filters.go` resolves the **leaf type** of a `Map(K,V)` subscript key (`leafTypeForKey` → `mapValueType`) and, when that leaf is a **string family** type, **force-quotes the value even if it looks numeric** (`formatAdhocValue`, the `isStringFamily` branch). So with introspection succeeding, `_map['code'] = '200'` is now emitted. **This is verified by existing tests** (`TestProcessAdhocFilters_TypeAwareQuoting`, `TestProcessAdhocFilters_StringFamilyNumericGoTypes`, `TestProcessAdhocFilters_StringFamilyNumericStringStillQuoted`) and all `pkg/adhoc` tests pass.

**What REMAINS (empirically confirmed gaps).**
1. **Introspection-failure fallback re-triggers the exact bug.** When `system.columns` cannot be read (permission denied, subquery/unresolvable FROM, cross-cluster/`remote()`, or a not-yet-cached transient error) `fetchColumnTypes` returns `nil`. Then `leafTypeForKey` returns `""`, the formatter falls back to the legacy `formatAdhocScalar`, and `_map['code'] = 200` is emitted **unquoted again**. Empirically reproduced below (§5). The fix is *type-aware* but not *type-safe-by-default*: it is correct only when the schema lookup works.
2. **Apostrophe / quote passthrough is still broken (and injectable) even with introspection ON.** For a `String`-family leaf, a value containing `'` or `, ` is emitted **raw, unquoted, unescaped** (`formatAdhocValue` string-family early-return at `adhoc_filters.go:224`, and the legacy scalar path). E.g. `name = O'Brien`. This is bug (D) from #678, unfixed. It is adjacent to #794 (a Map string value could contain a quote) and is a genuine SQL-injection vector.
3. **The frontend never carries the leaf type**, so there is no defensive quoting on the frontend and no way to disambiguate a numeric-looking Map string value without the backend lookup. (Design choice per #678 §2; acceptable, but it means gap #1 has no frontend safety net.)

**Recommendation.** **Ship the branch (it fixes the common case), then close gap #1** — the introspection-failure fallback — because that is where #794 silently regresses in real deployments (read-only Grafana users frequently lack `SELECT` on `system.columns`). Preferred approach: **quote-by-default for `string` values on the unknown-leaf path** (only leave unquoted when the value is a genuine JSON number `json.Number`/`float64`, not a numeric-looking *string*). This inverts the dangerous default without breaking numeric columns. Bundle gap #2 (escape instead of raw passthrough) in the same change.

**Effort.** **Small (S)** — a focused change in one file (`pkg/adhoc/adhoc_filters.go`) plus tests. No frontend change strictly required for the core fix. ~0.5 day.

---

## 1. Map of all relevant code

| Location | Symbol / role | Notes for #794 |
|---|---|---|
| `pkg/adhoc/adhoc_filters.go:18-19` | `numericValueRegex = ^\s*\d+(\.\d+)?\s*$` | **The defect's heart.** A numeric-looking *string* matches → emitted unquoted. |
| `pkg/adhoc/adhoc_filters.go:22-41` | `formatAdhocScalar(v)` | **Legacy fallback formatter.** String matching `numericValueRegex`, or containing `'` or `, `, is returned **raw** (`:29-33`). This is the path taken when leaf type is unknown. |
| `pkg/adhoc/adhoc_filters.go:127-140` | `mapValueType(colType)` | Extracts `V` from `Map(K, V)` (strips `Nullable`). Returns `""` if not a Map. |
| `pkg/adhoc/adhoc_filters.go:142-162` | `leafTypeForKey(colType, key)` | For a bracket key `col['k']` on a `Map(...)` column returns the Map value type; for a dot path returns `""`; else returns the column type. Returns `""` when `colType==""`. |
| `pkg/adhoc/adhoc_filters.go:164-177` | `isStringFamily(t)` | String/FixedString/LowCardinality/Enum/UUID/IPv4/IPv6 → always quote. |
| `pkg/adhoc/adhoc_filters.go:201-208` | `isNumericFamily(t)` | (U)Int*/Float*/Decimal* → unquote numeric-looking strings. |
| `pkg/adhoc/adhoc_filters.go:210-261` | `formatAdhocValue(v, leafType)` | **Type-aware formatter.** `leafType!="" && isStringFamily` → force-quote (`:218-239`), *but* early-returns raw for values containing `'` or `, ` (`:224-226`). `leafType==""` → delegates to `formatAdhocScalar` (`:257`) → **the bug's fallback path**. |
| `pkg/adhoc/adhoc_filters.go:271-365` | `ProcessAdhocFilters(filters, db, table, columns)` | Single SQL generator shared by all three call sites. Resolves `columnExpr`/`colType` (`:274-335`), computes `leaf := leafTypeForKey(...)` (`:348`), formats value (`:349-358`). |
| `pkg/adhoc_columns.go:42-61` | `parseColumnTypes(resp)` | Builds `name→type` from `system.columns` rows. |
| `pkg/adhoc_columns.go:71-127` | `fetchColumnTypes(ctx, pluginCtx, db, table)` | Introspects `system.columns` with `sync.Map` cache; **returns `nil` on any failure** (no client, query error, permission, nil resp) — the graceful-fallback contract that opens gap #1. Requires `db != "" && table != ""` (`:84`). |
| `pkg/resource_handlers.go:185-210` | `parseTargets(from, defDb, defTable)` | Resolves `(db, table)` from the FROM clause. Returns `("","")` for >2 dotted parts (subquery / complex FROM) → introspection skipped → gap #1. |
| `pkg/resource_handlers.go:375-376` | `handleApplyAdhocFilters` call site | `columns := ds.fetchColumnTypes(...)` then `ProcessAdhocFilters(..., columns)`. |
| `pkg/resource_handlers.go:616-617` | `handleProcessQueryBatch` call site | Same pattern. |
| `pkg/resource_handlers.go:1027-1028` | `handleCreateQueryWithAdhoc` call site | Same pattern. |
| `src/datasource/datasource.ts:292-329` | `toggleQueryFilter(query, filter)` | **The [+]/[-] handler.** Pushes `{ key: filter.options.key, value: filter.options.value, operator: '=' \| '!=' }` into `query.adHocFilters`. No type attached. Value comes straight from Grafana's log-detail label value. |
| `src/datasource/datasource.ts:331-333` | `queryHasFilter` | Toggle-state check. |
| `src/datasource/sql-series/toLogs.ts:44-196` | `toLogs(self)` | Builds the `labels` field (`FieldType.other`, `:176-180`) that powers the +/- buttons; label values originate from the parsed JSON response. |
| `src/datasource/sql-series/logsFieldModes.ts:3-47` | `transformObject` | First-level Map flatten → key `col['k']` (`:24`), value kept as-is primitive (`:31`). A `Map(String,String)` value `"200"` stays a **JS string** here. |
| `src/datasource/sql-series/logsFieldModes.ts:82-105` | `flattenDeep` / `expandFieldDeep` | Deep expand for nested maps; leaf primitive preserved (`:97`). |
| `src/datasource/sql-series/logsFieldModes.ts:68-80` | `pathStyleForType` | Map → `bracket`, JSON/Tuple/Nested → `dot`. Frontend/backend must agree (backend `isDotAccessible`). |
| `src/datasource/adhoc.ts:1-181` | `AdHocFilter` (GetTagKeys/GetTagValues) | Reads `type` from `system.columns` (`:14`) but only uses it for `Enum` (`:64-78`); the adhoc-variable value dropdown does not attach type to the filter. |

---

## 2. Root-cause analysis (the numeric-Map-value SQL path)

### 2.1 How the value reaches the backend as a numeric-looking string

1. A `Map(String,String)` column, e.g. `_map`, has a row value `{'code':'200'}`. ClickHouse returns it in JSON as an object with a **string** member: `"_map":{"code":"200"}`.
2. Frontend `toLogs` (`toLogs.ts:107`) runs the field through `renderFieldByMode(... 'expand' ...)` → `expandFieldDeep` → `flattenDeep`, producing label `_map['code']` = `"200"` (a JS string; the leaf primitive is preserved verbatim at `logsFieldModes.ts:97`). `transformObject` (`:117`) is a further identity-ish pass. **The value is a JS string `"200"` throughout.**
3. Grafana renders the label in the logs detail view. Clicking [+] calls `toggleQueryFilter` (`datasource.ts:292`), which pushes `{ key: "_map['code']", value: "200", operator: "=" }`. Grafana's adhoc model only carries primitives — **no type metadata travels with the filter.**
4. The filter is serialized to the backend resource handler; the JSON value `"200"` is decoded into a Go `string` (`AdhocFilter.Value interface{}`, `adhoc_filters.go:15`). (Note: if it had been an unquoted JSON number it would decode to `json.Number`/`float64` — but for `Map(String,String)` it is always a JSON string.)

### 2.2 The original (pre-branch) defect

Historically `ProcessAdhocFilters` formatted the value with logic equivalent to today's `formatAdhocScalar` (`adhoc_filters.go:22-41`):

```go
case string:
    if numericValueRegex.MatchString(val) ||   // "200" matches → returned RAW
        strings.Contains(val, "'") ||
        strings.Contains(val, ", ") {
        return val                              // ← "200" emitted unquoted
    }
    ...
    return fmt.Sprintf("'%s'", escaped)
```

→ `_map['code'] = 200`. ClickHouse: `String` (the map value) vs `UInt16` (the literal `200`) → error. **This is exactly what the issue describes** ("adds it as numeric … breaking every query"), and the reporter's screenshot workaround (manually adding quotes) confirms `= '200'` is the correct form.

### 2.3 Why [+]/[-] and adhoc-variable both hit it

Both paths converge on `query.adHocFilters` and then `ProcessAdhocFilters` (three identical call sites: `resource_handlers.go:376, 617, 1028`). There is one SQL generator; fixing it fixes both. (Confirmed in #678 §1.1/§7.)

---

## 3. Already-fixed-on-branch assessment (commit by commit)

The branch closes the **primary** #794 case. Relevant commits, oldest→newest:

| Commit | What it does | Effect on #794 |
|---|---|---|
| `5cff2ca2` "preserve big-number precision in adhoc array/scalar formatting" | Adds a `json.Number` case to `formatAdhocScalar`; uses `json.NewDecoder+UseNumber` in `tryArrayLiteral`. | Tangential. Prevents `%g` precision loss for genuine numbers; does not change string-quoting behavior. |
| `13d4578c` "column/type-aware adhoc filters (keep dot-path keys, quote by column type)" | Adds `columns map[string]string` param to `ProcessAdhocFilters`; base-column resolution (`baseColumnName`, dot vs bracket), `leafTypeForKey`, `mapValueType`, `isStringFamily`, `isNumericFamily`, first version of `formatAdhocValue`. | **Core fix.** When the Map leaf resolves to `String`, numeric-looking string values are force-quoted. This is the mechanism that closes the on-screen #794 case. |
| `84bcb091` "apply string-family quoting to numeric Go types; reuse numeric regex" | Moves the `leafType!="" && isStringFamily` gate to the **top** of `formatAdhocValue` (`:218`) so `json.Number`/`float64` values destined for a String leaf are also quoted; factors out `numericValueRegex`. | **Hardens** the fix: even if a Map value arrived as a JSON number it is still quoted for a String leaf. |
| `80effbd7` "introspect system.columns to make adhoc filters type-aware (graceful fallback)" | Adds `pkg/adhoc_columns.go` (`fetchColumnTypes` + cache) and wires it into all three resource call sites. | **Enables** the fix in production: the `columns` map is now populated from live schema. **Also the source of gap #1** — the graceful-fallback returns `nil` on failure. |
| `e52bbf7b` "classify Dynamic/Variant as single-mode configurable fields" | Frontend `logsFieldModes` only (modal UX). | No effect on #794 SQL. |
| `cc0cd34b` "quote 64-bit ints for logs queries only" | Enables `output_format_json_quote_64bit_integers=1` for `format==='logs'`. | Tangential but relevant: makes CH return `UInt64/Int64` **as strings** for logs, so large numeric *labels* keep precision. This means a `Map(String,Int64)` numeric leaf now arrives as a *string* — and is correctly unquoted by the `isNumericFamily` branch (`formatAdhocValue:247-254`). Does not affect `Map(String,String)`. |
| `78610c77` "gate array-literal conversion by column type" | `ProcessAdhocFilters` only calls `tryArrayLiteral` when leaf is `Array(...)` or unknown (`:350`). | Prevents a `String` value that *looks* like `[...]` from being rewritten into an array literal. Adjacent hardening; not the #794 numeric case. |

**Net:** with introspection succeeding, `_map['code'] = '200'` is produced, verified by:
- `TestProcessAdhocFilters_TypeAwareQuoting` (`adhoc_filters_test.go:492-521`): `_map['code'] = '200'` for `Map(String,String)`; `metrics['lat'] = 50` for `Map(String,Float64)`.
- `TestProcessAdhocFilters_StringFamilyNumericGoTypes` (`:610-645`): quotes `json.Number("200")` and `float64(200)` for a String-leaf Map.
- `TestProcessAdhocFilters_StringFamilyNumericStringStillQuoted` (`:780-791`): `status = '200'` for a `String` column.
- `TestLeafTypeForKey` (`:525-547`) and `TestMapValueType` (`:550-570`): leaf-type resolution for Map subscripts, incl. `Nullable(Map(...))`.

All `pkg/adhoc` tests pass (`go test ./pkg/adhoc/...` → `ok`).

---

## 4. Remaining gaps (with exact file:line)

### Gap 1 — Introspection-failure fallback re-emits the unquoted bug (PRIMARY residual)

**Trigger conditions (any one):**
- The Grafana user's ClickHouse account lacks `SELECT` on `system.columns` → `client.Query` errors → `fetchColumnTypes` returns `nil` (`adhoc_columns.go:111-115`). This is common for locked-down read-only dashboard users.
- The FROM clause is a subquery or otherwise resolves to >2 dotted parts → `parseTargets` returns `("","")` (`resource_handlers.go:200-203`); handlers still call `fetchColumnTypes("","")` which returns `nil` at the `database=="" || table==""` guard (`adhoc_columns.go:84`). (In the `handleApplyAdhocFilters` path an empty db+table also short-circuits to an error response at `:363`, but `handleProcessQueryBatch`/`handleCreateQueryWithAdhoc` proceed with nil columns for a resolvable-but-unintrospectable table.)
- `remote()` / cross-cluster / a table that exists logically but not in the queried node's `system.columns`.
- First request for a table when the introspection query itself transiently fails (nil is **not** cached, so it retries — but the in-flight request still ran with nil).

**Consequence:** `columns` is `nil` → `ProcessAdhocFilters` never resolves `colType` for the base column (`:279` guard `len(columns) > 0` is false) → `colType == ""` → `leafTypeForKey` returns `""` (`:146-148`) → `leaf == ""` → `formatAdhocValue(v, "")` → `formatAdhocScalar` (`:257`) → `numericValueRegex` matches `"200"` → **`_map['code'] = 200` (unquoted, broken).**

**Empirically reproduced** (§5): with `columns == nil`, `ProcessAdhocFilters([{Key:"_map['code']",Op:"=",Value:"200"}], "default","logs", nil)` → `["_map['code'] = 200"]`.

**This is the same bug #794 reports**, resurfacing exactly where the safety net (schema lookup) is unavailable — a class of environment (restricted read-only users) that is *more* likely than average to hit it.

### Gap 2 — Quote/apostrophe passthrough is still raw & injectable (even introspection ON)

`formatAdhocValue` string-family branch early-returns the value **raw** when it contains `'` or `, ` (`adhoc_filters.go:224-226`), and `formatAdhocScalar` does the same (`:29-33`). So:
- `name = O'Brien` (verified by `TestProcessAdhocFilters_StringFamilyApostrophePassthrough`, `:795-806`, which *asserts* the raw form as "legacy passthrough") → invalid SQL / injection.
- A `Map(String,String)` value like `it's 200` would emit `_map['code'] = it's 200` → broken.

The `, ` passthrough exists to let `IN ('a','b')` style values through (see `TestProcessAdhocFilters_StringFamilyINList`, `:764-775`), so it cannot be naively removed — the fix must distinguish an intended IN-list payload from a scalar value with a comma. This is bug (D) in #678; #794 does not strictly require it, but any robust value-quoting fix should escape scalars.

### Gap 3 — No frontend type awareness / defensive quoting

`toggleQueryFilter` (`datasource.ts:304-308`) attaches only `{value, key, operator}` — no type. `toLogs`/`adhoc.ts` know the CH type at label-build time (`chTypeByName`, `toLogs.ts:68-69`; `system.columns` in `adhoc.ts:14`) but do not thread it into the filter. Consequently there is **no frontend fallback** to protect gap #1, and the numeric-vs-string decision is entirely delegated to the backend introspection. This matches the #678 design decision (§2, "backend self-discovery is authoritative") and is acceptable — but it is why gap #1 has no second line of defense.

---

## 5. Empirical reproduction of the residual gaps

Run against the branch (throwaway test in `pkg/adhoc`):

```go
// Gap 1: introspection failed (columns == nil) → numeric Map string emitted UNQUOTED
ProcessAdhocFilters([]AdhocFilter{{Key:"_map['code']", Operator:"=", Value:"200"}}, "default","logs", nil)
// => ["_map['code'] = 200"]      ← BROKEN (the #794 bug, unquoted)

// Gap 2: apostrophe value on String leaf emitted RAW (introspection ON)
ProcessAdhocFilters([]AdhocFilter{{Key:"name", Operator:"=", Value:"O'Brien"}}, "default","logs",
    map[string]string{"name":"String"})
// => ["name = O'Brien"]          ← BROKEN / injectable
```

Both confirmed by execution (`go test ./pkg/adhoc/ -run TestGap -v`). Contrast the fixed case (introspection ON):

```go
ProcessAdhocFilters([]AdhocFilter{{Key:"_map['code']", Operator:"=", Value:"200"}}, "default","logs",
    map[string]string{"_map":"Map(String, String)"})
// => ["_map['code'] = '200'"]    ← CORRECT
```

---

## 6. Step-by-step implementation plan for the remaining gaps

The primary work is **Gap 1** (the introspection-failure fallback). Gap 2 is a small add-on. No frontend change is required.

### Step 1 — Invert the dangerous default in the unknown-leaf path (Gap 1)

**File:** `pkg/adhoc/adhoc_filters.go`, `formatAdhocValue` (`:210-261`) / `formatAdhocScalar` (`:22-41`).

**Principle:** A numeric-looking *string* should be quoted by default. Only a **genuine JSON number** (`json.Number` or `float64` — i.e. the value arrived *unquoted* in JSON, meaning the column really is numeric) should be emitted unquoted when the leaf type is unknown. This is safe because:
- For a `String`/`Map(String,String)` leaf, ClickHouse returns the value as a JSON **string**, so it decodes to a Go `string` → gets quoted. Correct.
- For a numeric column (`UInt`/`Int`/`Float`), the [+]/[-] value comes from a numeric field and (absent the logs 64-bit-quoting flag) arrives as a JSON number → `json.Number`/`float64` → unquoted. Correct.
- Edge: with `output_format_json_quote_64bit_integers=1` (logs, commit `cc0cd34b`), a `UInt64`/`Int64` label arrives as a *string*. Under quote-by-default it would become `'123456…'`. For a numeric column that is technically a string-vs-int comparison — **but ClickHouse implicitly casts a quoted integer literal to the numeric column type**, so `n = '123'` works for `n UInt64`. Verify this holds (it does in modern CH); if a target must avoid the cast, the correct-leaf-type path (introspection ON) already emits it unquoted, so this only affects the rare introspection-OFF numeric case. Document the trade-off.

**Concrete change** (illustrative — the implementer should TDD it): in the `case string:` arm of `formatAdhocValue` when `leafType == ""` (and in `formatAdhocScalar`), **remove the `numericValueRegex.MatchString(val)` short-circuit** so that a plain numeric-looking string is quoted+escaped rather than passed through. Keep the `json.Number`/`float64` arms unquoted (they represent genuine numbers). Net effect:
- `formatAdhocValue("200", "")` → `'200'` (was `200`).
- `formatAdhocValue(json.Number("200"), "")` → `200` (unchanged).
- `formatAdhocValue(float64(200), "")` → `200` (unchanged).

This closes Gap 1 without depending on introspection.

### Step 2 — Escape scalars instead of raw passthrough (Gap 2)

Replace the raw early-returns for `strings.Contains(val,"'")` with proper escaping (`'' ` doubling), **while preserving the IN-list carve-out**. Distinguish an IN-list payload (`operator == "IN"`/`"NOT IN"`, or value fully parenthesized `(...)`) from a scalar. For scalars, always `'<escaped>'`. Concretely:
- Keep the `, `/`IN` passthrough gated on the operator being an IN-family operator (thread `operator` into the formatter or pre-classify in `ProcessAdhocFilters`), not on a substring heuristic.
- For `=`/`!=`/`LIKE`/`NOT LIKE`/comparison operators, always quote+escape string values.
- Update `TestProcessAdhocFilters_StringFamilyApostrophePassthrough` to assert `name = 'O''Brien'` (the current test *codifies the bug*; it must be changed as part of the fix, with a comment explaining the correction).

### Step 3 — (Optional, defense-in-depth) attach leaf type on the +/- path

Only if maintainers want a frontend safety net for Gap 1: have `toLogs`/`transformObject` carry the CH leaf type alongside the label so `toggleQueryFilter` can attach `type` to the pushed filter, and add an optional `Type` field to `AdhocFilter`. This is the #678 "option 2" and is **not required** if Step 1 lands (quote-by-default already protects the introspection-OFF path). Recommend deferring unless a concrete need arises.

### Step 4 — Verify no regression to numeric columns / timeseries

Run the full backend suite plus a manual smoke (see §7). Pay special attention to `Map(String,Int*)`, `Map(String,Float*)`, plain numeric columns, and the logs 64-bit-quoting interaction.

---

## 7. Test plan

### 7.1 Backend unit tests — `pkg/adhoc/adhoc_filters_test.go`

Add cases (TDD: write RED first):

| # | key | columns (introspection) | op | value (Go type) | expected |
|---|---|---|---|---|---|
| 1 | `_map['code']` | **nil** (Gap 1) | = | `"200"` (string) | `_map['code'] = '200'` (was `= 200`) |
| 2 | `_map['code']` | nil | = | `json.Number("200")` | `_map['code'] = 200` (genuine number stays unquoted) |
| 3 | `_map['code']` | nil | = | `float64(200)` | `_map['code'] = 200` |
| 4 | `status` | nil | = | `"200"` (string) | `status = '200'` (plain col, introspection off) |
| 5 | `n` | `{"n":"UInt64"}` | = | `"200"` (string, from 64-bit logs quoting) | `n = 200` (leaf numeric → unquoted; regression guard) |
| 6 | `_map['code']` | `{"_map":"Map(String,String)"}` | = | `"200"` | `_map['code'] = '200'` (unchanged, keeps passing) |
| 7 | `metrics['lat']` | `{"metrics":"Map(String,Float64)"}` | = | `"50"` | `metrics['lat'] = 50` (unchanged) |
| 8 | `name` | `{"name":"String"}` | = | `"O'Brien"` (Gap 2) | `name = 'O''Brien'` (escaped, not raw) |
| 9 | `_map['k']` | `{"_map":"Map(String,String)"}` | = | `"it's 200"` (Gap 2) | `_map['k'] = 'it''s 200'` |
| 10 | `level` | `{"level":"String"}` | IN | `('error','warn')` | `level IN ('error','warn')` (IN-list carve-out preserved) |
| 11 | `_map['code']` | nil | != | `"200"` | `_map['code'] != '200'` |
| 12 | `_map['code']` | nil | =~ | `"20%"` | `_map['code'] LIKE '20%'` (LIKE value quoted, not over-escaped) |

Also **update** the existing `TestProcessAdhocFilters_StringFamilyApostrophePassthrough` (`:795-806`) — it currently asserts the buggy raw form; change to the escaped form with an explanatory comment. Keep all other existing tests green (they assert the introspection-ON behavior, which is unchanged).

Add helper tests if the formatter signature changes (e.g. if `operator` is threaded in): a `formatAdhocValue` table covering `("200","")→'200'`, `(json.Number("200"),"")→200`, `(float64(200),"")→200`.

### 7.2 Backend — introspection-failure integration

If feasible, add a test around `fetchColumnTypes` returning `nil` (already covered indirectly by `pkg/adhoc_columns_test.go`) plus a `ProcessAdhocFilters(..., nil)` assertion that no unquoted numeric string escapes. The unit cases in 7.1 (#1–#4, #11–#12) already encode this.

### 7.3 Frontend

No change required for the core fix. Existing `logsFieldModes.test.ts` and `toLogs.test.ts` already assert that Map values flatten to `col['k']` with primitive values preserved (`logsFieldModes.test.ts:120-122`). If Step 3 is pursued, add tests that `toggleQueryFilter` attaches the correct `type`.

### 7.4 E2E (optional, Playwright)

Reproduce the literal issue: a logs table with a `Map(String,String)` column holding numeric-string values (`{'code':'200'}`); click [+] on `_map['code']`; assert the generated SQL contains `_map['code'] = '200'` and the panel returns rows without a ClickHouse error — **with the introspecting user AND with a user lacking `system.columns` access** (to cover Gap 1). Heavier; the Go unit tests cover the core.

### 7.5 Commands

```bash
go test ./pkg/adhoc/... ./pkg/...     # backend
npm run test                           # frontend (should be unaffected)
npm run lint
```

---

## 8. Risks / edge cases

| Case | Behavior after the proposed fix | Risk / note |
|---|---|---|
| `Map(String,String)` numeric string, introspection ON | `= '200'` | Already fixed on branch; unchanged. |
| `Map(String,String)` numeric string, introspection **OFF** | `= '200'` | **The fix.** Quote-by-default for string values. |
| `Map(String,Int64)` value, introspection ON | `= 200` (leaf numeric) | Unchanged; correct. |
| `Map(String,Int64)` value, introspection **OFF** | `= '200'` if value arrived as string; `= 200` if `json.Number` | With logs 64-bit quoting the value is a string → `'200'`. Relies on CH casting a quoted int literal to the numeric map value (works in modern CH). Document; low risk. |
| Plain numeric column `n UInt64`, introspection OFF, string value | `n = '200'` | CH implicit-casts quoted int to UInt. Verify against the minimum supported CH version. If a regression appears, the introspection-ON path already emits `200`. |
| Value with apostrophe (`O'Brien`, `it's`) | `'O''Brien'` (escaped) | Fixes Gap 2 / injection. Must preserve the IN-list carve-out — gate on operator, not substring. |
| IN-list payload `('a','b')` | `IN ('a','b')` (passthrough) | Must NOT be quoted-as-scalar; gate on `IN`/`NOT IN` operator. |
| `Map(String, Int)` vs `Map(String, Int64)` etc. | leaf resolved by `mapValueType` → `isNumericFamily` | Covered; unquoted for numeric leaves. |
| **Nested** `Map(String, Map(String,String))` leaf `_map['a']['b']` | leaf type resolution currently only handles single-level Map (`leafTypeForKey` checks `strings.Contains(key,"[")` and returns `mapValueType` of the **outer** column) | **Pre-existing limitation, out of #794 scope** but note it: a nested-map string leaf resolves the *outer* Map's value type (`Map(String,String)`), not the innermost scalar — for a `Map(String,Map(String,String))` the outer value type is `Map(String,String)`, which is not a string family, so `leaf` is that Map type → `isStringFamily` false → falls to legacy scalar → **could unquote a nested numeric string**. Tracked under #678 Phase 2; flag it but do not fix here unless requested. |
| `JSON`/`Object` dot-path numeric string leaf (`j.a.b`) | `leafTypeForKey` returns `""` for dot paths (`:157-158`) → legacy scalar | With the Step 1 fix, a numeric-looking string is now quoted (`j.a.b = '200'`). For a JSON numeric field this may over-quote; JSON comparisons in CH tolerate quoted literals via implicit cast in most cases. Acceptable given #794 scope; the #678 Tier-3 `toString()` floor is the long-term answer. |
| `Dynamic`/`Variant` leaf | Not Map/dot-accessible; falls to legacy scalar | Step 1 fix quotes numeric strings. Reasonable default. |
| `LowCardinality(String)` / `Nullable(String)` Map value | `isStringFamily` unwraps `Nullable`; matches `LowCardinality(` prefix | Quoted. Correct. |
| Value with wildcard for LIKE (`=~` → `LIKE`) | quote the surrounding literal, do not escape `%`/`_` | Ensure LIKE values are not over-escaped (only quote-doubling for `'`). |
| Big integer precision | `json.Number`/array literal preserved by `5cff2ca2`/`cc0cd34b` | Unaffected by the string-quoting change. |

---

## 9. Effort & recommendation

| Sub-task | Estimate |
|---|---|
| Step 1 (quote-by-default for unknown-leaf string values) + tests | 2–3 h |
| Step 2 (escape scalars, preserve IN-list) + update existing test | 1–2 h |
| Run suites, lint, manual smoke (incl. restricted-user path) | 1 h |
| **Total** | **~0.5 day (S)** |

**Recommendation: implement Steps 1 & 2.** The branch already resolves the common #794 case (introspection ON), and that alone is shippable and closes the reporter's screenshot scenario. But Gap 1 means the bug silently returns for exactly the restricted read-only Grafana users who most often view dashboards without `system.columns` access — so the introspection-failure fallback must be made safe-by-default (quote numeric-looking strings; only leave genuine JSON numbers unquoted). Bundle the apostrophe-escaping fix (Gap 2) to close the injection vector. Frontend type-threading (Gap 3 / Step 3) is optional and can be deferred. Nested-map and JSON-dot leaf typing are #678 follow-ups, explicitly out of #794 scope.

---

### Key file:line references
- `pkg/adhoc/adhoc_filters.go:18-19` — `numericValueRegex` (defect root).
- `pkg/adhoc/adhoc_filters.go:22-41` — `formatAdhocScalar` (legacy fallback; the unquote path).
- `pkg/adhoc/adhoc_filters.go:210-261` — `formatAdhocValue` (type-aware formatter; `isStringFamily` gate `:218`, raw quote passthrough `:224-226`, unknown-leaf delegate `:257`).
- `pkg/adhoc/adhoc_filters.go:142-162` — `leafTypeForKey`; `:127-140` — `mapValueType`; `:164-177` — `isStringFamily`; `:201-208` — `isNumericFamily`.
- `pkg/adhoc/adhoc_filters.go:271-365` — `ProcessAdhocFilters` (leaf compute `:348`, value format `:349-358`).
- `pkg/adhoc_columns.go:71-127` — `fetchColumnTypes` (nil-on-failure contract → Gap 1); `:84` db/table guard.
- `pkg/resource_handlers.go:185-210` — `parseTargets`; `:375-376, 616-617, 1027-1028` — the three `ProcessAdhocFilters` call sites.
- `src/datasource/datasource.ts:292-329` — `toggleQueryFilter` ([+]/[-] handler, no type attached).
- `src/datasource/sql-series/logsFieldModes.ts:3-47` (`transformObject`), `:82-105` (`flattenDeep`) — Map value stays a JS string.
- `src/datasource/sql-series/toLogs.ts:44-196` — labels field emission.
- Tests already covering the fixed case: `pkg/adhoc/adhoc_filters_test.go:492-521, 610-645, 780-791`; the bug-codifying test to update: `:795-806`.
