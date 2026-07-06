# Issue #820 — SQL Expressions feature not supported (Grafana v12.1.1+)

Deep-dive analysis against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/820>
- Title: *"In Grafana v12.1.1, not support the SQL Expression feature"*
- Status at time of writing: **OPEN**, author `frank-lam`. One maintainer comment from `Slach` asking for links/screenshots. The author replied with two links only (no repro steps):
  - Grafana SQL Expressions (private preview announcement): <https://grafana.com/whats-new/2025-05-05-grafana-sql-expressions-now-in-private-preview/>
  - SQL Expressions docs: <https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/sql-expressions/>
- The verbal claim: in Grafana 12.x, when the user adds a **SQL Expression** in the query/transform area, this ClickHouse datasource's query does **not** appear as a usable input / the SQL Expression cannot consume its output.

---

## 0. TL;DR

**What SQL Expressions needs from a datasource** (authoritative — Grafana Plugin Tools "Requirements to support SQL expressions"):
1. The plugin **must have a backend** and the query result must flow **through the backend `QueryData` path** (server-side). Only backend-produced data frames are visible to the Server-Side-Expressions (SSE) engine that runs SQL Expressions. Browser-produced frames are not.
2. **Tabular responses work out-of-the-box** if returned as a **single `data.Frame` with no field labels** (i.e. one frame whose fields are the columns). No `Frame.Meta.Type` is strictly required for the pure-table case, though setting `FrameTypeTable` is best practice.
3. **Labeled / metric responses** (time series, numeric) must conform to the **dataplane contract**: exactly the frame types `timeseries-wide`, `timeseries-multi`, `numeric-wide`, or `numeric-multi`, declared via `Frame.Meta.Type` (+ optional `Frame.Meta.TypeVersion`). SSE then auto-converts these to the tabular `FullLong` shape.
4. If multiple frames are returned they must all carry a frame type and it must be the **same** type; frames with no declared type → SSE errors with "missing data type".

**What the plugin lacks (root cause):** There are **two independent gaps**:

- **Gap A (the decisive one): the dashboard/panel query path bypasses the backend `QueryData` entirely.** The frontend `CHDataSource` **overrides** `DataSourceWithBackend.query()` (`src/datasource/datasource.ts:496`) and issues raw HTTP `FORMAT JSON` requests straight to ClickHouse via `backendSrv.fetch()` (`src/datasource/datasource.ts:155-185`, `:855-858`), parsing the JSON into legacy `{ data: [...] }` shapes on the client (`processQueryResponse`, `:335-444`). The plugin's Go `QueryData` (`pkg/datasource.go:78-131`) — which *does* produce `data.Frame`s — is only exercised by **alerting** (server-initiated). Because SQL Expressions consume the **backend** `QueryData` output, and panels never route through it, the datasource's query is either invisible to / unusable by the SQL Expression engine.
- **Gap B (latent, would bite even after A is fixed): the backend frames are not SSE-consumable.** `toFramesTable` emits **one frame per column** (`pkg/response.go:278-309`), not a single table frame; `toFramesWithTimeStamp` emits **one frame per series** and never sets `Frame.Meta.Type` (`pkg/response.go:67-164`). So even the alerting/backend path returns neither a single unlabeled table frame nor a dataplane-typed multi/wide frame — both required shapes for SSE.

**Recommendation: IMPLEMENT, in two phases.** Phase 1 (Gap B) — make the backend `QueryData` frames dataplane-conformant (single table frame for `table`/logs-less tabular; `timeseries-multi` with `Frame.Meta.Type` for time series). Phase 2 (Gap A) — route panel queries through the backend `QueryData` path (via `DataSourceWithBackend`) so SSE can see the output, while preserving the existing rich client-side features. Phase 2 is the larger and riskier change.

**SDK version:** `grafana-plugin-sdk-go v0.292.1` (`go.mod:7`) already exposes every needed constant (`FrameTypeTimeSeriesMulti/Wide`, `FrameTypeNumericMulti/Wide`, `FrameTypeTable`) and helpers (`data.LongToWide`, `SortWideFrameFields`). **No SDK upgrade required.**

