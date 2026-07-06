# Issue #782 — Add support for status Histogram for Explore → Logs (full-range logs-volume)

**Repo:** Altinity/clickhouse-grafana · **Branch analyzed:** `datalinks-fixed`
**Analysis type:** exhaustive deep-dive (read-only)
**Grafana packages installed:** `@grafana/data`, `@grafana/runtime`, `@grafana/ui` all at **13.0.1**

---

## 1. The issue, restated precisely

In Grafana **Explore → Logs**, above the log lines there is a "logs volume" histogram. When a
datasource does **not** implement Grafana's *supplementary query* contract for `LogsVolume`,
Explore falls back to bucketing the **rows it already fetched** and shows the banner:

> `<ds>. This datasource does not support full-range histograms. The graph below is based on the logs seen in the response.`

The Altinity ClickHouse plugin currently has **no supplementary-query support at all** (verified
below), so users always get the limited/fallback histogram. Issue #782 (author: Eugene Klimov /
@Slach, opened 2025-05-01, **state OPEN, no comments**) asks to implement the *full-range* histogram.
The issue body provides the exact target SQL:

```sql
SELECT toStartOfInterval("event_time", INTERVAL 1 MINUTE) as "time",
  sum(multiSearchAny(toString("level"), ['critical','fatal','crit','alert','emerg','CRITICAL',...])) as critical,
  sum(multiSearchAny(toString("level"), ['error','err','eror','ERROR','ERR','EROR','Error','Err','Eror'])) as error,
  sum(multiSearchAny(toString("level"), ['warn','warning','WARN','WARNING','Warn','Warning'])) as warn,
  sum(multiSearchAny(toString("level"), ['info','information','informational',...])) as info,
  sum(multiSearchAny(toString("level"), ['debug','dbug','DEBUG','DBUG','Debug','Dbug'])) as debug,
  sum(multiSearchAny(toString("level"), ['trace','TRACE','Trace'])) as trace,
  sum(multiSearchAny(toString("level"), ['unknown','UNKNOWN','Unknown'])) as unknown
FROM "system"."text_log"
WHERE ( time >= $__fromTime AND time <= $__toTime )
GROUP BY time ORDER BY time ASC
```

…plus a second `... LIMIT 1000` query (the normal logs query). The author also flags the **100k-row
problem**: when the logs query returns 100k rows the Logs panel "stuck"s — i.e. the histogram should
be a *cheap aggregate*, and the logs query itself should stay capped.

**Two distinct asks bundled in one issue:**
1. (Primary) Implement the full-range logs-volume supplementary query so the warning disappears and
   a server-side, time-bucketed, per-severity stacked histogram renders.
2. (Secondary) Make sure the Logs panel doesn't choke on huge result sets (cap rows / cheap volume
   query).

---

## 2. Authoritative Grafana contract (verified against source, not just types)

### 2.1 The interface
`DataSourceWithSupplementaryQueriesSupport<TQuery>` — `node_modules/@grafana/data/dist/types/types/logs.d.ts:186-207`:

```ts
export interface DataSourceWithSupplementaryQueriesSupport<TQuery extends DataQuery> {
  /** @deprecated Use getSupplementaryQueryRequest() instead */
  getDataProvider?(type, request): Observable<DataQueryResponse> | undefined;
  getSupplementaryRequest?(type, request, options?): DataQueryRequest<TQuery> | undefined;
  getSupportedSupplementaryQueryTypes(dsRequest?): SupplementaryQueryType[];
  getSupplementaryQuery(options: SupplementaryQueryOptions, originalQuery: TQuery): TQuery | undefined;
}
```

Relevant symbols (all importable from `@grafana/data`):
- `SupplementaryQueryType.LogsVolume = "LogsVolume"` (logs.d.ts:141-144)
- `LogsVolumeOption = { type: LogsVolume; field?: string }` (logs.d.ts:152-155) — `field` is the
  optional level-column hint.
