# Issue #793 — check XY chart visualization for table

Deep-dive analysis against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/793>
- Status at time of writing: **OPEN**, author `Slach` (Eugene Klimov), 2025-05-19, **no comments**.
- Full issue body (verbatim): *"X, Y, Color - color doesn't work"*.
- Title: *"check XY chart visualization for table"*.

This is a maintainer's own reminder-style verification task: confirm the plugin's `format: table` output renders correctly in Grafana's **XY chart** panel, and specifically investigate why the **Color** dimension "doesn't work."

---

## 0. TL;DR

**Predicted verdict: PARTIALLY COMPATIBLE. The reported "color doesn't work" is expected behavior, not a plugin bug — but the plugin does have a real, adjacent bug that breaks X/Y/Color for several common numeric ClickHouse types.**

Two independent things are going on:

1. **"Color doesn't work" — most likely NOT fixable in this plugin.** Grafana's XY chart Color dimension **only accepts `number` fields** (docs: *"Only supports `number` fields"*; source filters color candidates to `FieldType.number`, explicitly excluding time/string/enum). There is **no color-by-category (string)** support in the panel (open upstream request grafana/grafana#117000). So if the user tried to color points by a *string* column (e.g. a hostname/category), it will never work regardless of what the plugin emits. This is a Grafana limitation. The plugin's job is only to make numeric columns arrive as **real numbers** so they are *selectable* as the color source.