**Effort estimate:** Gap B alone = **Medium (M, ~2-3 days)**. Gap B + Gap A (full end-to-end SQL-Expressions support for panels) = **Large (L, ~1.5-3 weeks)** because of the query-path re-architecture and regression surface. See §7.

---

## 1. Background: how Grafana SQL Expressions selects and consumes datasource output

SQL Expressions (Grafana 12+, GA-ing out of private preview) are a kind of **Server-Side Expression (SSE)**. When a panel/alert has query `A` (a datasource query) and an expression `B` of type "SQL", Grafana's backend SSE engine:

1. Executes query `A` **through the datasource plugin's backend `QueryData`** (the gRPC call into the plugin's `QueryDataHandler`). This is server-side; the browser is not involved in producing `A`'s data for the expression.
2. Takes the returned `data.Frames` for refId `A` and feeds them into an in-memory SQL engine (DuckDB-like) as a table named `A`.
3. Runs the user's SQL (e.g. `SELECT * FROM A LIMIT 10`) and returns the result as the expression's output frame.

Consequences that drive this issue:

- **Backend-only.** From the official requirements page: *"Only plugins with a backend can support SQL expressions."* A datasource that computes results in the browser and hands Grafana a pre-baked frame from `query()` does not participate — SSE re-runs `A` server-side via `QueryData`.
- **Accepted input shapes** (from the requirements page + dataplane contract):
  - **Tabular:** a **single** frame, **no field labels**, columns = fields. Works out-of-the-box; `Frame.Meta.Type = FrameTypeTable` is recommended but not mandatory.
  - **Labeled metric:** must be dataplane-conformant and declare `Frame.Meta.Type` ∈ {`timeseries-wide`, `timeseries-multi`, `numeric-wide`, `numeric-multi`}. SSE converts these to a tabular *FullLong* representation (label keys become columns; a `value` column holds the metric).
  - Multiple frames → all must carry the **same** frame type; a frame with **no** type → SSE error "input data must be a single frame … / missing data type".
- **Diagnostics.** Grafana exposes a Prometheus metric to see why conversion failed:
  `sum(rate(grafana_sse_sql_command_input_count[$__rate_interval])) by (status,attempted_conversion,datasource_type,input_frame_type)`.
  A quick UI smoke test: add a SQL expression with `SELECT * FROM A LIMIT 10`.

Authoritative references:
- Requirements to support SQL expressions — <https://grafana.com/developers/plugin-tools/how-to-guides/data-source-plugins/sql-requirements>
- SQL expressions (user docs) — <https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/sql-expressions/>
- Dataplane contract — <https://grafana.com/developers/dataplane/contract-spec>
- SDK frame types — <https://pkg.go.dev/github.com/grafana/grafana-plugin-sdk-go/data> (`frame_type.go`)

---

## 2. Map of all relevant code (file:line)

### 2.1 Frontend query path (the bypass — Gap A)

| Location | Symbol | Role |
|---|---|---|
| `src/datasource/datasource.ts:32-34` | `class CHDataSource extends DataSourceWithBackend` | Declares a backend datasource, so `super.query()` **would** route through backend `QueryData`. |
| `src/datasource/datasource.ts:496` | `query(options)` | **Overrides** `DataSourceWithBackend.query`. Never calls `super.query()`. Splits into streaming (Grafana Live) and regular; regular → `executeQueries`. |
| `src/datasource/datasource.ts:446-483` | `executeQueries(targets, options)` | Builds SQL via `createQuery` (resource call), runs each via `seriesQuery`, then `processQueryResponse`. |
| `src/datasource/datasource.ts:855-858` | `seriesQuery` | Appends `FORMAT JSON`, calls `_request`. |
| `src/datasource/datasource.ts:155-185` | `_request` | **Direct** `backendSrv.fetch()` to ClickHouse (proxied via datasource `/`), resolves raw ClickHouse JSON. This is NOT the plugin `QueryData` gRPC path. |
| `src/datasource/datasource.ts:335-444` | `processQueryResponse` | Client-side parse into legacy `{ data: [...] }` via `SqlSeries.toTable/toTimeSeries/toLogs/...`. Returns `{ data: result }` to Grafana. |
| `src/datasource/sql-series/sql_series.ts:143-145`, `toTable.ts` | `SqlSeries.toTable` | Client-side table builder producing `{columns, rows, type:'table'}` legacy shape — not `data.Frame`, not routed through backend. |
| `src/datasource/resource_handler.ts:44-96` | `ClickHouseResourceClient` | `createQuery`, `processQueryBatch`, etc. — macro expansion done via `CallResource`, not `QueryData`. |