- `LogsVolumeType.FullRange | .Limited` (logs.d.ts:168-171)
- `LogsVolumeCustomMetaData = { absoluteRange, logsVolumeType, datasourceName, sourceQuery }` (logs.d.ts:175-180)
- `hasSupplementaryQuerySupport(...)` type guard (logs.d.ts:208)
- `LogLevel` enum (logs.d.ts:14-33) — the canonical abbreviation→level map (see §4).

### 2.2 ★ CRITICAL CORRECTION TO THE BASELINE — how Explore actually drives this

The baseline assumed implementing `getSupportedSupplementaryQueryTypes` + `getSupplementaryQuery`
is enough and that returning FullRange `meta.custom` in our own frames silences the warning.
**That is wrong.** I read the actual Explore orchestrator
(`public/app/features/explore/utils/supplementaryQueries.ts`, Grafana v11.6 — unchanged in 13.x for
this path) — `getSupplementaryQueryProvider` does:

```ts
if (hasSupplementaryQuerySupport(datasource, type)) {
  if (datasource.getDataProvider) {              // (1) deprecated
    return datasource.getDataProvider(type, dsRequest);
  } else if (datasource.getSupplementaryRequest) { // (2) the modern path
    const request = datasource.getSupplementaryRequest(type, dsRequest);
    if (!request) { return undefined; }
    return type === SupplementaryQueryType.LogsVolume
      ? queryLogsVolume(datasource, request, { targets: dsRequest.targets })   // ← Grafana helper
      : queryLogsSample(datasource, request);
  } else {
    return undefined;                            // (3) NOTHING ELSE — getSupplementaryQuery is NOT called here
  }
} else {
  return getSupplementaryQueryFallback(...);     // the "limited" warning path
}
```

**Key facts that change the design:**
- Explore **never calls `getSupplementaryQuery` directly**. `getSupplementaryQuery` is a *helper used
  by the datasource's own* `getSupplementaryRequest` (and by some panel code), but the orchestrator
  only branches on `getDataProvider` / `getSupplementaryRequest`. **We MUST implement
  `getSupplementaryRequest`** (returning a `DataQueryRequest`) — implementing only
  `getSupportedSupplementaryQueryTypes` + `getSupplementaryQuery` yields the `undefined` branch and
  the histogram silently does nothing.
- When we return a request, **Grafana's own `queryLogsVolume(datasource, request, …)` calls our
  `datasource.query(request)`** and then **post-processes** the frames: it (a) attaches
  `meta.custom = { logsVolumeType: FullRange, absoluteRange, datasourceName, sourceQuery }` for us,
  and (b) applies the per-level field config (colors, bar/stacking) for us via
  `updateLogsVolumeConfig` + `defaultExtractLevel`. **So we do NOT hand-write `meta.custom` or the
  colors** — Grafana does it, *provided our frames are shaped the way it expects* (§3).

So the integration surface is smaller than baseline thought in one way (we don't build meta.custom
or color config) and larger in another (we MUST implement `getSupplementaryRequest`, and our frames
must carry a `level` label per frame).

### 2.3 ★ CRITICAL — the frame shape `queryLogsVolume`/`extractLevel` requires

`public/app/features/logs/logsModel.ts` (v11.6; same shape in 13.x):

```ts
function defaultExtractLevel(dataFrame: DataFrame): LogLevel {
  let valueField;
  try { valueField = new FieldCache(dataFrame).getFirstFieldOfType(FieldType.number); } catch {}
  return valueField?.labels ? getLogLevelFromLabels(valueField.labels) : LogLevel.unknown;
}
function getLogLevelFromLabels(labels: Labels): LogLevel {
  const level = labels['level'] ?? labels['detected_level'] ?? labels['lvl'] ?? labels['loglevel'] ?? '';
  return level ? getLogLevelFromKey(level) : LogLevel.unknown;
}
const updateLogsVolumeConfig = (dataFrame, extractLevel, oneLevelDetected) => {
  dataFrame.fields = dataFrame.fields.map((field) => {
    if (field.type === FieldType.number) {
      field.config = { ...field.config, ...getLogVolumeFieldConfig(extractLevel(dataFrame), oneLevelDetected) };
    }
    return field;
  });
  return dataFrame;
};
```

