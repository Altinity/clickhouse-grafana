# Issue #645 — "Support for Trace to Metrics data links" — Deep-Dive Analysis

**Repo:** Altinity/clickhouse-grafana
**Branch analyzed:** `datalinks-fixed` (HEAD `908f845e`)
**Open PR:** #899 "Datasource-level data link configuration" (`datalinks-fixed` → `master`, +3333/-44, 25 files, not merged, mergeable, no reviews/comments)
**Analysis date:** 2026-06-21
**Verdict (short):** PARTIAL. The feature delivers a generic field-level cross-datasource data-link mechanism that *can* link a span column to a metrics datasource, but it is **not** Grafana's native trace-to-metrics. Recommendation: **close #432 as satisfied; keep #645 open (or close-with-caveat) and re-scope it to native parity.** The repo's own CHANGELOG already says "partially addresses #645", contradicting the commit/PR "Closes/fix #645".

---

## 0. Source-of-truth artifacts

### Issue #645 (verbatim)
- Title: "Support for Trace to Metrics data links"
- State: **OPEN**, author `maruthgoyal`, label `p2`, milestone `3.5.0`, assignee `lunaticusgreen`, **0 comments**.
- Body (full):
  > Would it be possible to support the trace <> metrics linkage feature in Grafana for the clickhouse datasource?
  > https://grafana.com/blog/2022/08/18/new-in-grafana-9.1-trace-to-metrics-allows-users-to-navigate-from-a-trace-span-to-a-selected-data-source/

The wording is deliberately generic ("would it be possible to support…the trace <> metrics linkage feature in Grafana"). It links the **Grafana 9.1 native trace-to-metrics** blog post, so the user's mental model is the native, per-span "Related metrics" dropdown in the trace view — not a generic column link.

### Issue #432 (the other commit claim)
- Title: "[Feature] Add support for internal link", State: **OPEN**, label `p3`, milestone `3.5.0`.
- Body: asks for Grafana **internal links** so users can "jump from research results directly into other datasource" — explicit example: store logs in ClickHouse, click the `trace_id` column → a trace panel opens. Notes ElasticSearch and Loki already support internal link.
- This is exactly the generic field-data-link request, and the implemented feature **does** satisfy it (see §7).

### PR #899
- Body is literally: `fix #645` / `fix #432`.
- No reviews, no review comments, no issue comments. Adds the `datalinks/` module, ConfigEditor UI, converter wiring, unit/component tests, a demo dashboard, provisioning example, README + CHANGELOG, and design/plan docs.
- **CHANGELOG.md (HEAD) line 3** says: "…**closes** #432, **partially addresses** #645." This is the most honest internal statement and contradicts the commit message ("Closes #432 and #645") and the PR body ("fix #645").

---

## 1. What Grafana's NATIVE trace-to-metrics actually is

Grafana 9.1 (Aug 2022) introduced **trace-to-metrics** as a configuration block on a **tracing datasource** (Tempo, Jaeger, Zipkin, and the official Grafana ClickHouse plugin's trace datasource). It is a sibling of the older **trace-to-logs** (`tracesToLogsV2`) subsystem. The shape (Grafana core `TraceToMetricsOptions`, defined in `grafana/packages/grafana-data` / the Tempo datasource's `configuration` module — **note: not exported in the public `@grafana/data` / `@grafana/runtime` SDK**, see §1.3) is:

```ts
// Conceptual schema stored under tracing-datasource jsonData.tracesToMetrics
interface TraceToMetricsOptions {
  datasourceUid?: string;          // default metrics datasource to query
  spanStartTimeShift?: string;     // e.g. "-2m" — widen window before span start
  spanEndTimeShift?: string;       // e.g. "2m"  — widen window after span end
  tags?: Array<{ key: string; value?: string }>; // span tag -> query label mapping
  queries?: Array<{                // one or more named metric queries
    name?: string;                 // label shown in the per-span dropdown
    query?: string;                // PromQL/metric query with macros (see below)
  }>;
}
```

### 1.1 The macros native trace-to-metrics exposes
Inside `queries[].query`, Grafana interpolates **span-aware** macros at click time:
- **`$__tags`** — expands to a label matcher built from the `tags` mapping using the **clicked span's** tag values, e.g. `{service="checkout", http_status_code="500"}`. This is the load-bearing feature: it injects per-span tag values into the metric query.
- **`$__span.duration`**, **`$__span.name`**, **`$__span.kind`**, **`$__span.statusCode`** etc. — individual span attributes.
- Time range is derived from the span's start/end **shifted** by `spanStartTimeShift` / `spanEndTimeShift`, so the metric query is automatically scoped to the span's time window (± shift) rather than the dashboard range.

