# Issue #788 — Custom Formatting of Timeseries Query Type

Deep-dive analysis against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend in `src/`, Go backend in `pkg/`).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/788>
- Status at time of writing: **OPEN**, author `Jhors2` (2025-05-12), two self-comments, no maintainer reply.

**What the user asks (verbatim):**

> I am looking to be able to custom format the "display name" on a timeseries data type. Changing this to "table" works as it surfaces the different column names as "fields" to match, however it seems that the timeseries type does not expose the individual fields to Grafana to be able to do this. Or am I missing something?
>
> Specifically looking to be able to do:
> `${__field.labels.airport} - ${__field.labels.site}`
>
> From a query like:
> `SELECT time,airport,site FROM events WHERE $timeFilter GROUP BY 2,3`

Follow-up comment (2025-05-17):

> I believe this also breaks the ability to do Data Links. In order to pass labels on the timeseries to a different URL you need access to the label values individually. Tested that this works if you use "table" type instead of "timeseries" type.

So the request is **not** "let me type a legend string in the query editor". The user explicitly wants Grafana's native `${__field.labels.<name>}` templating (usable in the panel Display name override, in Data Links, in overrides, etc.) to work for the **time_series** format. That only works if the plugin attaches per-series **labels** (a `{ columnName: value }` map) to each value field of the returned DataFrames. Today it does not (on the active frontend path), so `${__field.labels.airport}` resolves to nothing and the individual dimension values are unreachable — exactly the symptom reported.

---

## 0. TL;DR

**Root cause.** For a `time_series` panel the active data path is the **frontend** parser `src/datasource/sql-series/toTimeSeries.ts` (invoked from `src/datasource/datasource.ts:437`). It groups rows by the GROUP BY key columns, joins those column **values** into a single string (`metricKey`, e.g. `"JFK, LAX"`), uses that string as the value field's `name`, and **never sets a `labels` map on the field** (`toTimeSeries.ts:149-164, 203-215`). Grafana therefore has no `field.labels` to resolve `${__field.labels.airport}` against, and Data Links cannot read individual dimension values. Switching the panel to `table` works because `toTable.ts` emits one field per column, so each dimension is independently addressable.

Note there is a **second, parallel** frame builder in Go — `pkg/response.go` (`toFramesWithTimeStamp`, line 67) — which is used by the **backend/alerting** path (and streaming). That path *already* fills `field.Labels` (`pkg/response.go:106`, `generateFrameLabelsByLabels` at `:266`). So the fix on the frontend is essentially porting the Go backend's existing behavior to the TypeScript path (and hardening the Go path's field naming for consistency).

**Proposed design (recommended).** Attach a `labels` map to each time-series value field on the frontend, keyed by the GROUP BY column name → its value for that series, mirroring `pkg/response.go`. This makes `${__field.labels.airport}`, Data Links, and field overrides work natively with **zero new query-editor UI** and no new syntax to learn — it is the idiomatic Grafana way and precisely what the user asked for. Optionally, additionally add a per-query **Legend Format** text input (`${__field.labels.x}`-style template) for users who want an explicit alias baked at the datasource, but that is a secondary enhancement, not the core fix.

**Recommendation: IMPLEMENT (labels-on-fields).** Effort: **Small–Medium (~1–1.5 days)** including tests. The core change is ~15 lines in `toTimeSeries.ts` plus tests; the optional Legend Format input is another ~0.5 day across the standard option-plumbing files.

---

## 1. Map of all relevant code (file:line)

### 1.1 The two data paths (critical to understand before touching anything)

| Path | Entry | Frame/series builder | Sets `labels`? | Used for |
|---|---|---|---|---|
| **Frontend (active for panels)** | `src/datasource/datasource.ts:335` `processQueryResponse` → `:437` `sqlSeries.toTimeSeries(...)` | `src/datasource/sql-series/toTimeSeries.ts:113` | **NO** ← the bug | Normal dashboard panels, Explore, variables |
| **Backend (Go)** | `pkg/datasource.go` → `pkg/response.go:29` `toFrames` → `:67` `toFramesWithTimeStamp` | `pkg/response.go:67` | **YES** (`:106`) but value-field *name* is wrong (see §3.3) | Alerting / backend queries, and the shared base for streaming |
| **Streaming (Go)** | `pkg/streaming.go` | `pkg/streaming.go:440` `mergeFramesToWide` → `:516` | **YES** (`data.NewField(srcField.Name, srcField.Labels, …)`) | Live streaming panels |