**The make-or-break consequence:** `updateLogsVolumeConfig` derives **one level per frame** (it calls
`extractLevel(dataFrame)` once and applies it to *every* numeric field in that frame). Therefore:

> **A single frame with 7 numeric columns (critical/error/warn/…) will be rendered as 7 series ALL
> colored identically.** The required shape is **ONE FRAME PER LEVEL**, each frame = `[time field,
> one numeric "value" field]`, where the numeric field carries `labels: { level: '<canonical level>' }`.
> `defaultExtractLevel` reads that `level` label and colors the frame correctly.

This is the single most important architectural fact for this issue and was not captured in the
baseline (baseline suggested a single multi-field frame and hand-set `palette-classic-by-name`, which
is **not** what Grafana does).

### 2.4 The color map (verified)
`getLogVolumeFieldConfig` sets, per level:
```ts
{ displayNameFromDS: level,
  color: { mode: FieldColorModeId.Fixed, fixedColor: LogLevelColor[level] },
  custom: { drawStyle: Bars, barAlignment: Center, lineColor, pointColor, fillColor,
            lineWidth: 1, fillOpacity: 100, stacking: { mode: Normal, group: 'A' } } }
```
`LogLevelColor` (from `@grafana/ui` `colors[]` classic palette — hex values confirmed):

| level    | source        | hex        |
|----------|---------------|------------|
| critical | colors[7]     | `#705DA0`  |
| error    | colors[4]     | `#E24D42`  |
| warning  | colors[1]     | `#EAB839`  |
| info     | colors[0]     | `#7EB26D`  |
| debug    | colors[5]     | `#1F78C1`  |
| trace    | colors[2]     | `#6ED0E0`  |
| unknown  | `getThemeColor('#8e8e8e','#bdc4cd')` | grey |

We do **not** need to set any of this ourselves if we go through `getSupplementaryRequest` →
`queryLogsVolume`; Grafana applies it. (We *could* set it ourselves as a defensive fallback, but it's
redundant.)

---

## 3. Required frame shape (concrete spec for our `query()` output)

When Explore runs the supplementary request through `datasource.query(request)`, our pipeline must
return **N frames (N = number of distinct levels present)**, each:

```
DataFrame {
  refId: <same refId as the source target, or 'log-volume-' + refId> ,
  fields: [
    { name: 'time',  type: FieldType.time,   values: number[] (ms epoch) },
    { name: 'value', type: FieldType.number, values: number[],
      labels: { level: 'critical' | 'error' | 'warning' | 'info' | 'debug' | 'trace' | 'unknown' } },
  ],
  length: <bucketCount>,
}
```

Notes:
- The **`labels.level`** value must be one of Grafana's canonical level strings (the *values* of the
  `LogLevel` enum: `critical, warning, error, info, debug, trace, unknown`). `getLogLevelFromKey`
  also accepts abbreviations, but using the canonical value is safest.
- `meta.custom` (FullRange/absoluteRange/datasourceName/sourceQuery) and field colors are added by
  Grafana's `queryLogsVolume`; we don't set them. We **may** set `meta.preferredVisualisationType`
  but it's not required for volume frames.
- All frames must share the **same set of time buckets** so stacking aligns. Easiest: emit the same
  `time` array (full bucket grid over the range) for every level frame, zero-filled. Grafana also
  tolerates per-frame time arrays, but a shared, zero-filled grid avoids gaps in the stacked bars.

> Alternative (defensive) shape if we choose **not** to rely on `getSupplementaryRequest`: build the
> frames ourselves with `getLogVolumeFieldConfig`-equivalent config + `meta.custom` FullRange and
> return them directly. This requires reimplementing Grafana-internal helpers (`LogLevelColor`,
> stacking custom config) and hand-setting `meta.custom`. Not recommended — more code, drifts from
> core. Use the `getSupplementaryRequest` path.

---

## 4. Level detection & mapping

The issue's `multiSearchAny` lists are the canonicalization source and map 1:1 onto Grafana's
`LogLevel` enum values (logs.d.ts:14-33):