2. **A genuine plugin bug that WILL break XY chart (incl. Color) for common numeric types.** In `format: table` the frontend type-mapper `_toJSTypeInTable` (`src/datasource/sql-series/toTable.ts:12`) whitelists only a **fixed set** of numeric ClickHouse types and defaults everything else to `'string'`. It **misses**: parametrized `Decimal(P,S)` / `Decimal64(S)` / `Decimal128(S)`, `UInt64`/`Int64` (by design, for precision — issue #832), `Int128/256`, `UInt128/256`, and any `LowCardinality(<numeric>)`. A column emitted as a *string* becomes `FieldType.string` and is then **not selectable** as X, Y, Size, or Color in XY chart, and can even break the color pipeline (grafana/grafana#98233: a numeric string throws in `alpha()`). Note the mapper here is stricter than the plugin's *other* type mapper `_toFieldType` (`src/datasource/sql-series/sql_series.ts:73`), which treats **all** `Decimal*`/`Int*`/`UInt*` as `FieldType.number`. The inconsistency is the root cause of the numeric-type gap in table mode.

**What to verify (docker):** run 3 table queries (all-numeric, Decimal-heavy, string-category) into an XY chart panel and observe which columns appear in the X/Y/Color dropdowns and whether color renders. Predicted: bare `Float64`/`Int32` work; `Decimal(18,4)`/`UInt64`/`LowCardinality(UInt32)` are missing from dropdowns (string-typed); string category never colors.

**Recommendation:** (a) File/confirm that "color by string category" is a Grafana limitation and close that half as wontfix (or document it). (b) **Fix** `_toJSTypeInTable` to recognize parametrized `Decimal(...)`, `LowCardinality(...)` unwrapping, and wide ints, aligning it with `_toFieldType`, so those columns become numeric and thus selectable for X/Y/Color/Size. Keep the UInt64/Int64 precision-string behavior value-driven (already partially done via `is64BitIntegerType`), and extend it to parametrized `Decimal(P,S)`.

**Effort: SMALL–MEDIUM (~0.5–1 day)** — one focused frontend function plus tests; the Color-by-category half is documentation only.

---

## 1. Background — Grafana XY chart data requirements

Verified against current Grafana docs (`grafana.com/docs/.../visualizations/xy-chart/`) and source (`public/app/plugins/panel/xychart/utils.ts`, `scatter.ts`). The `xychart` panel went GA in Grafana 10.4 and the rules below are stable 10.4–12.x.

| Dimension | Accepted field type(s) | Notes |
|---|---|---|
| **X** | `number` **or** `time` | Matcher first filters to `FieldType.number \|\| FieldType.time`; default picks the first such field in a frame. |
| **Y** | `number` **only** | `onlyNumFields = fields.filter(f => f.type === FieldType.number)`. In Auto mode, every remaining number field becomes its own Y series. |
| **Size** | `number` **only** | Same `onlyNumFields` set. |
| **Color** | `number` **only** | Docs: *"Only supports `number` fields."* Source comment: *"only grabbing number fields (exclude time, string, enum, other)."* String columns are excluded **before** matching → not even offered in the dropdown. |

Key structural facts:

- **Per-frame matching (critical).** X/Y/Color/Size are all resolved **inside a single frame's `frame.fields`** (`frames.forEach((frame) => …)` in `utils.ts`). There is **no cross-frame join** in the panel. If a datasource emits **each column as its own separate one-field DataFrame**, the panel cannot bind Y/Color/Size (they must live in the *same* frame as X). The fix in that scenario is a single wide frame (one table) or a "Join by field" transform.
- **`meta.preferredVisualisationType` is irrelevant** to XY chart — it does not gate on it.
- **Numeric strings are not numbers.** A `FieldType.string` field containing `"123"` is *not* selectable for any numeric dimension, and even when forced through can crash the color pipeline (grafana/grafana#98233 — `colorManipulator.alpha()` fails on a stringified float).
- **No color-by-string-category.** Color is a numeric gradient/threshold scale only. Categorical coloring is an open feature request: grafana/grafana#117000. Related closed issues: #93240 (fixed color override on the field silently breaks color-by-value), #85978 (time-as-color renders flat), #64463 (categorical/RGB color not supported), #95446 (color coupled to Y).

**Consequence for this plugin:** to be usable in XY chart, `format: table` output must (1) deliver one wide frame with all columns (it does — see §2), and (2) type genuinely-numeric columns as `number`, not `string` (it does **not**, for several types — see §3).

---

## 2. Map of all relevant code

### 2.1 The live query path for `format: table` is the FRONTEND parser (not the Go backend)

The plugin extends `DataSourceWithBackend` but **overrides `query()`** with a custom frontend path that fetches raw ClickHouse JSON from a backend *resource* endpoint and parses it in TypeScript. So for table format, the Go `toFramesTable` is **not** the code that produces the panel's frames — `SqlSeries.toTable()` is.

| Location | Symbol | Role |
|---|---|---|
| `src/datasource/datasource.ts:496` | `query()` | Overrides the base class; routes to `executeQueries` (regular) or streaming. |
| `src/datasource/datasource.ts:446-483` | `executeQueries()` | Builds SQL, calls `seriesQuery()` per target → raw CH JSON, then `processQueryResponse()`. |
| `src/datasource/datasource.ts:335-444` | `processQueryResponse()` | Dispatches by `target.format`. **`table` → `sqlSeries.toTable()`** (`:364-367`). |
| `src/datasource/sql-series/sql_series.ts:143-146` | `SqlSeries.toTable` | Thin wrapper → `toTable(self)`. |
| **`src/datasource/sql-series/toTable.ts:75-110`** | **`toTable()`** | **Builds the table result.** Emits legacy `{ columns:[{text,type}], rows, type:'table' }`. |
| **`src/datasource/sql-series/toTable.ts:12-38`** | **`_toJSTypeInTable()`** | **The type-mapper under investigation.** ClickHouse type → `'number'` \| `'string'`. |
| `src/datasource/sql-series/toTable.ts:40-56` | `_formatValue()` | Coerces cell value: `'number'` → `Number(value)`, else as-is. |
| `src/datasource/sql-series/toTable.ts:62-73` | `_allValuesSafe()` | For 64-bit ints: are all values JS-safe? |
| `src/datasource/sql-series/bigIntUtils.ts:74-117` | `is64BitIntegerType()` | True for `UInt64`/`Int64`/`Decimal64*`/`Decimal128*` (+ `Nullable`/`LowCardinality` unwrap, `Array(Tuple(...))`). |
| `src/datasource/sql-series/bigIntUtils.ts:17-57` | `isSafeInteger()` | String/number within ±2^53−1. |
| `src/datasource/sql-series/sql_series.ts:73-106` | `_toFieldType()` | The **other** (timeseries/logs) mapper — treats **all** `Decimal*`/`Int*`/`UInt*` as `FieldType.number`. Not used by table. |

### 2.2 The legacy table structure → DataFrame

`toTable()` returns the **legacy Grafana `TableModel` shape** `{ columns, rows, type: 'table' }`, not a modern `DataFrame`. Grafana's query pipeline (`DataSourceWithBackend`/`toDataFrame`) converts this legacy table into **one wide DataFrame** whose field `FieldType` is derived from each column's `type` string (`'number'` → `FieldType.number`, `'time'` → `FieldType.time`, else `FieldType.string`). This is **good** for XY chart's per-frame requirement (§1): a single table becomes a single wide frame, so X/Y/Color can bind across columns. The failure mode is therefore **not** the multi-frame problem — it is purely the per-column `type` string that `_toJSTypeInTable` assigns.

> Note: `toTable()` uses its own `'number'`/`'string'` string, **not** `FieldType` and **not** `_toFieldType`. So the richer `_toFieldType` logic (Decimal/Int/UInt → number) does not apply in table mode.

### 2.3 Backend (reference only — not on the table render path)

| Location | Symbol | Role |
|---|---|---|
| `pkg/response.go:278-309` | `toFramesTable` | Backend table framing: **one frame per column** (`framesMap[field.Name] = data.NewFrame(field.Name, …)`, `:291`). If ever used for a panel, this WOULD hit the multi-frame XY problem. |
| `pkg/response.go:57-65` | `getTimestampFieldIdx` | Presence of a `DateTime*` (or `t`+Int) field routes to the timeseries framing instead of table. |
| `pkg/parser.go:137-182` | `NewDataFieldByTypeOptimized` | Backend CH type → frame field type. `Decimal*` → float64; `UInt64/Int64` → string (large) or float64. |

The backend path is documented for completeness and in case a future change routes table rendering through Go frames; the current, observed behavior for `format: table` panels is the frontend `toTable()`.

### 2.4 Test dashboards / e2e

- **No XY chart example** exists under `docker/grafana/dashboards/` (grep for `xychart`/`scatter` → none). Closest analog: `docker/grafana/dashboards/table_examples_dashboard.json` (table panels, incl. a `UInt64 as number` panel).
- Provisioned datasource: name `clickhouse` (`docker/grafana/provisioning/datasources/clickhouse.yaml:4`). Dashboards auto-load from `/var/lib/grafana/dashboards` (`docker/grafana/provisioning/dashboards/grafana-dashboards.yaml:24`).
- **e2e is Cypress + grafana-e2e**, not Playwright (`package.json:14` → `grafana-e2e run`). CLAUDE.md's Playwright description is stale; there are no `.spec.ts` e2e files, only `tests/e2e/visual/ci/`. Unit tests are Jest under `src/spec/` and co-located (e.g. `bigIntUtils.spec.ts`). There is currently **no** `toTable` unit test.

---

## 3. Static analysis — type-mapping table & predicted issues

### 3.1 `_toJSTypeInTable` (`toTable.ts:12-38`) — what maps to numeric vs string

The function `switch`es on the **exact** type string and returns `'number'` only for this whitelist; **everything else falls to `'string'`**:

`UInt8/16/32`, `Int8/16/32`, `Float32/64`, `Decimal`, `Decimal32`, and the `Nullable(...)` of each of those.

Then `toTable()` (`:86-90`) applies a **value-based rescue**: if a column is still `'string'` **and** `is64BitIntegerType(type)` is true, and *all* its values are JS-safe, it is upgraded to `'number'`.

Resulting effective mapping for XY-chart selectability:

| ClickHouse type | `_toJSTypeInTable` | `is64BitIntegerType` rescue? | Effective JS type | Selectable as X/Y/Color? | Correct for XY? |
|---|---|---|---|---|---|
| `Float64`, `Float32` | `number` | — | number | ✅ | ✅ |
| `Int8/16/32`, `UInt8/16/32` | `number` | — | number | ✅ | ✅ |
| `Decimal` (bare), `Decimal32` | `number` | — | number | ✅ | ✅ |
| `Nullable(Float64)` etc. (whitelisted) | `number` | — | number | ✅ | ✅ |
| **`Decimal(P,S)`** (parametrized, the common form) | **`string`** | **no** (needs `Decimal64`/`Decimal128` prefix) | **string** | ❌ | **BUG** |
| **`Decimal64(S)` / `Decimal128(S)`** | `string` | ✅ (if all safe) | number (safe) / string (unsafe) | ⚠️ only if small values | partial |
| **`UInt64` / `Int64`** | `string` | ✅ (if all safe) | number (safe) / string (large) | ⚠️ only if all < 2^53 | partial (by #832 design) |
| **`Int128/256`, `UInt128/256`** | **`string`** | **no** | **string** | ❌ | **BUG** (though usually huge anyway) |
| **`LowCardinality(UInt32)`** and other `LowCardinality(<numeric>)` | **`string`** | **no** (`_toJSTypeInTable` doesn't unwrap LowCardinality) | **string** | ❌ | **BUG** |
| `Nullable(Int64)` / `Nullable(UInt64)` | `string` | ✅ (unwraps Nullable) if safe | number/string | ⚠️ | partial |
| `Nullable(Decimal(P,S))` | `string` | no | string | ❌ | **BUG** |
| `String`, `Enum`, `UUID`, `FixedString`, `IPv4/6` | `string` | no | string | ❌ (by nature) | ✅ (correctly non-numeric) |
| `DateTime*` / `Date*` | `string` | no | string | X only if time; here **string** | ⚠️ see §3.3 |

### 3.2 Predicted issues (ranked)

- **P1 — `Decimal(P,S)` parametrized decimals become string (real bug).** `SELECT toDecimal64(x, 4) AS v` reports type `Decimal(18, 4)` (ClickHouse uses parametrized names in `X-ClickHouse-Format` JSON meta). `_toJSTypeInTable` matches neither `Decimal` nor `Decimal32` exactly, and `is64BitIntegerType` only matches literal prefixes `Decimal64`/`Decimal128` — the JSON meta uses `Decimal(P, S)` form, so **the rescue also misses it**. Result: the column is a `FieldType.string`, invisible to X/Y/Color/Size dropdowns. This is the most impactful correctness gap for XY chart.
- **P2 — `LowCardinality(<numeric>)` becomes string (real bug).** `_toJSTypeInTable` does not strip `LowCardinality(...)` (unlike `is64BitIntegerType` and `NewDataFieldByTypeOptimized`), so `LowCardinality(UInt32)` etc. → string. `is64BitIntegerType` would only rescue if the inner type were 64-bit.
- **P3 — `UInt64`/`Int64` are string unless every value is JS-safe (partial, mostly by design).** For real XY use cases (IDs, counters) values often exceed 2^53−1 → string → unusable as numeric axis. This is the #832 precision trade-off; XY chart just cannot use those columns. Acceptable but should be documented; a Decimal/float cast is the user workaround.
- **P4 — "Color doesn't work" for a string/category column (Grafana limitation, NOT a plugin bug).** If the user's Color column is any `String`/`Enum`/`LowCardinality(String)`, XY chart cannot color by it at all (numeric-only Color; #117000 open). Even a *numeric* column hit by P1/P2 would be string-typed and thus also unavailable for Color — so P1/P2 can *masquerade* as "color doesn't work" when the user picked, say, a `Decimal(18,4)` value to color by.
- **P5 — value coercion is fine but doesn't upgrade the declared type.** `_formatValue` only calls `Number()` when `col.type === 'number'`. A P1/P2 string column stays a string even though its cells are numeric. So the fix must live in `_toJSTypeInTable`/the rescue, not `_formatValue`.
- **P6 — inconsistency with `_toFieldType`.** The timeseries mapper (`sql_series.ts:99`) treats *all* `Decimal*`/`Int*`/`UInt*` as `FieldType.number`. The two mappers disagree, which is the underlying cause and the natural thing to reconcile.

### 3.3 Time-as-X nuance

XY chart accepts a `time` field for X. But `_toJSTypeInTable` maps `DateTime*`/`Date*` to `'string'` (they are not in the numeric whitelist), so in table mode a datetime column becomes `FieldType.string`, **not** `FieldType.time`. That means it cannot be used as the X (time) axis in XY chart from table format. If time-based X is a desired use case, that is an additional gap (lower priority — XY chart is usually numeric-vs-numeric; use `format: time_series` for time X). Worth calling out but likely out of scope for #793 which is about numeric X/Y/Color.

---

## 4. Step-by-step verification plan (docker environment)

Goal: empirically confirm (a) which columns become selectable in XY chart, and (b) that "color doesn't work" reproduces for a string column and for a `Decimal(P,S)` column.

### 4.1 Bring up the environment

```bash
cd /Users/lunaticus/Documents/Work/clickhouse-grafana
docker compose up --no-deps -d grafana clickhouse
# Build current frontend into the container so toTable.ts is live:
docker compose run --rm frontend_builder && docker compose restart grafana
# Grafana: http://localhost:3000  (admin/admin), datasource "clickhouse"
```

### 4.2 Create an XY chart panel per query

For each query below: new panel → visualization **XY chart** → datasource `clickhouse` → set query `format = table` (Format As: Table) → open the panel's **Series** options and inspect the **X / Y / Color / Size** field dropdowns. Record which columns appear.

**Query A — all-safe numeric (baseline, should fully work):**
```sql
SELECT
    number                          AS x_int,        /* UInt64, small values → rescued to number */
    toFloat64(number) * 1.5         AS y_float,      /* Float64 → number */
    toInt32(number % 7)             AS c_color_int   /* Int32 → number, valid Color source */
FROM numbers(50)
```
Expected: `x_int`, `y_float`, `c_color_int` all appear in X/Y and in the **Color** dropdown. Color-by-`c_color_int` renders a gradient. ✅ This confirms the happy path and that Color *does* work with a numeric column.

**Query B — parametrized Decimal + LowCardinality (predicted BROKEN):**
```sql
SELECT
    toFloat64(number)               AS x_float,          /* number */
    toDecimal64(number / 3, 4)      AS y_decimal,        /* meta: Decimal(18, 4) → predicted STRING */
    CAST(number % 5 AS LowCardinality(UInt32)) AS c_lowcard /* predicted STRING */
FROM numbers(50)
```
Expected (bug): `y_decimal` and `c_lowcard` are **missing** from Y/Color dropdowns (typed string); only `x_float` is numeric. Attempting to color by `y_decimal` is impossible → *this is the "color doesn't work" the issue describes when a Decimal metric is chosen.*
Verify the raw type via Query Inspector (JSON tab): the field should show as string, and the CH meta type is `Decimal(18, 4)` / `LowCardinality(UInt32)`.

**Query C — string category as Color (Grafana limitation, expected NOT to work):**
```sql
SELECT
    toFloat64(number)               AS x_float,
    toFloat64(number) * number      AS y_float,
    ['red','green','blue'][ (number % 3) + 1 ] AS category  /* String */
FROM numbers(50)
```
Expected: `category` does **not** appear in the Color dropdown at all (numeric-only Color). This is the Grafana limitation (#117000), not a plugin bug — confirms the "color by category" interpretation.

**Query D — large UInt64 (precision → string, expected unusable as axis):**
```sql
SELECT
    number                          AS x,
    toUInt64(number) + 9007199254740993 AS big_id   /* exceeds 2^53-1 → STRING */
FROM numbers(20)
```
Expected: `big_id` is string-typed (precision preserved per #832) and not selectable as Y/Color. Documents the P3 trade-off.

### 4.3 Cross-check with Query Inspector

For each panel: **Panel → Inspect → Data / JSON**. Confirm the resulting DataFrame is a **single wide frame** (all columns present as fields of one frame — validates §2.2, i.e. no multi-frame problem) and read each field's `type`. Map observed `type` back to the §3.1 table.

### 4.4 Expected outcome summary

| Query | Numeric columns offered to X/Y/Color | Color works? | Interpretation |
|---|---|---|---|
| A | all three | ✅ yes (numeric color) | happy path |
| B | only `x_float` | ❌ for Decimal/LowCardinality | **plugin bug P1/P2** |
| C | `x_float`,`y_float` (not `category`) | ❌ for string category | Grafana limitation (wontfix) |
| D | only `x` | ❌ for big_id | #832 precision trade-off (P3) |

---

## 5. Fix plan

### 5.1 P1/P2/P6 — make `_toJSTypeInTable` recognize all numeric CH types (RECOMMENDED)

**File:** `src/datasource/sql-series/toTable.ts:12-38`.

Rewrite `_toJSTypeInTable` to (1) unwrap `Nullable(...)` and `LowCardinality(...)`, then (2) classify by prefix consistent with `_toFieldType` — but **preserve the precision-driven string behavior** for 64-bit-and-wider integers and large decimals via the existing value-based rescue. Concretely:

- Unwrap `Nullable(` and `LowCardinality(` wrappers first (like `is64BitIntegerType` / `NewDataFieldByTypeOptimized` do).
- After unwrapping, return `'number'` for: `Float32/64`; `Int8/16/32`, `UInt8/16/32`; and **any** `Decimal…` — but for the potentially-large kinds (`UInt64`, `Int64`, `Int128/256`, `UInt128/256`, `Decimal64(...)`, `Decimal128(...)`, and parametrized `Decimal(P,S)` where `P` is large), defer to the value-based rescue rather than forcing `'number'`, so precision is preserved when needed (issue #832).
- Everything else (`String`, `Enum*`, `UUID`, `FixedString`, `IPv*`, `DateTime*`, `Date*`) stays `'string'` (unchanged; correct).

Then extend the rescue in `toTable()` (`:86-90`) so it also triggers for parametrized `Decimal(P,S)` (add that to `is64BitIntegerType`, see §5.2). Net effect: `Decimal(18,4)`, `LowCardinality(UInt32)`, and safe-valued `UInt64/Int64` all become `'number'` and thus selectable as X/Y/Color/Size, while genuinely-oversized values stay string.

**Why in this function and not `_formatValue`:** the *declared* column `type` is what becomes the frame's `FieldType` and gates XY-chart selectability; `_formatValue` only affects the cell value, and it already numeric-coerces when the declared type is `'number'`.

### 5.2 Extend `is64BitIntegerType` to catch parametrized `Decimal(P,S)`

**File:** `src/datasource/sql-series/bigIntUtils.ts:98`.

Currently only literal `Decimal64`/`Decimal128` prefixes match. Add recognition of the parametrized `Decimal(P, S)` meta form: treat it as "may exceed safe range" when the precision `P > 15` (roughly the safe-integer digit budget), so `Decimal(18,4)` and `Decimal(38,10)` route through the value-based rescue while small `Decimal(9,2)` can be numeric directly. This keeps precision handling correct and unblocks the common case.

### 5.3 P4 — "color by category" (Grafana limitation)

No plugin code change is possible; XY chart's Color is numeric-only. Options:
- **Document** in the plugin docs / issue that categorical coloring is unsupported upstream (link grafana/grafana#117000) and that the plugin can only guarantee numeric columns are *selectable*.
- **Workaround for users:** map the category to a number in SQL (e.g. `multiIf(cat='a',1,cat='b',2,3) AS color_code`) and color by that numeric code; use value mappings/thresholds for legend labels.

Close the "color doesn't work" half of #793 as **not-a-plugin-bug** once §5.1/§5.2 land and it's confirmed that the only remaining "color doesn't work" case is a string category.

### 5.4 P3 — large UInt64/Int64 axis (accept + document)

No change: keeping oversized 64-bit values as strings is the deliberate #832 fix. Document that for XY-chart axes users should cast to `Float64`/`Decimal` if a value can exceed 2^53−1 and precision loss is acceptable.

### 5.5 (Optional) P/time-X — datetime as X

If time-based X in XY chart from table format is desired, `_toJSTypeInTable` would need a `'time'` return for `DateTime*`/`Date*` and `toTable()` would need to carry a `'time'` column type (Grafana's legacy table conversion maps `type:'time'` → `FieldType.time`). Lower priority; recommend `format: time_series` for time X instead. Note this changes existing table rendering of datetime columns, so treat as a separate, carefully-tested change.

---

## 6. Suggested test additions

### 6.1 Jest unit tests — new file `src/spec/toTable.spec.ts` (none exists today)

Test `_toJSTypeInTable` and `toTable()` directly (both exported from `src/datasource/sql-series/toTable.ts`). Assert the resulting `columns[i].type` for:

Positive (should be `'number'` after fix):
- `Float64`, `Float32`, `Int32`, `UInt32` → `number` (regression guard).
- `Decimal(18, 4)` → `number` (P1 fix).
- `Nullable(Decimal(18, 4))` → `number`.
- `LowCardinality(UInt32)` → `number` (P2 fix).
- `Decimal(9, 2)` → `number`.
- `UInt64`/`Int64` with all-safe values → `number` (existing rescue; regression guard).

Precision-preserving (should stay `'string'`):
- `UInt64` with a value `> 9007199254740991` → `string` (issue #832 guard).
- `Int64` with an out-of-range value → `string`.
- `Decimal(38, 10)` with an out-of-safe-range value → `string`.

Negative (should stay `'string'`):
- `String`, `Enum8('a'=1)`, `UUID`, `FixedString(8)`, `IPv4`, `DateTime`, `DateTime64(3)` → `string`.

Also assert `toTable()` builds a single `{columns, rows, type:'table'}` object and that `_formatValue` numeric-coerces `'number'` columns while leaving strings intact. Follow the existing style in `src/spec/bigIntUtils.spec.ts`.

### 6.2 e2e (Cypress + grafana-e2e) or a docker demo dashboard

- **Lightweight, high-value:** add an **XY chart example dashboard** `docker/grafana/dashboards/xy_chart_table_issue_793.json` with two panels using Query A (works) and Query B (Decimal/LowCardinality — the fix target), so maintainers can eyeball selectability and color rendering. This is the closest thing to what the issue literally asks ("check XY chart visualization for table").
- **Cypress:** if adding an automated test, follow the existing `grafana-e2e` setup (there are currently no `.spec.ts` e2e files — the harness is `npm run e2e` → `grafana-e2e run`, `package.json:14`). A test would load the demo dashboard, open the XY panel's field-config, and assert the Decimal/LowCardinality columns are present as Y/Color options. Heavier; the Jest unit tests cover the core fix.

### 6.3 Commands

```bash
npm run test        # Jest unit tests (add toTable.spec.ts)
npm run lint
npm run build:frontend
# manual: docker compose run --rm frontend_builder && docker compose restart grafana
```

---

## 7. Effort

| Sub-task | Estimate |
|---|---|
| Rewrite `_toJSTypeInTable` + extend rescue (`toTable.ts`) | 1–2 h |
| Extend `is64BitIntegerType` for `Decimal(P,S)` (`bigIntUtils.ts`) | 0.5 h |
| New `toTable.spec.ts` (positive/precision/negative cases) | 2–3 h |
| Docker XY demo dashboard | 0.5–1 h |
| Docs note (categorical color = Grafana limitation) + manual smoke in Grafana | 1–1.5 h |
| **Total** | **~0.5–1 day** |

**Final sizing: SMALL–MEDIUM (S–M).** One focused frontend function + a small helper extension + tests. The "color doesn't work" half is a documentation outcome, not code.

---

## 8. Interpreting the issue & recommendation

Slach's note *"X, Y, Color - color doesn't work"* has two defensible readings, and the analysis suggests **both are partly true**:

1. **"Color doesn't work" = color-by-category (string).** Correct and **unfixable in the plugin** — Grafana XY chart Color is numeric-only (#117000). Outcome: document + close that half.
2. **"Color doesn't work" = color-by-a-numeric-metric that the plugin mis-types as string.** This is the **real plugin bug (P1/P2)**: `Decimal(P,S)` and `LowCardinality(<numeric>)` (and large 64-bit ints) arrive as `FieldType.string` and are therefore not offered as a Color (or X/Y/Size) source. Outcome: **fix** `_toJSTypeInTable` + `is64BitIntegerType` so numeric columns are numeric.

**Recommendation: verify with §4 first (cheap, ~30 min), then implement §5.1/§5.2.** The structural prerequisite for XY chart — a single wide frame — is already satisfied by the legacy table conversion (§2.2), so the fix is narrowly about per-column typing. After the fix, the only remaining "color doesn't work" case should be a genuine string category, which is a Grafana limitation to document, not a plugin defect.

---

### Key file:line references
- `src/datasource/sql-series/toTable.ts:12-38` — `_toJSTypeInTable` (the fix site; numeric whitelist too narrow)
- `src/datasource/sql-series/toTable.ts:75-110` — `toTable()` (legacy `{columns,rows,type:'table'}` + value-based rescue at `:86-90`)
- `src/datasource/sql-series/bigIntUtils.ts:74-117` — `is64BitIntegerType` (extend for parametrized `Decimal(P,S)`)
- `src/datasource/sql-series/sql_series.ts:73-106` — `_toFieldType` (the *other*, more permissive mapper; reconcile with)
- `src/datasource/datasource.ts:335-444` — `processQueryResponse` (`table` → `toTable()` at `:364-367`)
- `src/datasource/datasource.ts:446-483`, `:496` — `executeQueries` / overridden `query()` (frontend is the live table path)
- `pkg/response.go:278-309` — backend `toFramesTable` (one-frame-per-column; NOT the current table render path, but relevant if routing changes)
- `pkg/parser.go:137-182` — backend `NewDataFieldByTypeOptimized` (Decimal→float64, UInt64/Int64→string/float64)
- `docker/grafana/dashboards/table_examples_dashboard.json` — closest existing table example (no XY example exists)
- `docker/grafana/provisioning/datasources/clickhouse.yaml:4` — datasource name `clickhouse`
- Grafana XY chart: numeric-only Color (`public/app/plugins/panel/xychart/utils.ts`); per-frame matching; upstream color-by-category request grafana/grafana#117000; numeric-string color crash grafana/grafana#98233