The user's panel goes through the **frontend** path. That is where the fix must land for the reported symptom. The Go path is worth aligning for the alerting use case and for consistency.

### 1.2 Frontend symbols

| Location | Symbol | Role |
|---|---|---|
| `src/datasource/datasource.ts:335-444` | `processQueryResponse` | Dispatches on `target.format`; calls `toTimeSeries`/`toTable`/… |
| `src/datasource/datasource.ts:364-440` | format dispatch | `table`→`toTable`, `traces`, `flamegraph`, `logs`, `Anno`, Variable, else→`toTimeSeries` (line 437) |
| `src/datasource/datasource.ts:437` | `sqlSeries.toTimeSeries(target.extrapolate, target.nullifySparse)` | **Fix call site**; new options would be threaded here |
| `src/datasource/datasource.ts:353-362` | `new SqlSeries({...keys...})` | `keys` = GROUP BY columns (see below) passed into the parser |
| `src/datasource/datasource.ts:1028-1030` | `getAstProperty(interpolatedQuery, 'group by')` → `keys: properties` | **How the GROUP BY column names are discovered** — these are the label dimensions |
| `src/datasource/sql-series/sql_series.ts:108-156` | `class SqlSeries` | Holds `refId, series, meta, keys, …`; `toTimeSeries` at `:148` |
| `src/datasource/sql-series/toTimeSeries.ts:113-218` | `toTimeSeries` | **The function to modify** |
| `src/datasource/sql-series/toTimeSeries.ts:124-126` | `keyColumns` | `self.keys` minus the time column = the label/dimension columns |
| `src/datasource/sql-series/toTimeSeries.ts:146-165` | `metricKey` build | joins key-column **values** with `', '` into one string |
| `src/datasource/sql-series/toTimeSeries.ts:180-200` | per-row datapoint push | uses `metricKey` as the series `key` when present |
| `src/datasource/sql-series/toTimeSeries.ts:203-215` | frame emit | field `name = seriesName`; **no `labels` set** ← the fix |
| `src/datasource/sql-series/toTable.ts:82-92` | `toTable` | one field per column (why `table` works today) |
| `src/types/types.ts:40-75` | `CHQuery` interface | Where a new `legendFormat?` would be typed (optional feature) |
| `src/types/types.ts:112-127` | `DEFAULT_QUERY` | Add default for a new option |

### 1.3 Query-editor option plumbing (only needed for the OPTIONAL Legend Format input)

| Location | Role |
|---|---|
| `src/views/QueryEditor/components/QueryTextEditor/constants.ts:10-16` | `FORMAT_OPTIONS` (time_series/table/logs/traces/flamegraph) |
| `src/views/QueryEditor/components/QueryTextEditor/components/Selects/FormatAsSelect.tsx` | "Format As" selector (pattern for a new Select) |
| `src/views/QueryEditor/components/QueryTextEditor/components/Inputs/` | Input components dir (`StepInput.tsx`, `RoundInput.tsx` — pattern for a new text input) |
| `src/views/QueryEditor/components/QueryTextEditor/hooks/useQueryHandlers.ts:8-56` | Handlers (`handleStepChange`, `handleFormatChange`, …); add `handleLegendFormatChange` |
| `src/views/QueryEditor/QueryEditor.tsx:35` | `onFieldChange = (field) => onChange({ ...initializedQuery, [field.fieldName]: field.value })` |
| `src/views/QueryEditor/helpers/initializeQueryDefaults.ts:4-112` | Default initialization for new fields |
| `src/views/QueryEditor/components/QueryTextEditor/QueryTextEditor.tsx:66-158` | Where controls are composed into `<InlineFieldRow>`s |