### 2.2 Backend frame construction (the shape problem — Gap B)

| Location | Symbol | Role |
|---|---|---|
| `pkg/datasource.go:78-131` | `QueryData` | The real backend query entrypoint. Used by alerting today. For each query: parse JSON → `evalQuery` or `executeQuery`. |
| `pkg/datasource.go:31-57` | `executeQuery` | Runs SQL against ClickHouse, calls `clickhouseResponse.toFrames(...)`, returns `backend.DataResponse{Frames: frames}`. **No `Frame.Meta.Type` anywhere.** |
| `pkg/response.go:29-40` | `Response.toFrames` | Dispatch: if a timestamp field exists → `toFramesWithTimeStamp`, else → `toFramesTable`. |
| `pkg/response.go:278-309` | `toFramesTable` | **Builds one `data.Frame` per column** (`framesMap[field.Name] = data.NewFrame(field.Name, singleField)`). Returns N single-column frames. ❌ Not a single table frame; no `Meta.Type`. |
| `pkg/response.go:67-164` | `toFramesWithTimeStamp` | Builds **one frame per series** (`data.NewFrame("", timeField, valueField)`), sets `Labels` on the value field but **no `Frame.Meta.Type`**. ❌ Not declared `timeseries-multi`. |
| `pkg/response.go:225-245` | `createFrameIfNotExistsAndAddPoint` | Frame factory used by the timeseries path; sets `RefID`, never `Meta`. |
| `pkg/streaming.go:488-528` | `mergeFramesToWide` | Streaming-only: merges into a wide frame — but for Grafana Live, not `QueryData`; still no `Meta.Type`. |
| `pkg/streaming.go:695-716` | heartbeat/error frames | The **only** place `Frame.Meta` is set today (`&data.FrameMeta{}` for notices/errors), never a dataplane `Type`. |

### 2.3 Capability declaration

| Location | Symbol | Role |
|---|---|---|
| `src/plugin.json:8` | `"backend": true` | Backend present. ✅ Required for SSE. |
| `src/plugin.json:10` | `"alerting": true` | Alerting enabled — this is why `QueryData` is already exercised server-side. |
| `src/plugin.json:52` | `"grafanaDependency": ">=12.3.0"` | Already ≥ 12.x, so SQL Expressions are in the supported range. No bump needed for capability. |
| `pkg/main.go:27,29` | `QueryDataHandler: ds` | `QueryData` and `CallResource` are wired. |
| `go.mod:7` | `grafana-plugin-sdk-go v0.292.1` | Exposes all needed frame types + helpers. ✅ No upgrade. |

There is **no** dedicated "SQL Expressions" capability flag in `plugin.json` — the requirement is satisfied by `backend: true` **plus** the query actually flowing through `QueryData` with conformant frames. (Confirmed: the requirements page lists no explicit manifest flag.)

---

## 3. Gap analysis

### 3.1 Gap A — panel queries bypass backend `QueryData` (root cause of the issue)

`CHDataSource` extends `DataSourceWithBackend` but overrides `query()` to do **client-side** execution (`backendSrv.fetch` → ClickHouse HTTP → `SqlSeries` parse). Therefore:

- For **panels/Explore**, Grafana receives frames the browser built; the SSE engine, which re-executes refId `A` **server-side through `QueryData`**, is not fed by this path. In practice SQL Expressions either can't select this datasource's query as a valid tabular/metric input, or produce an empty/incompatible result — matching the user's report.
- For **alerting**, Grafana already calls `QueryData` server-side (there is no browser), which is why alerting works today and panels' SQL Expressions do not.