### 1.2 WHERE Grafana reads/renders it
- **Config:** the trace datasource's settings page renders a "Trace to metrics" section (datasource UID picker, time-shift inputs, tag table, query list). Stored in that datasource's `jsonData.tracesToMetrics`.
- **Render:** the **TraceView panel** (used in Explore and the Traces panel) reads `tracesToMetrics` from the datasource that produced the trace and renders a contextual **"Related metrics" dropdown on each span's detail row**. Each entry corresponds to one `queries[]` item; clicking it opens the configured metrics datasource with `$__tags`/`$__span.*` resolved from *that span* and the time window set from the span ± shift.

The key UX distinction: native trace-to-metrics is a **per-span contextual menu in the span-detail drawer**, not a link painted on a fixed table column.

### 1.3 What the SDK exposes (verified in this repo's node_modules)
- `grep -rl "tracesToMetrics|TraceToMetrics|traceToMetrics" node_modules/@grafana/` → **no matches**. The `tracesToMetrics` schema and `$__tags`/`$__span.*` macro engine live in **Grafana core**, not in the public plugin SDK. A datasource plugin cannot "implement" native trace-to-metrics merely by setting types from `@grafana/data`.
- What the SDK *does* expose (relevant to the implemented feature):
  - `@grafana/data/.../types/dataLink.d.ts:31` `DataLink { title; url; targetBlank?; internal?: InternalDataLink; ... }`
  - `:63` `InternalDataLink { query; datasourceUid; datasourceName; panelsState?: ExplorePanelsState; range?: TimeRange }`
  - `.../types/explore.d.ts:63` `ExploreTracePanelState { spanId?: string }` (this is what the plugin sets — it only *highlights a span in the target trace view*; it is NOT trace-to-metrics).
  - `.../types/trace.d.ts:26` `TraceSpanRow` — the canonical span shape Grafana's TraceView consumes; note it carries `tags?: TraceKeyValuePair[]` and `serviceTags` as **arrays of {key,value}**, which is how span tags are represented.

**Conclusion:** Native trace-to-metrics = a Grafana-core, trace-datasource-scoped, per-span, tag-mapping + time-shift subsystem rendered as a span-detail dropdown. The implemented feature is a generic `DataLink.internal` cross-datasource link attached to fixed result columns. They are different mechanisms living at different layers.

---

## 2. Full read of the implemented feature

### 2.1 Files (all read)
| File | Role |
|---|---|
| `src/datasource/datalinks/types.ts` | `DataLinkConfig` + `CHFormat` union |
| `src/datasource/datalinks/buildDataLink.ts` | config → Grafana `DataLink` |
| `src/datasource/datalinks/applyDataLinks.ts` | attach links to fields by exact name |
| `src/datasource/datalinks/index.ts` | barrel exports |
| `src/views/ConfigEditor/components/DataLinks/DataLinkEditor.tsx` | single-link editor UI |
| `src/views/ConfigEditor/components/DataLinks/DataLinksSection.tsx` | list + add UI |
| `src/views/ConfigEditor/ConfigEditor.tsx` | renders section (`:253`), persists (`:96`) |
| `src/types/types.ts:94` | `CHDataSourceOptions.dataLinks?: DataLinkConfig[]` |
| `src/datasource/datasource.ts:57,79,405-406` | reads jsonData, forwards `dataLinks` + `app` |
| `src/datasource/sql-series/sql_series.ts:117-118,137-158` | `SqlSeries` carries `dataLinks`/`app`, forwards to converters |
| `src/datasource/sql-series/toTraces.ts` | traces wiring (`applyDataLinks` at `:87`) |
| `src/datasource/sql-series/toLogs.ts` | logs wiring (`:228`) + column promotion (`:97-101, 203-217`) |
| `src/datasource/sql-series/toTimeSeries.ts:212` | time-series wiring |
| `src/datasource/sql-series/toFlamegraph.ts:65` | flamegraph wiring |
| Tests: `src/spec/datalinks.test.ts`, `src/spec/sql_series_specs.jest.ts` (converter blocks at `:792+`), `src/spec/DataLinkEditor.test.tsx`, `src/spec/DataLinksSection.test.tsx` | |
| `docs/superpowers/specs/2026-05-17-data-links-design.md` | canonical design doc |