### 1.4 Backend (Go) symbols — for aligning the alerting path

| Location | Symbol | Role |
|---|---|---|
| `pkg/response.go:52-54` | `isLabelType` | column is a "label" if type matches `String\|UUID\|Enum\|IPv4\|IPv6` and not `Array\|Tuple\|Map` |
| `pkg/response.go:42-50` | `prepareLabelFieldsMap` | collects label-type columns |
| `pkg/response.go:57-64` | `getTimestampFieldIdx` | **backend auto-detects** time_series vs table by presence of a DateTime / `"t"`-Int column (does **not** branch on `Format`) |
| `pkg/response.go:67-164` | `toFramesWithTimeStamp` | time-series frame builder; `hasLabelFields` branch at `:94` |
| `pkg/response.go:95-106` | frame name + labels | `generateFrameNameByLabels` (`:247`) sets the field NAME to joined label values; `generateFrameLabelsByLabels` (`:266`) sets `field.Labels` at `:106` |
| `pkg/response.go:225-245` | `createFrameIfNotExistsAndAddPoint` | `NewDataFieldByTypeOptimized(frameName, …)` — value field NAME becomes the joined label values (see §3.3 caveat) |
| `pkg/query.go:24-33` | `Query` struct | **no `Format` field**; note the frontend `queryData.format` (`datasource.ts:952`) reaches the backend only for macro/SQL generation, not for frame shaping |
| `pkg/streaming.go:487-527` | `mergeFramesToWide` | streaming wide-frame build; preserves `srcField.Labels` (`:516`) — the "correct" reference implementation |

---

## 2. Current behavior — exact code path for the user's query

Query: `SELECT time, airport, site, count() FROM events WHERE $timeFilter GROUP BY 2,3` (the reported example plus a value column; `airport`/`site` are `String`).

### 2.1 Frontend (the path the panel actually uses)

1. `datasource.ts:1028` runs `getAstProperty(interpolatedQuery, 'group by')`; `keys = ['airport','site']` (the GROUP BY columns). These are returned from `replace()` as `keys` (`:1030`) and stored on the query object.
2. On response, `processQueryResponse` (`datasource.ts:335`) builds `new SqlSeries({ series, meta, keys: ['airport','site'], … })` (`:353`).
3. `target.format === 'time_series'` (default) → falls to the `else` branch → `sqlSeries.toTimeSeries(extrapolate, nullifySparse)` (`datasource.ts:437`).
4. Inside `toTimeSeries` (`toTimeSeries.ts:113`):
   - `timeCol = meta[0]` (the `time` column) (`:121`).
   - `keyColumns = keys.filter(name !== timeCol.name)` → `['airport','site']` (`:124`).
   - For each row, `metricKey = ['airport','site'].map(row[name]).join(', ')` → e.g. `"JFK, LAX"` (`:149-164`).
   - When iterating `row`, timestamp and any column in `self.keys` are skipped (`:182`); the remaining value column (`count()`) is pushed under `key = metricKey` (`:188-190, 198`).
   - Final emit (`:203-215`): each series becomes a frame with two fields — `{name:'time',…}` and `{name: seriesName /* "JFK, LAX" */, values:[…]}`. **No `labels` property is attached.** `refId` becomes `"A - JFK, LAX"` (`:213`).

Result frame per series:
```
Frame { refId: "A - JFK, LAX", fields: [
  { name: "time",       type: "time",  values: [...] },
  { name: "JFK, LAX",   config:{links:[]}, values: [...] }   // <-- no .labels
]}
```
Grafana sees a field literally named `"JFK, LAX"` with **no labels**. `${__field.labels.airport}` → empty. Data Links have no `__field.labels.*` to reference. This is the exact reported failure.

### 2.2 Why `table` works today (for contrast)

`toTable.ts:82-92` builds one output field per ClickHouse meta column (`airport`, `site`, `count()` each a field). The panel/transform layer can then reference each column independently — hence the user's observation that "table works".

### 2.3 Backend/alerting path (for completeness)