**This is the decisive gap.** No amount of frame-metadata fixing helps panels until the panel query path (or at least a SQL-Expressions-eligible sub-path) goes through the backend `QueryData`.

### 3.2 Gap B — backend frames are not SSE-conformant

Even where `QueryData` *is* used (alerting, and any future backend path), the produced frames violate the accepted shapes:

- **Tabular:** SSE wants **one** frame, columns = fields, no labels. `toFramesTable` returns **N single-column frames** (`pkg/response.go:286-293`). SSE would need a single table frame. ❌
- **Time series:** SSE wants either one wide frame or a set of `timeseries-multi` frames, each with `Frame.Meta.Type` set. `toFramesWithTimeStamp` returns per-series frames **without** `Frame.Meta.Type` (`pkg/response.go:67-164, 225-245`). Result: SSE error "missing data type" or no auto-conversion. ❌

### 3.3 Dataplane conformance specifics

- The dataplane `timeseries-multi` shape = a set of frames, each with a time field (field 0) + one value field carrying `Labels`. The current per-series frames are structurally close (time + single value field, labels present) — so the primary fix for time series is **stamping `Frame.Meta = &data.FrameMeta{Type: data.FrameTypeTimeSeriesMulti, TypeVersion: data.FrameTypeVersion{0,1}}` on every frame** and ensuring the time field is first and named consistently.
- For the pure `table` format, the fix is to **emit a single frame** whose fields are the columns (order preserved from `r.Meta`), optionally `Frame.Meta.Type = FrameTypeTable`.
- SDK helpers available if a wide shape is preferred: `data.LongToWide(longFrame, fillMissing)` and `data.SortWideFrameFields` (`.../data/time_series.go:216,608`).

### 3.4 SDK version

`v0.292.1` is current enough; `frame_type.go` defines `FrameTypeTimeSeriesWide` (`"timeseries-wide"`), `FrameTypeTimeSeriesMulti` (`"timeseries-multi"`), `FrameTypeNumericWide`, `FrameTypeNumericMulti`, `FrameTypeTable`, plus conversion helpers. **No `go.mod` change needed.**

---

## 4. Design decision: how to close Gap A

Three viable approaches; pick per appetite for risk.

**Option 1 — Route all panel queries through backend `QueryData` (full fix, RECOMMENDED long-term).**
Stop overriding `query()` for the non-streaming, non-special-format cases; let `DataSourceWithBackend.query()` (or an explicit call to it) drive the backend. Move the macro expansion + timezone + format logic that currently lives in the frontend/`SqlSeries` into the Go `QueryData` path (much of it already exists: `eval` package, `toFrames`). Keep the frontend override **only** for the features SSE/backend can't do (logs context, Grafana Live streaming, variable queries, annotations).
- Pros: SQL Expressions "just work" for panels; also unifies alerting vs panel behavior (fixes latent inconsistencies); backend becomes the single source of truth.
- Cons: Large surface. `SqlSeries.toTimeSeries/toTable/toLogs/toTraces/toFlamegraph` behaviors must be reproduced/verified in Go `toFrames`; risk of subtle visual regressions (extrapolation, `nullifySparse`, big-int precision handling, traces/flamegraph). Requires broad E2E re-validation.

**Option 2 — Add a backend path used *only* when a SQL Expression references the query (scoped fix).**
Keep the current client path as default, but when Grafana runs SSE it already calls `QueryData` server-side regardless of the frontend override (SSE does not use the JS `query()`), so **fixing Gap B is often sufficient for SQL Expressions specifically**, provided the query's `format` maps to a conformant backend frame. In other words: the frontend override affects *panel rendering*, but SSE re-executes `A` via `QueryData` on its own. If that is confirmed true in 12.x (SSE calls the plugin's `QueryData` directly for the referenced refId), then **Phase 1 (Gap B) alone may resolve #820**, and Gap A only matters for the *non-SSE* panel rendering (which already works via the client path).
- Pros: Much smaller; no query-path rewrite.
- Cons: Must be **empirically verified** in a live Grafana 12.x that SSE invokes `QueryData` for a datasource whose JS `query()` is overridden. This is the key open question (§8). If SSE instead relies on the frontend to have produced backend-visible frames, Option 1 is required.