| issue bucket | Grafana canonical (LogLevel value) | abbreviations folded in |
|--------------|------------------------------------|--------------------------|
| critical (critical/fatal/crit/alert/emerg) | `critical` | emerg, fatal, alert, crit |
| error (error/err/eror)                     | `error`    | err, eror |
| warn (warn/warning)                        | `warning`  | warn |
| info (info/information/informational)      | `info`     | information, informational, notice |
| debug (debug/dbug)                         | `debug`    | dbug |
| trace                                      | `trace`    | — |
| unknown                                    | `unknown`  | fallback |

Note: the issue labels its column `warn`, but Grafana's canonical level is **`warning`**; the
`labels.level` we emit must be `warning` (not `warn`) to color correctly.

**Finding the level column** (priority order):
1. `LogsVolumeOption.field` hint, if provided by Explore (`getSupplementaryRequest(type, request, options?)`).
2. The plugin's existing convention from `toLogs.ts:88,179-182`: a column literally named **`level`**
   or **`severity`** (`reservedFields = ['severity','level','id']`). Reuse this exact convention.
3. Datasource-config hint (optional new field, see §10) for tables that use a non-standard column.

**Value normalization** — ClickHouse `level` can be: a String (`'Error'`, `'ERR'`), an Enum8 (which
ClickHouse renders as its string name in JSON FORMAT), or a numeric severity. The issue's
`multiSearchAny(toString("level"), [...])` approach handles String/Enum/mixed-case in one shot and
is the recommended SQL. For numeric severities, `NumericLogLevel` (logs.d.ts:38) gives the syslog
mapping, but the `multiSearchAny` form already covers the common ClickHouse `system.text_log` case
(string level names), so start there.

---

## 5. Query transformation design (turn the user's log query into the aggregate)

The user's original target is a free-form SQL with macros (`$table`, `$timeFilter`, `$columns`, etc.)
and `format: 'logs'`. We must produce a **CHQuery** that, after the normal backend macro expansion,
yields the per-bucket per-level counts. Three approaches were considered:

### (a) Subquery wrap — `SELECT bucket, count-per-level FROM (<user query>) GROUP BY bucket`
```sql
SELECT $timeSeries AS t,
  sum(multiSearchAny(toString(level), [...critical...])) AS critical,
  ... ,
  sum(multiSearchAny(toString(level), [...unknown...])) AS unknown
FROM ( <user query with LIMIT stripped> )
WHERE $timeFilter
GROUP BY t ORDER BY t
```
**Pros:** macros in the inner query still expand in the Go backend; works regardless of the inner
FROM/WHERE complexity. **Cons:** the inner query must expose a usable timestamp column **and** the
`level`/`severity` column by name; `$timeSeries`/`$timeFilter` in the outer query need
`dateTimeColDataType` to resolve, and that column must survive the subquery projection (the user's
`SELECT *`-style logs query usually does, but an explicit column list might not include the raw
timestamp under the expected name). Inner `ORDER BY`/`LIMIT` must be **stripped** (we want full-range
counts, not the capped 1000-row sample). `DISTINCT` in the inner query would skew counts.

### (b) AST rewrite via the existing Go eval parser
The backend already has a real SQL AST (`pkg/eval`, `EvalAST`, `scanner.ToAST()`, used by
`getAstProperty`/`getMultipleAstProperties` — `pkg/resource_handlers.go:213-380`). We could extract
`from`, `where`, the timestamp col and level col from the AST and **rebuild** the aggregate query
from parts (this is exactly the pattern `getLogRowContext` uses — `datasource.ts:244-270` pulls
`select`/`where` via AST then reassembles queries). **Pros:** robust against ORDER BY/LIMIT/DISTINCT
(we only take FROM+WHERE), no fragile subquery projection issues, and matches an existing,
battle-tested pattern in this codebase. **Cons:** more work; needs the level column name resolved.

### (c) Regex/string surgery
Strip trailing `LIMIT`, splice a SELECT prefix. **Rejected** — brittle against the macro/where
variety this plugin supports.