### 2.2 Data model
`DataLinkConfig` (`types.ts:3`): `{ fieldName, title, url?, targetDatasourceUid, query, format? }`, `CHFormat = 'table'|'logs'|'traces'|'time_series'|'flamegraph'`. Stored at **datasource level** in `jsonData.dataLinks` (read at `datasource.ts:79`). No per-span/per-query configuration. No `id`; React keys by index.

### 2.3 `buildDataLink` (three branches)
1. **External** (`buildDataLink.ts:36`): `config.url` set → `{ title, url, targetBlank }`. No `internal`.
2. **ClickHouse target** (`:39`): `internal.query` is a full `CHQuery` (`refId:'datalink'`, `query`, `rawQuery`, `format`, `datasourceMode:Datasource`, `extrapolate:false`, `adHocFilters:[]`…). For `format==='traces'` it adds `internal.panelsState = { trace: { spanId: '${__value.raw}' } }` (`:62-64`) — this **highlights the clicked span in the *target's* trace view**, it is not metrics navigation.
3. **Non-CH target** (`:67`): generic `internal.query = { refId:'datalink', query }`. This is the path used for a metrics datasource (Prometheus, Mimir, the time_series CH format on a non-CH target, etc.).

`targetBlank` heuristic (`:32`): false in Explore (split pane), true elsewhere. `isClickHouseTarget` (`:8`) resolves the target type via `getDataSourceSrv().getInstanceSettings(uid)?.type === 'vertamedia-clickhouse-datasource'`.

### 2.4 `applyDataLinks` (`applyDataLinks.ts:15`)
Iterates `fields`; for each field whose `name === config.fieldName` (exact, case-sensitive; honors optional `allowedFieldNames`), builds links and **appends** to `field.config.links`. Pure mutation; no-op when configs empty.

### 2.5 Wiring (verified end-to-end)
`datasource.ts:397-407` `processQueryResponse` builds `SqlSeries` with `dataLinks: this.dataLinks, app: options.app`, then dispatches by `target.format`:
- `traces` → `toTraces` (`:414`)
- `flamegraph` → `toFlamegraph` (`:416`)
- `logs` → `toLogs` (`:418`)
- `table` → `toTable` (`:410`) — **toTable receives no dataLinks; table is NOT wired** (confirmed: no `dataLinks`/`applyDataLinks`/`DataLink` reference in `toTable.ts`). Documented Non-Goal (legacy `{columns, rows}` shape).
- time_series path also flows through `toTimeSeries` (`:212`).
- **Minor gap:** the **log-context** code path builds `SqlSeries` *without* `dataLinks`/`app` (`datasource.ts:283-287, 331-335`) — log context rows won't carry links. Irrelevant to #645 but worth noting.

### 2.6 The TRACES use-case — exact capabilities & limits
**Linkable trace fields** (the only field names a `fieldName` can match — from `toTraces.ts:23-34` / `createEmptyFields`):
`traceID`, `spanID`, `operationName`, `parentSpanID`, `serviceName`, `startTime` (number), `duration` (number), `tags` (FieldType `other`), `serviceTags` (FieldType `other`).