`pkg/response.go` **does** set labels: `generateFrameLabelsByLabels` (`:266-276`) builds `{ airport:"JFK", site:"LAX" }` and assigns it at `:106`. So an *alert rule* on this query already carries labels. But the interactive panel does not use this path — it uses the frontend parser — which is why the user (working in a panel/Data Links) sees no labels. There is one caveat in the Go path worth fixing for consistency (§3.3).

---

## 3. Proposed design

### 3.1 Core fix (RECOMMENDED): attach `labels` to time-series value fields on the frontend

Give each emitted value field a Grafana-native `labels` map `{ <groupByColumn>: <value> }`, and set the field `name` to the metric/value column name (not the joined label string). This is exactly what Grafana expects for a labeled time series and what makes `${__field.labels.x}`, Data Links, and overrides work with no new UI.

Change in `src/datasource/sql-series/toTimeSeries.ts`:

- While building `metricKey` (`:149-164`), also build a parallel `labelsByKey: { [metricKey: string]: { [col: string]: string } }` capturing each key column's value for that series. (Because `metricKey` is the stable per-series identifier used as the map key throughout, a single `labels` map per series is well-defined.)
- At emit time (`:207-214`), set `config.displayNameFromDS` or attach `labels` to the value field:

```ts
each(metrics, function (dataPoints, seriesName) {
  const processedDataPoints = /* unchanged */;
  const labels = labelsByKey[seriesName];              // may be undefined (no GROUP BY)
  timeSeries.push({
    length: processedDataPoints.length,
    fields: [
      { config: { links: [] }, name: 'time', type: 'time',
        values: processedDataPoints.map((v: any) => v[1]) },
      { config: { links: [] }, name: seriesName, labels,   // <-- attach labels
        values: processedDataPoints.map((v: any) => v[0]) },
    ],
    refId: seriesName && self.refId ? `${self.refId} - ${seriesName}` : undefined,
  });
});
```

Grafana's `DataFrame` field type supports a top-level `labels?: Labels` property (`Labels = { [key: string]: string }`), which is precisely what `${__field.labels.*}` reads. Attaching it is sufficient; no `applyFieldOverrides` change is needed in the plugin.

**Field `name` question.** Two viable choices:
- (a) Keep `name: seriesName` (the joined labels) for backward-compatible legends and *add* `labels`. Lowest-risk: existing dashboards that rely on the current auto-legend keep working, and `${__field.labels.x}` newly works. **Recommended default.**
- (b) Set `name` to the actual value column (e.g. `count()`) and rely on labels for the series identity (closest to Prometheus semantics). Cleaner long-term but changes default legends for existing dashboards → mild backward-compat risk. Offer behind the option in §3.2 if desired, but do not make it the default.

Because there can be **multiple value columns** per row (e.g. `SELECT time, airport, site, count(), avg(x)`), when more than one non-key value column exists the series identity must stay unique. The current code already disambiguates because different value columns push into distinct `metricKey`s only when a value column name participates. Preserve current behavior: if there is exactly one value column, `name = metricKey`; if there are several, the existing logic keys them apart — verify with a test (see §6). The labels map attaches identically in both cases.

### 3.2 Optional enhancement: per-query "Legend Format" text input

Some users want to bake an explicit alias at the datasource (independent of the panel override). Add an optional per-query text field `legendFormat?: string` supporting `${__field.labels.<col>}` / `{{<col>}}`-style tokens, applied to `field.config.displayName` (or `displayNameFromDS`) in `toTimeSeries.ts` after labels are attached. This is standard Grafana ergonomics (Prometheus/Loki datasources expose exactly this "Legend" field). It is **additive** and only worth doing if maintainers want it; the §3.1 fix alone satisfies the literal request.