**Option 3 — Do nothing / document limitation.** Not recommended; the feature is increasingly default in Grafana 12.x and users expect it.

**Recommendation:** Implement **Phase 1 (Gap B)** first (cheap, correct regardless), then **empirically test** whether SQL Expressions now work for panels (validates the Option 2 hypothesis). If they do not, proceed to **Phase 2 = Option 1** (route panel queries through backend `QueryData`).

---

## 5. Step-by-step implementation plan

### Phase 1 — Make backend `QueryData` frames SSE-conformant (Gap B)

1. **Branch** off `master`: `feature/820-sql-expressions`.

2. **Table format → single frame.** In `pkg/response.go`, refactor `toFramesTable` (`:278-309`) to build **one** `data.Frame` whose fields are the columns in `r.Meta` order (instead of one frame per column). Concretely:
   - `frame := data.NewFrame("")` then, for each `field := range r.Meta`, append `NewDataFieldByTypeOptimized(field.Name, field.Type, needsString)` to `frame.Fields` (preserve `r.Meta` order — do **not** iterate the row map, which is unordered).
   - Populate row-by-row by appending into `frame.Fields[colIdx]`.
   - Set `frame.RefID = query.RefId` and `frame.Meta = &data.FrameMeta{Type: data.FrameTypeTable}`.
   - Return `data.Frames{frame}`.
   - Keep the existing precision analysis (`analyzeColumnPrecisionNeeds`).

3. **Time series → declare `timeseries-multi`.** In `toFramesWithTimeStamp` / `createFrameIfNotExistsAndAddPoint` (`pkg/response.go:225-245`), after creating each frame set:
   ```go
   framesMap[frameName].Meta = &data.FrameMeta{
       Type:        data.FrameTypeTimeSeriesMulti,
       TypeVersion: data.FrameTypeVersion{0, 1},
   }
   ```
   Ensure the **time field is `Fields[0]`** (already the case) and the value field carries `Labels` (already set at `:106`). This makes each per-series frame a valid dataplane `timeseries-multi` member; SSE will FullLong-convert them.

4. **(Optional) Numeric (no-time) aggregates.** If a tabular result is actually a single-row metric set intended as numeric, leaving it as `FrameTypeTable` is fine (tabular works out-of-the-box). Do **not** over-engineer numeric-wide unless a concrete need appears.

5. **Backend tests** in `pkg/` (mirror existing table-driven tests, e.g. around `pkg/response*_test.go`):
   - `toFramesTable` now returns exactly **one** frame with N fields in `r.Meta` order and `Meta.Type == FrameTypeTable`.
   - `toFramesWithTimeStamp` frames each have `Meta.Type == FrameTypeTimeSeriesMulti`, time field first, value field labeled.
   - A regression test asserting existing alerting behavior (values/labels unchanged).

6. **Build + test:** `mage -v` (or `go build ./...`), `go test ./pkg/...`.

7. **Empirical SSE check (decides whether Phase 2 is needed):** Bring up Grafana 12.x (`docker compose up --no-deps -d grafana clickhouse`), create a panel with a ClickHouse query `A` (table format) + a SQL expression `B`: `SELECT * FROM A LIMIT 10`. Observe whether `B` returns rows. Also check the metric `grafana_sse_sql_command_input_count` labels (`status`, `input_frame_type`). If `B` works → **Gap A does not block SSE**; Phase 1 is sufficient, stop here. If it errors with "missing data type" or empty → proceed to Phase 2.

### Phase 2 — Route panel queries through backend `QueryData` (Gap A), only if Phase 1's SSE test fails

8. **Introduce a backend-driven query path.** For non-streaming, non-special targets, call `super.query(options)` (the `DataSourceWithBackend` implementation) so Grafana runs the plugin's Go `QueryData`. This requires the backend to fully expand macros (it already does via `eval.EvalQuery.ApplyMacrosAndTimeRangeToQuery`, `pkg/eval/eval_query.go`) and produce the correct frames for each `format`.