- **Individual span tags are NOT addressable.** `tags`/`serviceTags` are built as a single field whose value is an **array of `{key,value}`** per span (`toTraces.ts:80-83`). A `DataLinkConfig.fieldName` can only match the whole `tags` field, not `tags.http_status_code`. So you cannot map a specific span tag into a target metric query the way native `$__tags` does.
- **Interpolation available in the target query** (Grafana resolves at click time): `${__value.raw}` (the clicked cell's value), `${__data.fields.<name>}` (other fields *in the same row* — e.g. `${__data.fields.serviceName}`, `${__data.fields.duration}`), `$__from`/`$__to` (the **dashboard** time range), `${__field.name}`, and dashboard template vars. (Documented in `DataLinkEditor.tsx:127`.)
- **Can a user realistically build "from span → metrics query"?** Partially yes, with caveats:
  - You attach a link to e.g. `serviceName` or `operationName`, target = your Prometheus/Mimir datasource, query = `rate(http_requests_total{service="${__value.raw}"}[5m])`. Clicking that span's `serviceName` cell opens metrics. This works.
  - You can pull a few additional same-row fields via `${__data.fields.X}` (only the 9 trace fields above; arbitrary span tags are unavailable).
  - **But:** (a) the link lives on a **table column cell** in the Trace Search/list table, **not** in the span-detail drawer of the waterfall; (b) the time range is the **dashboard range**, NOT the span's start/end ± shift — so you lose the "metrics around this span's window" semantics that native trace-to-metrics gives for free; (c) no default-metrics-datasource convenience (each link hard-codes `targetDatasourceUid`); (d) the contextual multi-query "Related metrics" dropdown does not exist.

---

## 3. Gap analysis vs native trace-to-metrics

| Native capability | Implemented? | How much it matters for #645 |
|---|---|---|
| **Per-span tag access** via `$__tags` (clicked span's tag values injected as label matchers) | **No** — tags are a single `other`-typed array field; not individually addressable | **High.** This is the defining feature of trace-to-metrics; metric queries are usually scoped by span tags (service, status, route). Without it the link can only use the ~9 fixed columns. |
| **Span-scoped time window** (`spanStartTimeShift`/`spanEndTimeShift` around span start/end) | **No** — links use dashboard `$__from`/`$__to` only | **High.** "Show metrics around this span" is a core use case; dashboard-range metrics are far less useful for a single span. |
| **Default metrics datasource** (`datasourceUid` once, reused) | **No** — each link hard-codes `targetDatasourceUid` | Medium. Workable but more config; and you typically want *one* metrics target reused across queries. |
| **Per-span "Related metrics" dropdown in the span-detail drawer** | **No** — link is rendered on a fixed table-column cell | **High** (UX). Users following the blog expect the contextual span dropdown, not a column link in the search table. |
| **Multiple named metric queries** per trace datasource (`queries[]` with `name`) | Partial — multiple `DataLinkConfig` on the same field produce multiple popover entries, but they are per-column, not per-span, and not "named queries" in the native sense | Medium. |
| `$__span.duration` / `$__span.name` / `$__span.kind` etc. macros | **No** — only `duration`/`operationName`/`serviceName` reachable as same-row fields via `${__data.fields.X}` (a subset) | Medium. |
| Cross-datasource internal link to ANY datasource (incl. metrics) | **Yes** (`buildDataLink.ts:67-76`) | This is the one native-adjacent capability the feature does deliver. |
| Open target in Explore / split pane / new tab | **Yes** (`targetBlank` heuristic) | Low. |
| Highlight clicked span in *target* trace view | **Yes** (`panelsState.trace.spanId`) — but this is trace-to-trace, not trace-to-metrics | Low (orthogonal). |

**Net:** the feature provides cross-datasource navigation (the transport layer) but lacks every span-contextual capability (`$__tags`, span time window, span-detail dropdown, span attribute macros) that makes native trace-to-metrics what it is. The three High-impact gaps mean a user who read the linked blog post will not consider #645 "done".

---

## 4. Decision & recommendation

**Recommendation: split the two issues.**

- **#432 ("Add support for internal link") → CLOSE as satisfied.** The implemented generic field-level internal/external data link is exactly what #432 asked for (click `trace_id` in logs → open trace; parity with ES/Loki internal links). The logs-column promotion (`toLogs.ts:203-217`) even makes the canonical `trace_id`-in-logs example work without aliasing. The design doc (`2026-05-17-data-links-design.md:24-29`) and CHANGELOG agree.

- **#645 ("Trace to Metrics data links") → KEEP OPEN, re-scoped (or CLOSE-WITH-CAVEAT only if maintainers accept the generic approach as "good enough").** Reasoning:
  1. The issue explicitly links Grafana's **native** trace-to-metrics blog post; the requester's expectation is the per-span, tag-mapped, time-shifted "Related metrics" dropdown.
  2. The feature delivers cross-datasource links to a metrics datasource, but with **none** of the three High-impact span-contextual capabilities (`$__tags`, span-window time shift, span-detail dropdown). Span tags — the whole point — are not individually addressable.
  3. The project's **own CHANGELOG says "partially addresses #645"**, while the commit/PR say "Closes/fix #645". This contradiction should be resolved in favor of the CHANGELOG's honesty.

**Concrete action for maintainers:**
- Edit PR #899 body to `closes #432` and `partially addresses #645` (match the CHANGELOG), so merging #899 auto-closes only #432.
- Either keep #645 open relabeled "native trace-to-metrics (Tempo-style tag mapping)" with the design in §5 attached, OR — if the team is comfortable telling the requester "use a data link on a span column to your metrics datasource" — close #645 with a comment showing that recipe and the documented limitations (dashboard time range, no per-tag mapping). Given it's `p2` and explicitly references the native feature, **keeping it open for true parity is the defensible call.**

---

## 5. If native parity is wanted — design

### 5.1 Config schema (mirror Grafana core)
Add to `CHDataSourceOptions` (`src/types/types.ts`):
```ts
tracesToMetrics?: {
  datasourceUid?: string;          // default metrics datasource
  spanStartTimeShift?: string;     // "-2m"
  spanEndTimeShift?: string;       // "2m"
  tags?: Array<{ key: string; value?: string }>; // span tag key -> target label
  queries?: Array<{ name?: string; query: string }>;
};
```
This is independent of the existing `dataLinks` (which stays for #432).

### 5.2 Exposing span tags (the hard part)
Native `$__tags` needs the clicked span's tag *values*. Two options:
- **(A) Promote mapped tags to individual fields.** In `toTraces.ts`, for each `tags`/`serviceTags` key listed in `tracesToMetrics.tags`, emit a dedicated string field (e.g. `__span_tag_service`) so it becomes addressable by `${__data.fields.__span_tag_service}`. Then build a per-span link whose query has `$__tags` pre-expanded into `{service="${__data.fields.__span_tag_service}", ...}`. Pros: works through the public SDK data-link mechanism. Cons: still a column link, not a span-detail dropdown; we'd hide these synthetic fields from the table.
- **(B) Custom span-detail rendering.** Not feasible: TraceView's "Related metrics" dropdown is rendered by Grafana core from the trace datasource's `tracesToMetrics`; a non-core plugin cannot inject that dropdown. So true span-detail-dropdown parity is **blocked at the SDK level** unless Grafana core treats this plugin's datasource as a trace source it reads `tracesToMetrics` from (it does not for arbitrary plugins).

**Honest conclusion:** full native parity (the span-detail dropdown) is **not achievable** from a third-party datasource plugin via the public SDK. The realistic ceiling is option (A): a *trace-to-metrics-flavored* link with `$__tags`-style tag interpolation and span-window time-shift, rendered on span columns. That closes the functional gap (tag mapping + time window) but not the UX gap (dropdown location).

### 5.3 Time-shift support
Add `range` to the built `InternalDataLink` (the SDK supports `InternalDataLink.range?: TimeRange`, `dataLink.d.ts:71`) computed from the span's `startTime`/`duration` ± shifts, instead of relying on dashboard `$__from`/`$__to`. This is the most valuable cheap win and IS achievable.

### 5.4 UI
A new "Trace to Metrics" subsection in ConfigEditor: metrics DS picker, two time-shift inputs, a tag-mapping table, and a query list — mirroring Tempo's config UI. Reuse `DataSourcePicker` + `CodeEditor` already imported.

### 5.5 Effort
- **Cheap option (recommended first):** document the existing field-link recipe for trace→metrics in README, add the missing **toTraces e2e/integration test** (§6), and add **span-window `range`** to trace-format links. **Size: S** (≈1–2 days). Delivers the time-window win + clarifies #645 scope.
- **Functional parity (option A: `$__tags`-style tag promotion + time-shift + config UI):** **Size: M** (≈4–7 days): schema + types, toTraces tag promotion + per-span link building, time-shift range, ConfigEditor subsection, tests.
- **True native UX parity (span-detail dropdown):** **Size: L and likely BLOCKED** — requires Grafana core to recognize the plugin as a trace datasource source of `tracesToMetrics`; not deliverable via the public SDK. Confirm with maintainers before promising.

---

## 6. Test gap & the missing toTraces test

**Correction to the prior shallow pass:** there IS a converter-level unit test for the toTraces wiring — `src/spec/sql_series_specs.jest.ts:792` `describe('sql-series. toTraces data links')` with two cases (attach to matching field; no-op when undefined). Also covered: toLogs (`:841`, incl. column promotion + labels exclusion + body link), toFlamegraph (`:891`), toTimeSeries (`:909`), plus `datalinks.test.ts` (buildDataLink/applyDataLinks unit tests) and the two React component tests.

**What is genuinely missing:**
1. **No E2E test whatsoever for data links / traces.** `grep` over `tests/e2e/` for `dataLink|trace|spanId|panelsState` → zero hits; no `*trace*`/`*datalink*` e2e file. The design doc itself (`:290-300`) defers E2E to manual verification.
2. **No unit assertion that a traces link produces `panelsState.trace.spanId`** — `datalinks.test.ts` tests `buildDataLink` directly for this, but there is no test that exercises `toTraces` → built link end-to-end carrying the spanId (i.e. the integration of `applyDataLinks` + `buildDataLink` for `format:'traces'`). The existing toTraces test uses a non-CH target with no `format`, so the trace-specific branch is untested through the converter.

**Proposed missing test (unit/integration, fits existing flat `src/spec/` convention):**
```ts
// src/spec/sql_series_specs.jest.ts — extend the toTraces describe
import { toTraces } from '../datasource/sql-series/toTraces';
jest.mock('@grafana/runtime', () => ({
  getDataSourceSrv: () => ({
    getInstanceSettings: (uid: string) =>
      uid === 'ch' ? { type: 'vertamedia-clickhouse-datasource' } : { type: 'prometheus' },
  }),
}));

it('builds a CH trace link with panelsState.trace.spanId on traceID', () => {
  const links = [{ fieldName: 'traceID', title: 'Open trace', targetDatasourceUid: 'ch',
                   query: 'SELECT ...', format: 'traces' }];
  const out = toTraces(series as any, meta, links as any, 'explore');
  const f = out[0].fields.find((x:any) => x.name === 'traceID');
  expect(f.config.links[0].internal.panelsState).toEqual({ trace: { spanId: '${__value.raw}' } });
  expect(f.config.links[0].internal.query.format).toBe('traces');
  expect(f.config.links[0].targetBlank).toBe(false); // explore split-pane
});

it('builds a metrics (non-CH) link from serviceName for trace->metrics', () => {
  const links = [{ fieldName: 'serviceName', title: 'Service metrics',
                   targetDatasourceUid: 'prom',
                   query: 'rate(http_requests_total{service="${__value.raw}"}[5m])' }];
  const out = toTraces(series as any, meta, links as any, 'dashboard');
  const f = out[0].fields.find((x:any) => x.name === 'serviceName');
  expect(f.config.links[0].internal.datasourceUid).toBe('prom');
  expect(f.config.links[0].internal.query).toEqual({ refId: 'datalink',
    query: 'rate(http_requests_total{service="${__value.raw}"}[5m])' });
  expect(f.config.links[0].targetBlank).toBe(true); // dashboard -> new tab
});
```
**Plus an E2E spec** (when e2e infra lands): configure a traces data link in ConfigEditor → run a traces query in Explore → assert the link popover appears on the span field and navigation opens the target. This is the single most valuable missing test and the one the shallow pass flagged (correctly, at the *e2e* level).

---

## 7. Cross-check #432 (the other commit claim)

#432 "[Feature] Add support for internal link" (p3, milestone 3.5.0) asks for Grafana internal links — explicit example: ClickHouse-stored logs, click `trace_id` column → open a trace panel; parity with ES/Loki. **The implemented feature fully satisfies this:** generic `DataLink.internal` cross-datasource links configured per datasource, attached by exact column name, with the logs converter auto-promoting linked columns to top-level fields so `trace_id` works without aliasing (`toLogs.ts:203-217`). #432 is a legitimate CLOSE.

---

## 8. Open questions / confirm with maintainers

1. **Scope intent for #645:** is "a data link on a span column pointing at a metrics datasource" acceptable as "trace-to-metrics", or is native (per-span tag mapping + span-window time shift + span-detail dropdown) required? The issue text references the native blog post.
2. **PR/commit vs CHANGELOG discrepancy:** the CHANGELOG says "partially addresses #645" but the commit/PR say "Closes/fix #645". Which is authoritative? (Recommend: CHANGELOG — change PR to "partially addresses".)
3. **Span-detail dropdown parity is likely SDK-blocked.** Confirm whether Grafana core will surface `tracesToMetrics` for this third-party datasource's traces (it does not for arbitrary plugins). If not, true UX parity is impossible and #645 should be re-scoped to the functional subset (tag interpolation + time window) or closed with the documented recipe.
4. **Span-window time range** — appetite for adding `InternalDataLink.range` derived from span start/duration to trace-format links (the cheap, achievable win)?
5. **Span-tag addressability** — willingness to promote mapped span tags to individual hidden fields in `toTraces` so they can feed a target metric query (option A in §5.2)?
6. **Log-context links gap** — should the log-context path (`datasource.ts:283/331`) also carry `dataLinks`/`app`? (Out of #645 scope but a real inconsistency.)
7. **Table format** — explicitly deferred (Non-Goal); does any #432/#645 scenario need links on `table`? (Probably not for traces.)