Plumbing (standard option pattern — all files identified in §1.3):
1. `src/types/types.ts` — add `legendFormat?: string;` to `CHQuery` (near line 66) and `legendFormat: ''` is implicit (optional, no default needed, but may add to `DEFAULT_QUERY`).
2. `src/views/QueryEditor/helpers/initializeQueryDefaults.ts` — `legendFormat: query.legendFormat ?? ''`.
3. New input component `src/views/QueryEditor/components/QueryTextEditor/components/Inputs/LegendFormatInput.tsx` (copy `StepInput.tsx`/`RoundInput.tsx` structure; bind to `query.legendFormat`).
4. `src/views/QueryEditor/components/QueryTextEditor/hooks/useQueryHandlers.ts` — add `handleLegendFormatChange(e) => onFieldChange({ fieldName: 'legendFormat', value: e.target.value })` and export it.
5. `src/views/QueryEditor/components/QueryTextEditor/QueryTextEditor.tsx` — render `LegendFormatInput` in an existing `<InlineFieldRow>` (only for `time_series`/`table` formats, mirroring the conditional rendering at `:125-158`).
6. `src/datasource/datasource.ts` — pass `target.legendFormat` into `new SqlSeries({...})` (`:353`) and thread to `toTimeSeries` (`:437`); apply as `config.displayName` in `toTimeSeries.ts`.
7. Template substitution: replace `${__field.labels.<col>}` and `{{<col>}}` tokens against the per-series labels map. Keep it small and local to the parser.

### 3.3 Optional consistency fix on the Go backend

In `pkg/response.go`, the value field NAME is set to the joined label values (`createFrameIfNotExistsAndAddPoint` calls `NewDataFieldByTypeOptimized(frameName, …)` at `:234`, where `frameName` is the joined label string from `generateFrameNameByLabels`). Labels are correctly set (`:106`), so `${__field.labels.x}` works for alerts, but the field name conflates identity with the label string. For parity with the frontend fix and with the streaming path (`streaming.go:516` uses the true `srcField.Name`), consider naming the value field after the metric column and keeping labels as the dimension carrier. **Low priority** — the alerting path already exposes labels; this is polish. Do it only if aligning both paths in one PR.

### 3.4 Alternatives considered

- **A. Attach `labels` on the frontend (RECOMMENDED, §3.1).** Pros: exactly the Grafana-native mechanism the user requested; unblocks `${__field.labels.*}` and Data Links; no new UI; mirrors existing Go backend behavior; ~15 LOC. Cons: none material; keep default field `name` to avoid legend churn.
- **B. Only add a "Legend Format" text input, keep joined-string field names.** Pros: familiar Prometheus-style control. Cons: does **not** satisfy the request — `${__field.labels.*}` and Data Links still can't see individual dimensions because there are still no labels. Rejected as the primary fix (viable only as the §3.2 add-on on top of A).
- **C. Force users to switch to `table`.** That is the current workaround the user already found and is complaining about; loses native time-series visualization. Rejected.
- **D. Emit a single wide frame (one time column + N value fields with labels), like `mergeFramesToWide`.** Pros: canonical wide time-series shape. Cons: larger refactor of `toTimeSeries` output contract; higher regression risk across existing dashboards/transforms; unnecessary — per-series frames with labels already satisfy Grafana. Rejected for scope; A achieves the goal with far less risk.

---

## 4. Step-by-step implementation plan (core fix; junior-agent friendly)

1. **Branch** off `master`: `feature/788-timeseries-labels`.
2. **Edit `src/datasource/sql-series/toTimeSeries.ts`:**
   - Above the main `each(self.series, …)` loop (near `:119`), declare `const labelsByKey: { [key: string]: { [col: string]: string } } = {};`.
   - Inside the loop, right after `metricKey` is computed (`:149-165`), if `keyColumns.length > 0`, populate `labelsByKey[metricKey]` with `{ [colName]: String(row[colName]) }` for each `colName` in `keyColumns` (guard `undefined`/object values the same way `metricKey` does — stringify objects, skip `undefined`).
   - In the final `each(metrics, …)` emit (`:203-215`), add `labels: labelsByKey[seriesName]` to the value field object (the second field, `:211`). Leave `name: seriesName` unchanged (option (a), §3.1).
   - Do **not** change the timestamp field or the `refId` logic.