### ★ Recommendation
**Hybrid leaning on (b), mirroring `getLogRowContext`:** reuse `resourceClient.getMultipleAstProperties(stmt, ['from','where'])`
to get the table/`$table` and WHERE, then build:
```sql
SELECT $timeSeries AS t,
  sum(multiSearchAny(toString(<levelCol>), [<critical list>])) AS critical,
  ... AS error, ... AS warning, ... AS info, ... AS debug, ... AS trace, ... AS unknown
FROM $table
WHERE <reconstructed where incl. $timeFilter>
GROUP BY t ORDER BY t
```
Then convert the single response (one time col + 7 count cols) into **7 per-level frames** in a new
`toLogsVolume` converter (§3). Reusing `$timeSeries`/`$timeFilter`/`$table` means the **Go backend
does all the bucketing and time-range math** (no new backend code needed — see §6). If AST
extraction proves brittle for a given query, fall back to approach (a) subquery-wrap with
LIMIT/ORDER-BY stripped.

**Why `$timeSeries` works for bucketing:** verified in `pkg/eval/eval_query.go:1308-1328`
(`getTimeSeries`) — it expands to `(intDiv(toUInt32($dateTimeCol), $interval) * $interval) * 1000`
(DATETIME) and type-specific variants for DATETIME64/Float/Timestamp64. That is functionally the same
as the issue's `toStartOfInterval(..., INTERVAL n)`, returning ms-epoch buckets — exactly the
histogram x-axis we need. `$interval` is derived from Grafana's `interval`/`intervalFactor`
(`EvalQuery.IntervalSec`). To keep the histogram coarse/cheap, we set a sane interval on the
supplementary CHQuery (e.g. derive from range/maxDataPoints) rather than the fine logs interval.

---

## 6. Frontend vs backend split

**Verified ownership:** macros (`$table`, `$timeFilter`, `$timeSeries`, `$columns`, …) expand in the
**Go backend** (`pkg/eval/eval_query.go:174-287` `replace()`; macro impls at 1308-1385). The backend
**ignores `EvalQuery.Format`** for formatting — it returns raw columnar data (timeseries-or-table
frames) and the **frontend** owns logs/traces/flamegraph formatting via the `format`-dispatch in
`processQueryResponse` (`datasource.ts:409-485`) and the `sql-series/to*.ts` converters
(`sql_series.ts:133-158`). The supplementary query rides the **same path**:

`query()` (datasource.ts:524) → `executeQueries` (:491) → `createQuery`/`replace` (:645,:801, macro
expansion via backend `createQueryWithAdhoc`) → `seriesQuery` (+`FORMAT JSON`, :739) →
`processQueryResponse` (:384) → **new** `format === 'logs_volume'` branch → **new** `toLogsVolume()`.

**Therefore the entire feature is frontend-only** (no Go changes) **if** we express the histogram as
a CHQuery that reuses existing macros. The new CHQuery just needs a new `format` value to route to the
new converter.

**CHQuery change** (`src/types/types.ts:34-63`): `format` is a free string, so no type change is
strictly required, but for clarity add an enum/const and a marker so the converter knows the level
column. Minimal additions:
- Use `format: 'logs_volume'` for the supplementary CHQuery (built internally; users never type it).
- Optionally carry the resolved level column, e.g. a transient field `_levelColumn?: string` on the
  internal CHQuery, or just hardcode the `multiSearchAny` SQL referencing `level`/`severity`.

**New converter** `src/datasource/sql-series/toLogsVolume.ts` + registration in `SqlSeries`
(`sql_series.ts`: add `toLogsVolume = () => toLogsVolume(this)`), and a branch in
`processQueryResponse` (`datasource.ts`:409-485). Pattern mirrors `toLogs.ts` for timestamp detection
(`type === 'time'`) and severity column detection (`level`/`severity`), but instead emits the 7
per-level frames described in §3.

---

## 7. The 100k-row problem

Two independent mitigations, both wanted by the issue:

1. **The volume query is a cheap aggregate.** Because it's `GROUP BY $timeSeries` it returns at most
   `range / interval` rows (e.g. a few hundred buckets), not 100k. ClickHouse computes
   `sum(multiSearchAny(...))` server-side. Pick a coarse interval (derive from
   `maxDataPoints`/range, like Grafana's `$__interval`), so the volume scan aggregates rather than
   streams rows. **Important:** `multiSearchAny` over `toString(level)` still scans the column, but
   returns only the aggregate — orders of magnitude less data over the wire than 100k log rows.

2. **Cap the logs sample.** The second query in the issue (`… LIMIT 1000`) is the normal logs query.
   Today the plugin sends the user's query as-is. The Logs panel "stuck" comes from rendering ~100k
   `LogLines`. Mitigation: respect `maxDataPoints`/append a `LIMIT` to the logs query when none is
   present (or surface a setting). This is **secondary** to the histogram and can be a follow-up;
   note it explicitly so reviewers can decide scope.

---

## 8. Full implementation plan (ordered, every file/method)

All frontend; **no Go changes** if we reuse existing macros.

1. **`src/types/types.ts`**
   - Add a `LogsVolume = 'logs_volume'` format constant (or `enum Format`), and optionally a
     transient `_levelColumn?: string` on `CHQuery` for the resolved level column.

2. **`src/datasource/sql-series/toLogsVolume.ts`** (new)
   - `export const toLogsVolume = (self): DataFrame[]` — input is the SqlSeries built from the
     aggregate response (1 time col + the 7 count cols `critical..unknown`).
   - Detect the time column (reuse `_toFieldType`/`type==='time'` logic from `toLogs.ts:52-85,153-155`).
   - For each of the 7 level columns present, emit **one frame** `[time, value]` with
     `value.labels = { level: <canonical> }` (map `warn → warning`). Zero-fill missing buckets onto a
     shared time grid for clean stacking.
   - Set `refId = self.refId` (Grafana re-stamps/uses it). Do **not** set color/meta.custom (Grafana
     does). Optionally `meta.preferredVisualisationType = 'graph'`.

3. **`src/datasource/sql-series/sql_series.ts`**
   - `import { toLogsVolume } from './toLogsVolume'` and add method
     `toLogsVolume = () => toLogsVolume(this);`.

4. **`src/datasource/datasource.ts` — `processQueryResponse` (:409-485)**
   - Add branch: `else if (target.format === 'logs_volume') { result = sqlSeries.toLogsVolume(); }`.

5. **`src/datasource/datasource.ts` — build the supplementary query**
   - Add a helper `buildLogsVolumeQuery(originalQuery, options): CHQuery` that:
     - resolves the level column (`LogsVolumeOption.field` → else `level`/`severity` convention),
     - resolves `from`/`where`/`$table` via `resourceClient.getMultipleAstProperties` (pattern from
       `getLogRowContext` :244-270), OR subquery-wraps the user query with LIMIT/ORDER-BY stripped,
     - emits the `SELECT $timeSeries AS t, sum(multiSearchAny(...)) AS critical, … FROM $table WHERE
       …$timeFilter GROUP BY t ORDER BY t` SQL,
     - sets `format: 'logs_volume'`, a coarse `interval`, and copies `dateTimeColDataType`/`dateTimeType`.

6. **`src/datasource/datasource.ts` — implement the interface**
   - Add `implements DataSourceWithSupplementaryQueriesSupport<CHQuery>` to the class header (:30-33).
   - `getSupportedSupplementaryQueryTypes() { return [SupplementaryQueryType.LogsVolume]; }`
   - `getSupplementaryQuery(options: LogsVolumeOption, query: CHQuery): CHQuery | undefined` — return
     `undefined` unless `options.type === LogsVolume` **and** the query is a logs query
     (`query.format === 'logs'`); else `buildLogsVolumeQuery(query, …)` (without range — that's
     filled by the request).
   - **`getSupplementaryRequest(type, request, options?)`** ← *required for Explore* — map
     `request.targets` through `getSupplementaryQuery`, drop undefineds, return a cloned
     `DataQueryRequest` with the rewritten targets (and a coarse interval/maxDataPoints), or
     `undefined` if no logs targets. This is the method Explore actually invokes (see §2.2).
   - Imports: `SupplementaryQueryType`, `LogsVolumeOption`/`SupplementaryQueryOptions` from
     `@grafana/data`.

7. **(Optional, secondary) Logs row cap** — in `replace()`/logs path, append a `LIMIT` when absent
   or honor `maxDataPoints` to prevent the 100k Logs-panel freeze.

8. **(Optional) ConfigEditor** — add a "log level column" override to `CHDataSourceOptions`
   (`types.ts:68-95`) + `ConfigEditor` so non-`level`/`severity` schemas work, surfaced through
   `getSupplementaryQuery` via `LogsVolumeOption.field`.

---

## 9. Test plan

**Unit (Jest, in `src/spec/sql_series_specs.jest.ts` style — `import { toLogsVolume } from '../datasource/sql-series/toLogsVolume'`):**
- Input: aggregate rows `[{ t, critical, error, warning, info, debug, trace, unknown }]` →
  assert **7 frames**, each `[time, value]`, with the correct `labels.level` (esp. `warn`→`warning`),
  correct `FieldType.time`/`FieldType.number`, aligned shared time grid, zero-fill.
- Edge cases: zero rows → `[]`; a level column entirely zero → frame still emitted or omitted
  (decide + test); single level present → one frame.
- New datasource methods: `getSupportedSupplementaryQueryTypes()` returns `[LogsVolume]`;
  `getSupplementaryQuery` returns `undefined` for non-logs format and a `logs_volume` CHQuery for
  logs; `getSupplementaryRequest` maps targets and returns a request (or `undefined` when no logs
  targets). Snapshot the generated SQL (with `level` and with `severity`, and with a `field` hint).
- Query-builder helper: given a user logs query with `$table`/`$timeFilter`/trailing `LIMIT`,
  assert the produced aggregate SQL strips LIMIT/ORDER BY and contains the 7 `multiSearchAny` sums +
  `$timeSeries`/`GROUP BY`.

**E2E (Playwright, `tests/e2e/features/...`):**
- Open `/explore` with the CH datasource, run a `format: logs` query against a seeded log table
  (Docker `clickhouse` has sample data; add a `level`/`severity` column if needed).
- Assert the **warning banner is gone** (`getByText(/does not support full-range histograms/)` not
  visible) and a stacked bar histogram renders above the logs.
- Assert the supplementary request hit ClickHouse with a `GROUP BY` aggregate (Query Inspector /
  network), proving it's full-range not response-derived.
- Regression: dashboard logs panels still work; non-logs formats unaffected.

**Backend:** none required if no Go change. If a Go change sneaks in (e.g. new macro), add
`pkg/...` Go tests + testflows.

---

## 10. Effort breakdown

| Sub-task | Est. |
|---|---|
| `toLogsVolume.ts` converter (7-frame, level-label, zero-fill grid) | 4–6 h |
| `buildLogsVolumeQuery` (AST-extract FROM/WHERE + assemble multiSearchAny SQL; LIMIT/ORDER-BY strip; interval) | 6–10 h |
| Datasource interface methods (`getSupportedSupplementaryQueryTypes`/`getSupplementaryQuery`/**`getSupplementaryRequest`**) + class header | 3–5 h |
| `processQueryResponse` branch + `SqlSeries.toLogsVolume` + types | 1–2 h |
| Level-column resolution (level/severity/`field` hint) + numeric-level handling | 2–4 h |
| Unit tests (converter + SQL builder + ds methods) | 4–6 h |
| E2E test in Explore (seed data, assert banner gone + histogram) | 4–7 h |
| Manual verification across DATETIME/DATETIME64/Timestamp64 + Enum/String level | 3–5 h |
| (Optional) logs LIMIT cap for 100k problem | 2–4 h |
| (Optional) ConfigEditor level-column override | 2–3 h |

**Core (no optionals): ~24–40 h. Overall: M (medium), trending toward M/L.**
Justification: no backend work and an existing, reusable derived-query pattern (`getLogRowContext`)
keep it from being Large; but the correct frame shape (one-frame-per-level + `level` labels), the
must-have `getSupplementaryRequest` wiring, robust query rewriting across the plugin's macro/dialect
matrix, and E2E in Explore are real, non-trivial work that push it past Small.

---

## 11. Hard parts, risks, open questions, what to confirm with maintainers

**Hard / risky:**
1. **Frame shape is non-obvious and unforgiving** — must be *one frame per level* with
   `value.labels.level`; the intuitive single-multi-column frame renders all-one-color. (Verified via
   `defaultExtractLevel`/`updateLogsVolumeConfig`.) Highest risk of a "looks done but colors/legend
   wrong" outcome.
2. **`getSupplementaryRequest` is mandatory** — implementing only `getSupplementaryQuery` does
   nothing in Explore (verified in `supplementaryQueries.ts`). Easy to get wrong if following the
   `getSupplementaryQuery`-only mental model.
3. **Level column discovery** — depends on a column literally named `level`/`severity`. Tables with
   other names need the config/`field` hint, else everything lands in `unknown`.
4. **Timestamp/where extraction across the macro+dialect matrix** — `$timeFilter`/`$timeSeries`
   depend on `dateTimeColDataType`/`dateTimeType`; subquery-wrap may drop the needed column; AST path
   must handle the plugin's macros pre-expansion. Mirror `getLogRowContext` carefully.
5. **Numeric vs string levels / Enum8** — `multiSearchAny(toString(level), [...])` covers String/Enum
   names; pure numeric severities need `NumericLogLevel` mapping (defer unless reported).
6. **Interval/bucket sizing** — too fine = expensive + noisy; reuse Grafana's interval logic.

**Open questions for maintainers (@Slach):**
- Acceptable to require a `level`/`severity` column convention initially, with a config override
  later? (Matches existing `toLogs` convention.)
- Should the 100k-row Logs cap (auto-`LIMIT`/`maxDataPoints`) ship in this issue or be split out?
- Should the histogram interval follow Grafana's `$__interval`, or expose a dedicated setting?
- Confirm target Grafana version range — verified against 11.6/13.0 internals; the `queryLogsVolume`
  one-frame-per-level + `extractLevel` contract is stable across these but is *Grafana-internal* and
  could shift; we depend on it indirectly (via `getSupplementaryRequest`), which is the supported
  seam.

**What to confirm before coding:** stand up Explore against a seeded `system.text_log`-like table and
verify (a) `getSupplementaryRequest` is hit, (b) `datasource.query` receives the request, (c) our
7-frame output yields correctly-colored stacked bars and **no** warning banner.

---

### Appendix — key source coordinates (absolute paths)
- Datasource class / interfaces: `/Users/lunaticus/Documents/Work/clickhouse-grafana/src/datasource/datasource.ts:30-33`
- `query`/`executeQueries`/`processQueryResponse`: `…/src/datasource/datasource.ts:524, :491, :384-489` (format dispatch :409-485)
- `replace` (macro round-trip / payload incl. `format`): `…/src/datasource/datasource.ts:801-919` (format set :836)
- `getLogRowContext` (derived-query pattern to mirror): `…/src/datasource/datasource.ts:236-339`
- Resource AST helpers: `…/src/datasource/resource_handler.ts:57,103` (`getAstProperty`, `getMultipleAstProperties`)
- `SqlSeries` + converter registry: `…/src/datasource/sql-series/sql_series.ts:109-159`
- `toLogs` (timestamp + level/severity detection convention): `…/src/datasource/sql-series/toLogs.ts:52-85, 88, 153-201`
- CHQuery / formats / DEFAULT_QUERY: `…/src/types/types.ts:34-63, 101-113`
- Backend EvalQuery struct + macros: `…/pkg/eval/eval_query.go:33-58, 174-287, 1308-1385`
- Backend AST handlers: `…/pkg/resource_handlers.go:213-380, 462+`
- Existing converter tests: `…/src/spec/sql_series_specs.jest.ts`
- Grafana contract types: `node_modules/@grafana/data/dist/types/types/logs.d.ts:14-33, 141-208`
- Grafana Explore orchestrator (verified, external): `grafana public/app/features/explore/utils/supplementaryQueries.ts` (`getSupplementaryQueryProvider`)
- Grafana volume frame builder (verified, external): `grafana public/app/features/logs/logsModel.ts` (`queryLogsVolume`, `defaultExtractLevel`, `updateLogsVolumeConfig`, `getLogVolumeFieldConfig`, `LogLevelColor`)
