# Data Links: Datasource-Level Cross-Datasource Navigation

**Issues:** [#432](https://github.com/Altinity/clickhouse-grafana/issues/432), [#645](https://github.com/Altinity/clickhouse-grafana/issues/645)
**Branch:** TBD (new branch from `master`)
**Reference prototype:** `feature/data-links` (used as reference only — not inherited)
**Date:** 2026-05-17
**Status:** Design
**Target version:** 3.5.0

## References

Implementation patterns confirmed against Grafana ecosystem code:

- **`@grafana/data` DataLink schema** — `packages/grafana-data/src/types/dataLink.ts` (`url` for external, `internal.query` for cross-datasource Explore navigation; mutually exclusive in renderer).
- **Elasticsearch data links** (closest analog to this design): `grafana-elasticsearch-datasource/src/datasource.ts` (`enhanceDataFrameWithDataLinks`), `src/configuration/DataLinks.tsx`, `src/types.ts` (`DataLinkConfig = { field, url, urlDisplayLabel?, datasourceUid? }`).
- **Loki derived fields** (richer model with regex extraction; we adopt the simple half): `public/app/plugins/datasource/loki/getDerivedFields.ts`, `configuration/DerivedField.tsx`, `types.ts` (`DerivedFieldConfig`).
- **Official Grafana ClickHouse plugin** (in-tree hook into `query()` for trace/log correlation): `grafana/clickhouse-datasource` `src/data/utils.ts` (`transformQueryResponseWithTraceAndLogLinks`).
- **Tempo trace-to-logs / metrics** (intentionally not modelled — they use a separate `jsonData.tracesToLogsV2` subsystem with tag-mapping; for #645 the generic per-field mechanism is sufficient since the user just configures links on span columns).

## Context

Grafana has a first-class concept of **data links** — clickable elements rendered on field cells that navigate the user to another panel, dashboard or datasource. Loki, Elasticsearch, Tempo and the official Grafana ClickHouse plugin all expose data link configuration at the **datasource level**, where the user defines per-field mappings (e.g. column `trace_id` → open a trace in Tempo).

This plugin currently has no data link support. Two open issues target it:

- **#432** — basic internal data links (e.g. click `trace_id` in logs → trace panel). Milestone 3.5.0, p3.
- **#645** — trace-to-metrics navigation in trace view. Milestone 3.5.0, p2, assigned to the author of this spec.

Both issues collapse into one feature when designed properly: a generic datasource-level data link mechanism with per-field attachment, where #645 is naturally satisfied by configuring links on span fields.

A prior prototype lives in branch `feature/data-links`. It stored data link configs **per-query** (in `CHQuery.dataLinks`) and attached links to **every field** of the result. Neither matches Grafana convention. This design discards the prototype's structure and re-implements from scratch.

## Goals

- Datasource-level configuration in `ConfigEditor` (canonical Grafana pattern).
- Per-field attachment via exact column-name match (regex deferred).
- Support DataFrame-returning formats: `logs`, `traces`, `time_series` as primary scenarios; `flamegraph` is wired by the same generic helper but treated as a niche performance-debug case (not featured in demo).
- Internal cross-datasource links only (`DataLink.internal`); external URLs deferred.
- Target any Grafana datasource (CH or otherwise); query shape adapts to whether the target is our plugin.
- Cover both #432 and #645 with one mechanism.

## Non-Goals

- ~~External URL data links (`DataLink.url`)~~ — added in v1.0.1 polish round.
- Regex / pattern matching on field names. Exact match only for v1.
- Variable extraction / derived fields (Loki-style regex capture). Out of scope.
- Time-series multi-series dimension columns as `fieldName` targets — see #788. In v1, time-series data links can attach to either the `time` field or the value (metric) field by name; Grafana's time-series visualisation surfaces the popover from the clicked value, so value-field links are the practically useful ones. Dimension columns from `GROUP BY` queries are folded into series names and are not addressable.
- Backend changes. All link building happens in the TypeScript layer.
- Migration from the prototype's per-query config (never released).
- **Table format (`format: 'table'`)**. `toTable` currently returns the legacy `{columns, rows, type: 'table'}` shape, not `DataFrame[]`, and `field.config.links` lives on `Field`. Adding link support requires refactoring `toTable` to return `DataFrame[]`, which has broader regression surface than the rest of this work. Deferred to a follow-up (v2). The four DataFrame-returning formats (`logs`, `traces`, `time_series`, `flamegraph`) cover both #432 and #645.

## Architecture

### Layout

```
src/
  datasource/
    datalinks/
      types.ts                  // DataLinkConfig and helper types
      buildDataLink.ts          // logic: config → Grafana DataLink object
      applyDataLinks.ts         // attach DataLink[] to fields by name
      index.ts                  // public surface
  views/
    ConfigEditor/
      components/
        DataLinks/
          DataLinksSection.tsx  // ConfigEditor section: list + add
          DataLinkEditor.tsx    // single link editor
```

### Layers of responsibility

1. **Storage** — `instanceSettings.jsonData.dataLinks: DataLinkConfig[]`. Datasource-level. No per-query config; the prototype's `CHQuery.dataLinks` is not used.

2. **Access in frontend** — `CHDataSource` reads `this.instanceSettings.jsonData.dataLinks` and passes it into `SqlSeries` at construction time.

3. **Application** — each format converter (`toLogs`, `toTraces`, `toTimeSeries`, `toFlamegraph`, and the tabular path) calls `applyDataLinks(fields, configs, options?)` after building its fields. The helper attaches matching links to the appropriate `field.config.links`.

4. **Backend (`/pkg/`)** — unchanged. Backend returns rows; the frontend transforms them and attaches links.

5. **UI** — `DataLinksSection` placed in `ConfigEditor` after "Additional settings". Lists configured links with an "Add data link" button.

## Data Model

### `DataLinkConfig`

```ts
// src/datasource/datalinks/types.ts
export interface DataLinkConfig {
  fieldName: string;           // exact, case-sensitive column name
  title: string;               // popover label; supports ${...} interpolation
  url?: string;                // when set, external link — internal fields below are ignored
  targetDatasourceUid: string; // any datasource uid (used when `url` is empty)
  query: string;               // target query body; interpolated by Grafana
  format?: CHFormat;           // only used when target is this plugin
}

export type CHFormat = 'table' | 'logs' | 'traces' | 'time_series' | 'flamegraph';
```

Following Loki / Elasticsearch convention, entries have **no generated `id` field** — React reconciliation uses the array index. The earlier prototype carried a uuid; we drop it.

**External URL mode:** when `url` is non-empty, `buildDataLink` returns `{ title, url }` (a plain `DataLink` with no `internal`). Grafana interpolates standard variables at click time. The internal-link fields (`targetDatasourceUid`, `query`, `format`) are unused in this mode but kept in the type so users can toggle freely without losing their internal-link config.

### `CHDataSourceOptions` extension

```ts
// src/types/types.ts
export interface CHDataSourceOptions extends DataSourceJsonData {
  // ... existing fields
  dataLinks?: DataLinkConfig[];
}
```

### Building a Grafana `DataLink`

```ts
// src/datasource/datalinks/buildDataLink.ts (pseudocode)
function buildDataLink(config: DataLinkConfig, targetIsClickHouse: boolean): DataLink {
  if (targetIsClickHouse) {
    return {
      title: config.title,
      url: '',
      internal: {
        datasourceUid: config.targetDatasourceUid,
        datasourceName: '',
        query: {
          refId: 'datalink',
          query: config.query,
          rawQuery: config.query,
          format: config.format ?? 'table',
          datasourceMode: DatasourceMode.Datasource,
          extrapolate: false,
          adHocFilters: [],
          showHelp: false,
          showFormattedSQL: false,
        } satisfies Partial<CHQuery>,
      },
    };
  }
  return {
    title: config.title,
    url: '',
    internal: {
      datasourceUid: config.targetDatasourceUid,
      datasourceName: '',
      query: { refId: 'datalink', query: config.query },
    },
  };
}
```

`isClickHouseTarget(uid)` is resolved via `getDataSourceSrv().getInstanceSettings(uid)?.type === 'vertamedia-clickhouse-datasource'`. If `getInstanceSettings` returns nothing (deleted target), we fall through to the universal branch — the link is still emitted; Grafana will surface the error when clicked.

### Variable interpolation

Fully handled by Grafana **at click time**, not at link-build time. We store the literal `${__value.raw}`, `${__data.fields.<name>}`, `$__from`, `$__to`, `${__field.name}`, dashboard variables, etc. as plain strings in the `query` and `title` fields of the `DataLink`. When the user clicks, Grafana's link supplier resolves them using the cell's raw value, the row's other field values, the dashboard time range, and template-var scope — then dispatches to the target datasource. Our parser (which runs `$timeFilter` and other CH macros) receives an already-interpolated string. No custom interpolation code is needed on our side.

## Application in Format Converters

### Helper

```ts
// src/datasource/datalinks/applyDataLinks.ts
export function applyDataLinks(
  fields: Field[],
  configs: DataLinkConfig[] | undefined,
  options?: { allowedFieldNames?: Set<string> },
): void {
  if (!configs?.length) return;
  for (const field of fields) {
    if (options?.allowedFieldNames && !options.allowedFieldNames.has(field.name)) continue;
    const matching = configs.filter((c) => c.fieldName === field.name);
    if (!matching.length) continue;
    const links = matching.map((c) => buildDataLink(c, isClickHouseTarget(c.targetDatasourceUid)));
    field.config = { ...field.config, links: [...(field.config?.links ?? []), ...links] };
  }
}
```

### Insertion points

| File | Where | Restrictions |
|---|---|---|
| `src/datasource/sql-series/toLogs.ts` | After `result.fields` is built, before `return [result]` | none |
| `src/datasource/sql-series/toTraces.ts` | After fields are populated for each trace result, before `results.push(...)` | none |
| `src/datasource/sql-series/toTimeSeries.ts` | After `DataFrame.fields` is built | none (link attaches to whatever field name matches — typically the metric/value field, since Grafana's time-series viz reads links from the value field at click) |
| `src/datasource/sql-series/toFlamegraph.ts` | After fields are built | none |

The legacy `toTable.ts` path is **not** wired in v1 — see "Non-Goals" for rationale.

### `SqlSeries` wiring

`SqlSeries` accepts `dataLinks?: DataLinkConfig[]` in its `options`. `CHDataSource` constructs `SqlSeries` with `dataLinks: this.instanceSettings.jsonData.dataLinks`. Each converter method passes `this.dataLinks` through to the helper.

### Edge cases

- **Empty / missing config** — nothing happens.
- **Empty `fieldName` or `query`** in a config — skipped silently (does not abort other configs).
- **Multiple configs match the same field** — both produce links; `field.config.links` ends up with an array of two. Grafana renders a popover with both options.
- **`fieldName` matches no field** — silently ignored.
- **Deleted target datasource** — link is emitted with a broken `datasourceUid`; Grafana displays a click-time error. We do not validate at runtime; surface configuration issues visually in `ConfigEditor` instead.
- **Existing `field.config.links`** — we append, not overwrite, in case other code paths (dashboard-level overrides) already attached links.

### Field-name semantics

ClickHouse returns column names exactly as written in the `SELECT` clause (including any alias). `fieldName` must match the alias as it appears in the result, case-sensitive. The UI documents this in inline help.

## UI in `ConfigEditor`

### Placement

`DataLinksSection` is added to `src/views/ConfigEditor/ConfigEditor.tsx` after the "Additional settings" block. The section is **not** collapsible — it is part of normal datasource configuration.

### Component tree

```
DataLinksSection
├── header: title + description + "Add data link" button
├── (list) DataLinkEditor  // one per config; React key = array index
│   ├── Field name        (Input, required)
│   ├── Title             (Input, required)
│   ├── Target datasource (DataSourcePicker from @grafana/runtime, required)
│   ├── Format            (Select, visible only when target is this plugin)
│   ├── Query             (CodeEditor, SQL, multiline)
│   └── Remove button
└── empty state when list is empty
```

### `DataLinksSection` props

```ts
interface Props {
  dataLinks: DataLinkConfig[];
  onChange: (next: DataLinkConfig[]) => void;
}
```

Internal `add` / `update(index, config)` / `remove(index)` operate on the prop array and call `onChange`. `ConfigEditor` persists via `onOptionsChange({ jsonData: { ...jsonData, dataLinks: next } })`.

### Adaptive Format selector

```tsx
const targetDs = useMemo(
  () => getDataSourceSrv().getInstanceSettings(dataLink.targetDatasourceUid),
  [dataLink.targetDatasourceUid],
);
const isCHTarget = targetDs?.type === 'vertamedia-clickhouse-datasource';
```

The `Format` field is rendered only when `isCHTarget` is `true`.

### Validation

Per-field red border + helper text when:
- `fieldName` is empty — "Field name is required"
- `title` is empty — "Title is required"
- `targetDatasourceUid` is unset — "Target datasource is required"
- `query` is empty — "Query is required"

Saving the datasource is **not** blocked. Empty/invalid configs are skipped at runtime; the visible validation tells the user something is wrong.

### Help text

Below the `Query` field: a one-line description listing supported variables (`${__value.raw}`, `${__data.fields.<name>}`, `$__from`, `$__to`) with a link to Grafana's data link variables documentation.

### Empty state

When `dataLinks` is empty: "No data links configured. Add one to enable cross-datasource navigation from query results."

## Testing

Test files in this repo live flat under `src/spec/`. Converter tests are colocated in `src/spec/sql_series_specs.jest.ts` (single big file with per-converter `describe` blocks). New tests follow this convention.

### Unit tests

| File | Coverage |
|---|---|
| `src/spec/datalinks.test.ts` (new) | `buildDataLink`: CH-target returns correct `CHQuery` shape; non-CH-target returns generic shape; missing target datasource falls through to universal branch. `applyDataLinks`: exact field-name match; multiple links on one field; `allowedFieldNames` restriction; preservation of pre-existing `field.config.links` |
| `src/spec/sql_series_specs.jest.ts` (extend) | New `describe` blocks per converter (`toLogs`, `toTraces`, `toTimeSeries`, `toFlamegraph`) verifying that data links are attached only to matching field names, and that `toTimeSeries` honours the `time`-only restriction |

### Component tests (React Testing Library)

| File | Coverage |
|---|---|
| `src/spec/DataLinksSection.test.tsx` (new) | add / update / remove; empty state; `onChange` propagation |
| `src/spec/DataLinkEditor.test.tsx` (new) | required-field validation; adaptive Format selector visibility when target is CH vs other; field change handlers |

### Manual verification

The repo currently has no E2E test infrastructure in place (`tests/e2e/` is empty; `npm run e2e` invokes the legacy `grafana-e2e` Cypress runner). Standing up automated E2E is out of scope for this work. Instead, the implementer runs a structured manual verification covering:

1. Configure a data link on a CH datasource in `ConfigEditor` (Save & Test succeeds).
2. In Explore on logs format: data link appears on the matching field and navigates correctly.
3. In Explore on traces format: data link appears on the matching span field.
4. In Explore on time_series format: data link appears on the `time` field but not on dimension series.
5. UX: Format selector hides for non-CH targets; empty/invalid configs do not block save.

Screenshots accompany the PR. The detailed checklist lives in the implementation plan as Task 18.

### Demo dashboard

The prototype's `data_links_demo.json` is rebuilt for the new datasource-level model (link configs live in datasource provisioning, not in dashboard queries). Placed in `/docker/grafana/dashboards/` for dev verification and as documentation.

## Documentation

- `README.md` — new "Data Links" section with screenshot/example showing one configured link end-to-end.
- Mention the time-series limitation (only `time` field supported in v1) with a link to #788 for tracking.

## Release

- Single PR into `master` closing both #432 and #645.
- Target version: **3.5.0** (matches both issue milestones).
- Version bump in `package.json` and `src/plugin.json` handled separately at release time.

## Definition of Done

- All new and extended unit tests pass (`npm run test`).
- Linter clean (`npm run lint`).
- Manual verification (plan Task 18) passes for all four formats with screenshots attached to the PR.
- In Explore, a configured data link is clickable on the matching field across all four DataFrame-returning formats (`logs`, `traces`, `time_series` on `time` only, `flamegraph`) and navigates to the target datasource. `table` is intentionally deferred — see Non-Goals.
- #432 and #645 close per their acceptance criteria.