9. **Move/verify format handling in Go.** Ensure `QueryData` respects `target.format` (`time_series` | `table` | `logs` | `traces` | `flamegraph`) and reproduces the frontend `SqlSeries` semantics:
   - `time_series`: `timeseries-multi` frames (from Phase 1) + `extrapolate` / `nullifySparse` options plumbed into `eval`/`toFrames`.
   - `table`: single table frame (Phase 1).
   - `logs`: log frames (`FrameTypeLogLines` shape) — verify parity with `SqlSeries.toLogs`.
   - `traces` / `flamegraph`: these have bespoke frontend builders (`toTraces`, `toFlamegraph`); either implement Go equivalents or keep them on the client override (they are not typical SSE inputs).

10. **Preserve client-only features.** Keep the frontend override for: Grafana Live **streaming** targets (already separate at `:501-640`), **logs context** (`getLogRowContext`), **variable** queries (`queryVariables`), **annotations** (`annotationQuery`). Route only the "regular panel" targets to `super.query`.

11. **Regression E2E:** run the Playwright suite (`npm run e2e`) for time_series/table/logs panels; compare against snapshots. Pay special attention to big-int precision (`analyzeColumnPrecisionNeeds`, issue #832), timezone handling (`fetchTimeZoneFromFieldType`), and `$rate`/`$columns` macro outputs.

12. **Commit / PR** referencing #820, describing: SSE requires backend `QueryData` output; Phase 1 makes frames dataplane-conformant; Phase 2 (if needed) routes panels through the backend. Note SDK already sufficient (no bump).

---

## 6. Test plan

### 6.1 Unit (Go, `pkg/`)
- `toFramesTable` → single frame, field order == `r.Meta`, `Meta.Type == data.FrameTypeTable`, correct row count.
- `toFramesWithTimeStamp` → each frame `Meta.Type == data.FrameTypeTimeSeriesMulti`, `TypeVersion == {0,1}`, `Fields[0]` is the time field, value field labeled.
- Precision: UInt64/Int64 columns with large values still render as string fields (no regression to #832).
- Timezone: DateTime columns parsed with the server TZ unchanged.

### 6.2 Manual / UI (Grafana 12.x) — the definitive check
- `docker compose up --no-deps -d grafana clickhouse`.
- Panel: query `A` = `SELECT now() AS t, number AS value FROM numbers(10)` (time_series) and a table query; add SQL expression `B` = `SELECT * FROM A LIMIT 10`. Confirm `B` returns rows for both formats.
- Inspect **Query Inspector** → the expression node's input; confirm the datasource frame reached SSE.
- Prometheus (if available): `sum(rate(grafana_sse_sql_command_input_count[$__rate_interval])) by (status,attempted_conversion,datasource_type,input_frame_type)` — expect `status="ok"` and a sensible `input_frame_type` (`table` / `timeseries-multi`).

### 6.3 E2E (Playwright, `tests/e2e/`)
- After Phase 1: no behavioral change expected for existing panels (backend frames only affect alerting/SSE). Run the suite to confirm no regressions.
- After Phase 2 (if done): full re-run; add a spec that adds a SQL expression on a ClickHouse query and asserts the expression output table is non-empty.

### 6.4 Commands
```bash
# backend
mage -v            # or: go build ./... && go test ./pkg/...
# frontend
npm run test
npm run lint
npm run e2e        # heavier; run after Phase 2
```

---

## 7. Effort breakdown

| Sub-task | Estimate |
|---|---|
| Phase 1: `toFramesTable` → single frame | 0.5 day |
| Phase 1: stamp `timeseries-multi` on time series frames | 0.25 day |
| Phase 1: backend unit tests | 0.75 day |
| Phase 1: manual SSE verification in Grafana 12.x | 0.5 day |
| **Phase 1 subtotal** | **~2 days (M)** |
| Phase 2: route panel queries via backend `QueryData` | 3-5 days |
| Phase 2: parity for formats (time_series/table/logs; extrapolate/nullifySparse/precision/tz) | 2-4 days |
| Phase 2: E2E regression + snapshot updates | 1-2 days |
| **Phase 2 subtotal (if needed)** | **~1.5-2.5 weeks (L)** |

**Sizing:** Phase 1 = **Medium**. If Phase 1 alone resolves SSE (likely — SSE calls `QueryData` server-side irrespective of the JS override; **must verify in §6.2**), the whole issue is Medium. If not, add Phase 2 → overall **Large**.

---

## 8. Risks, edge cases, open questions

**Open question (must resolve empirically, gates Phase 2):**
- **Does SSE invoke the plugin's backend `QueryData` for a datasource whose JS `query()` is overridden?** The SSE engine runs server-side and re-executes the referenced refId through the plugin backend; it does **not** use the browser `query()`. If true (very likely per the "backend-only" requirement), **Phase 1 alone fixes #820** and Gap A only matters for non-SSE rendering (already working). Verify with §6.2 before committing to Phase 2.

**Risks / edge cases:**
- **Table field ordering.** `toFramesTable` currently iterates `row` maps (Go map order is random). The single-frame refactor **must** iterate `r.Meta` for deterministic column order, and append values by locating each column's index — do not rely on map iteration.
- **Empty results.** A single table frame with zero rows must still be returned (SSE needs the schema). Preserve field creation even when `r.Data` is empty.
- **Big-int precision (#832).** The single-frame table path must keep the per-column `needsStringPrecision` logic; otherwise large UInt64/Int64 regress.
- **Mixed frame types.** If a query somehow yields both a timestamp column and is used as a table, ensure exactly one dispatch (`getTimestampFieldIdx`) and one declared type; SSE errors if multiple frames carry different types.
- **`timeseries-multi` vs `timeseries-wide`.** Multi (per-series frames) is closest to the current output and is accepted by SSE; wide would require merging (helpers exist: `LongToWide`). Prefer multi to minimize change.
- **Traces / flamegraph.** Not standard SSE inputs; keep on the client path in Phase 2 to avoid scope creep.
- **Streaming.** Grafana Live streaming frames are a separate channel and out of scope for SQL Expressions; leave `mergeFramesToWide` as-is.
- **Alerting regression.** Since alerting already uses `QueryData`, the Phase 1 frame changes touch a live path — the unit tests in §6.1 and an alerting smoke test are mandatory before merge.
- **Grafana version.** SQL Expressions were private-preview in 5/2025 and may be behind a feature toggle in some 12.x builds; verify the toggle is on in the test instance (`sqlExpressions` or similar) when validating.

---

### Key file:line references
- `src/datasource/datasource.ts:496` — `query()` override (bypasses backend `QueryData`) — **Gap A**
- `src/datasource/datasource.ts:446-483`, `:155-185`, `:855-858` — `executeQueries` / `_request` / `seriesQuery` (client-side HTTP path)
- `src/datasource/datasource.ts:335-444` — `processQueryResponse` (client-side legacy parse)
- `pkg/datasource.go:78-131` — backend `QueryData` (used by alerting; the SSE entrypoint)
- `pkg/datasource.go:31-57` — `executeQuery` → `toFrames` (no `Meta.Type`)
- `pkg/response.go:278-309` — `toFramesTable` (one frame **per column** — must become single frame) — **Gap B**
- `pkg/response.go:67-164`, `:225-245` — `toFramesWithTimeStamp` / `createFrameIfNotExistsAndAddPoint` (per-series frames, no `Meta.Type`) — **Gap B**
- `pkg/streaming.go:695-716` — only existing `Frame.Meta` usage (notices/errors)
- `src/plugin.json:8,10,52` — `backend:true`, `alerting:true`, `grafanaDependency>=12.3.0`
- `go.mod:7` — `grafana-plugin-sdk-go v0.292.1` (has all frame types + `LongToWide`/`SortWideFrameFields`; no upgrade needed)
- SDK `data/frame_type.go:27,44,57,62,67` — `FrameTypeTimeSeriesWide/Multi`, `FrameTypeTable`, `FrameTypeNumericWide/Multi`