3. **Add/extend unit tests** in `src/spec/sql_series_specs.jest.ts` (see §5.1) — the `describe('sql-series. toTimeSeries unit tests', …)` block at `:353` is the template; existing cases assert the full emitted object shape, so add `labels` to expectations.
4. **Run** `npm run test` and `npm run lint`; fix fallout (existing `toTimeSeries` assertions at `:377, :392, :398, :402` have NO `labels` — those cases have `keys: []`, so `labels` should be `undefined`; confirm the added property is `undefined` there, or `toEqual` will still match since `undefined` props are treated as absent by Jest's `toEqual` — verify, and if needed only add `labels` when defined).
5. **(Optional, §3.2)** Implement the Legend Format input across the files in §1.3 + §3.2, with its own tests.
6. **(Optional, §3.3)** Align `pkg/response.go` field naming and add a Go test (`pkg/response_test.go`).
7. **Manual smoke** (§5.3).
8. **Commit** referencing #788; PR body should state: time_series fields now carry Grafana `labels` from GROUP BY columns, enabling `${__field.labels.<col>}` in Display name overrides and Data Links (parity with the `table` format and with the Go alerting path); default legend unchanged.

**Guard against the `undefined`-label edge:** to keep existing snapshot-style assertions passing, prefer conditionally adding the property:
```ts
const valueField: any = { config: { links: [] }, name: seriesName, values: processedDataPoints.map((v: any) => v[0]) };
if (labelsByKey[seriesName]) { valueField.labels = labelsByKey[seriesName]; }
```

---

## 5. Test plan

### 5.1 Frontend unit tests — `src/spec/sql_series_specs.jest.ts` (extend the `toTimeSeries` block at `:353`)

Follow the existing pattern: build a `selfMock` with `series`, `meta`, `keys`, `from`, `to`, `tillNow`, call `toTimeSeries(true, false, selfMock)`, assert the full result via `toEqual`.

1. **Single GROUP BY dimension → labels present.**
   - `keys: ['airport']`, `meta: [{name:'time',type:'UInt32'},{name:'airport',type:'String'},{name:'value',type:'UInt64'}]`, two rows with `airport:'JFK'` and `airport:'LAX'`.
   - Expect two series; each value field has `labels: { airport: 'JFK' }` / `{ airport: 'LAX' }` and `name` = the airport value (current behavior) and correct `values`.
2. **Two GROUP BY dimensions → composite labels.**
   - `keys: ['airport','site']`; expect field `labels: { airport:'JFK', site:'A' }` and `name: 'JFK, A'` (join order matches `keyColumns`, i.e. `keys` order minus time).
3. **No GROUP BY → no labels (regression guard).**
   - `keys: []`, `meta:[{time},{value}]`; expect the value field to have NO `labels` property (or `undefined`) — must match the existing assertions at `:377/:392`.
4. **Multiple value columns with GROUP BY → each series keeps unique identity + labels.**
   - `SELECT time, airport, count(), avg(x)` shape; assert series don't collide and each carries `labels: { airport: … }`.
5. **Null / non-string label value → stringified safely.**
   - `airport: null` and `airport: 123`; assert `labels.airport` is `'null'`/`'123'` consistent with how `metricKey` stringifies (`String(value)` / `JSON.stringify` for objects) — keep label stringification identical to `metricKey` stringification to avoid mismatched map keys.
6. **`Array(Tuple(...))` / `$columns` expansion path (`toTimeSeries.ts:192-196`)** — assert this still works and that labels are `undefined` for those (no GROUP BY dimension). Guards against breaking the groupArray-expansion branch.

### 5.2 (Optional) Legend Format tests

- Unit-test the token substitution helper: `${__field.labels.airport} - ${__field.labels.site}` against `{airport:'JFK',site:'A'}` → `'JFK - A'`; unknown token → empty/left-as-is (decide and test).
- A query-editor render test that the input updates `query.legendFormat` via `onFieldChange` (mirror existing switch/select tests if present).

### 5.3 Manual / E2E

- `docker compose up --no-deps -d grafana clickhouse`, create a time-series panel with a query grouping by two String columns plus a numeric aggregate.
- In panel options set **Display name** = `${__field.labels.<col1>} - ${__field.labels.<col2>}`; confirm the legend renders the templated values (previously empty).
- Add a **Data Link** using `${__field.labels.<col1>}`; confirm the URL is populated (this is the follow-up complaint).
- Confirm a query WITHOUT GROUP BY still renders and legends unchanged (regression).
- (Optional Playwright, `tests/e2e/features/`): assert a panel with a labels-based Display name override shows non-empty legend text.

### 5.4 Commands

```bash
npm run test          # frontend unit
npm run lint
# if Go path touched:
go test ./pkg/...
npm run e2e           # optional
```

---

## 6. Risks / backward compatibility

| Risk | Assessment |
|---|---|
| Existing dashboards' default legends change | **Mitigated** by keeping value-field `name = seriesName` (option (a), §3.1). Adding `labels` is additive; Grafana's default display name is unaffected when no override uses labels. |
| Jest assertions in `sql_series_specs.jest.ts` break due to new `labels` key | The no-GROUP-BY cases (`keys: []`) must remain label-free. Use the conditional-add guard (§4) so those objects are byte-identical; update only the cases that intentionally add labels. |
| `Array(Tuple(...))` / `$columns` groupArray-expansion branch (`toTimeSeries.ts:192-196`) | Series names there come from `arr[0]`, not GROUP BY keys; leave `labels` undefined for that branch. Test case 6 guards it. |
| Label value stringification mismatch with `metricKey` | Use the **same** stringification for labels as for `metricKey` (String / JSON.stringify object / skip undefined) so the per-series map key and the labels map stay consistent. |
| Multiple value columns collide | Preserve current keying; test case 4. No new collision introduced by attaching labels. |
| Go backend divergence | Frontend (panels) and Go (alerting) now both expose labels; §3.3 is optional polish. If NOT done, behavior is: panels get labels (this fix) and alerts already had them (`response.go:106`) — acceptable and strictly better than today. |
| Data Links | Directly unblocked by the fix (the follow-up comment); covered by manual test in §5.3. |
| Performance | One extra small object per series; negligible. |

**Backward compatibility summary:** additive and low-risk. No query syntax change, no default-legend change (with option (a)), no backend contract change required. Users who never touch `${__field.labels.*}` see identical behavior; users who do get working templating and Data Links.

---

## 7. Effort breakdown

| Sub-task | Estimate |
|---|---|
| Core fix in `toTimeSeries.ts` (build + attach `labels`) | 0.5–1 h |
| Frontend unit tests (6 cases, §5.1) | 2–3 h |
| Run suites, lint, fix assertion fallout | 1 h |
| Manual smoke (legend override + data link) | 0.5–1 h |
| **Core total** | **~0.5–1 day** |
| (Optional) Legend Format input across §1.3 files + tests | +0.5 day |
| (Optional) Go `response.go` field-name alignment + test | +0.25 day |

**Final sizing: SMALL–MEDIUM.** The core, request-satisfying change is small and localized to one frontend function; the optional extras are independent and can be deferred.

---

## 8. Key file:line references (quick index)

- `src/datasource/sql-series/toTimeSeries.ts:113-218` — the function to fix (labels attach at `:203-215`, key build at `:146-165`, `keyColumns` at `:124`).
- `src/datasource/datasource.ts:437` — `toTimeSeries` call site; `:353` `SqlSeries` construction with `keys`; `:1028-1030` GROUP BY key discovery.
- `src/datasource/sql-series/toTable.ts:82-92` — why `table` already works.
- `pkg/response.go:106, :266-276` — Go backend already fills labels (alerting path reference).
- `pkg/streaming.go:516` — streaming preserves `srcField.Labels` (correct reference).
- `src/spec/sql_series_specs.jest.ts:353-403` — existing `toTimeSeries` test pattern to extend.
- `src/types/types.ts:40-75`, `src/views/QueryEditor/.../useQueryHandlers.ts`, `.../QueryTextEditor.tsx`, `helpers/initializeQueryDefaults.ts` — plumbing for the OPTIONAL Legend Format input.
