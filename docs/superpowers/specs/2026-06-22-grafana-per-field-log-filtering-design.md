# Per-field log filtering control in Grafana — design

- **Date:** 2026-06-22
- **Status:** Design approved, pending spec review
- **Upstream target:** `grafana/grafana`
- **Related issues:**
  - [grafana/grafana#98038](https://github.com/grafana/grafana/issues/98038) — "Add Granular, Per-Field Filtering Control for Logs in Grafana" (closed as stale)
  - [Altinity/clickhouse-grafana#678](https://github.com/Altinity/clickhouse-grafana/issues/678) — "Complex types in Logs panel +/- filters and adhoc, doesn't work"

> This document is written in English because it is intended to feed an upstream
> Grafana pull request and PR description. Conversation around it happens in Russian.

## Problem

In the Logs panel and in Explore, every label/field shown in the log-line details renders
"filter for value" (`+`) and "filter out value" (`-`) buttons. Whether these buttons appear
is an all-or-nothing decision: the buttons render for **every** field as long as the
data source provides the filter callbacks. There is no way for a data source to declare that
a **specific** field cannot be meaningfully filtered.

For data sources with complex column types (e.g. ClickHouse `Map`, `Object`/`JSON`, `Array`,
deeply-nested structures) some fields cannot be turned into a valid filter predicate. Clicking
`+`/`-` on such a field produces an invalid query and a backend error. The data source knows the
column type and therefore knows which fields are non-filterable, but today it has no way to
communicate that to the logs UI.

## Goals

- Let a data source declare, per log label, whether the filter buttons should be shown.
- Default behavior unchanged for every existing data source (fully backward compatible).
- Cover both live logs detail UIs (old `LogDetailsRow` and new `panel/LogLineDetailsFields`),
  in both Explore and the dashboard logs panel.
- Mirror Grafana's existing capability-interface conventions so the change is small and
  idiomatic.

## Non-goals

- Changing how filters are turned into queries (SQL/LogQL generation). This PR only controls
  **button visibility**, not predicate construction.
- A user-facing manual toggle (panel/field option). The decision is data-source-driven and
  automatic.
- The logs **table** view detail (`LogsTableDetails`). Out of scope for this PR.
- A disabled-with-tooltip state. Non-filterable fields simply render without the buttons,
  consistent with the existing OTEL-attributes exclusion.

## Chosen approach (Approach A)

A new optional capability interface on the data source, plus a type guard, mirroring the
existing `DataSourceWithLogsLabelTypesSupport` / `getLabelDisplayTypeFromFrame` precedent.
The predicate is derived from the data source at the same place the existing filter callbacks
are created, threaded along the same path as `isFilterLabelActive`, and AND-ed into the existing
button-visibility gates in both UIs.

Rejected alternatives:

- **B — declarative frame metadata** (`frame.meta.custom.nonFilterableLabels`). Logs labels are
  entries inside a single `labels` field (type `other`), not top-level fields, so per-field
  config does not map to them; this would require a brand-new metadata contract that
  `logsModel` must learn to read and propagate. More invention, less precedent.
- **C — extend `DataSourceWithToggleableQueryFiltersSupport`.** Mixes "how to toggle a filter"
  with "whether a field is filterable" in one interface; Grafana favors small, single-purpose
  capability interfaces with dedicated `hasXxxSupport` guards.

## API surface

**File:** `packages/grafana-data/src/types/logs.ts` (exported from
`packages/grafana-data/src/index.ts`).

```ts
/**
 * Allows a data source to declare whether a given log label/field can be
 * filtered on. When implemented, the logs detail UI hides the
 * filter-for / filter-out buttons for labels where this returns false
 * (e.g. complex column types whose value has no valid filter predicate).
 *
 * @public
 */
export interface DataSourceWithLogsFieldFilteringSupport {
  isFilterLabelSupported(labelKey: string, frame: DataFrame | undefined, index: number | null): boolean;
}

export const hasLogsFieldFilteringSupport = (
  datasource: unknown
): datasource is DataSourceApi & DataSourceWithLogsFieldFilteringSupport =>
  datasource != null &&
  typeof (datasource as DataSourceWithLogsFieldFilteringSupport).isFilterLabelSupported === 'function';
```

Decisions:

- **`boolean`, not `Promise<boolean>`** — the gate is computed during the details render, exactly
  like `getLabelDisplayTypeFromFrame`. Implementers must answer cheaply (e.g. from a cached column
  type map).
- **Signature `(labelKey, frame, index)`** — identical to `getLabelDisplayTypeFromFrame`. The label
  **value** is intentionally not passed: the decision is by column type, not by a concrete value.
  A value-aware variant can be added later if a real need appears (YAGNI for now).
- **Default = filterable.** The method is only invoked when `hasLogsFieldFilteringSupport(ds)` is
  true; otherwise the gate falls back to `true` and behavior is unchanged.
- **Naming (`isFilterLabelSupported`)** rhymes with the existing `isFilterLabelActive` /
  `onClickFilterLabel`. This is the most likely bikeshed point in review; the exact name is open.

## Where the predicate is created

The predicate is built where the existing filter callbacks (`onClickFilterLabel`,
`isFilterLabelActive`) are already created and gated by a data-source capability — no new place
accesses the data source.

**Explore** (`public/app/features/explore/.../Explore.tsx`), next to the existing
`onClickFilterLabel` definition, where `datasourceInstance` is in scope:

```ts
const canFilterLabel = useMemo(
  () => (key: string, frame: DataFrame | undefined, index: number | null) =>
    hasLogsFieldFilteringSupport(datasourceInstance)
      ? datasourceInstance.isFilterLabelSupported(key, frame, index)
      : true,
  [datasourceInstance]
);
```

**Dashboard logs panel** (`public/app/plugins/panel/logs/LogsPanel.tsx`). The panel may render
multiple data sources (mixed), so the right one is looked up by `frame.refId` in the existing
`dataSourcesMap` (from `useDatasourcesFromTargets(panelData.request?.targets)`):

```ts
const canFilterLabel = useCallback(
  (key: string, frame: DataFrame | undefined, index: number | null) => {
    const ds = frame?.refId ? dataSourcesMap.get(frame.refId) : undefined;
    return hasLogsFieldFilteringSupport(ds) ? ds.isFilterLabelSupported(key, frame, index) : true;
  },
  [dataSourcesMap]
);
```

In both surfaces the predicate is passed down alongside `isFilterLabelActive`, using the same
conditional-pass pattern already used for the other filter callbacks.

## Threading and gates

### New UI

1. **Context** — add optional `canFilterLabel` to `LogListContextData` and to the
   `LogListContextProvider` props in `public/app/features/logs/components/panel/LogListContext.tsx`,
   next to `onClickFilterLabel` / `isLabelFilterActive`.
2. **`LogList.tsx`** — forward the `canFilterLabel` prop into the provider.
3. **Gate** in `public/app/features/logs/components/panel/LogLineDetailsFields.tsx` — extend the
   existing `fieldSupportsFilters`:

   ```ts
   const { onClickFilterLabel, onClickFilterOutLabel, canFilterLabel } = useLogListContext();

   const fieldSupportsFilters =
     keys[0] !== OTEL_LOG_LINE_ATTRIBUTES_FIELD_NAME &&
     (canFilterLabel?.(keys[0], frame, index) ?? true);
   ```

   `frame` / `index` are the same triple already passed to `getLabelDisplayTypeFromFrame` in this
   render path. The button-rendering JSX is unchanged — it already reads
   `{onClickFilterLabel && fieldSupportsFilters && (...)}`, so both buttons disappear together.

### Old UI

Thread an optional `canFilterLabel` prop along the same path as `isFilterLabelActive`:
`Explore.tsx` / `LogsPanel.tsx` → `LogRows` → `LogRow` → `LogDetails` → `LogDetailsRow`.

Gate in `public/app/features/logs/components/LogDetailsRow.tsx`:

```ts
const fieldIsFilterable = canFilterLabel ? canFilterLabel(parsedKeys[0], row.dataFrame, labelIndex) : true;
const hasFilteringFunctionality =
  !disableActions && Boolean(onClickFilterLabel) && Boolean(onClickFilterOutLabel) && fieldIsFilterable;
```

`row.dataFrame` provides the frame; `labelIndex` is the field index already available in the row.

### Why this fits

- We only **narrow** existing gates with `&& (… ?? true)`. When the predicate is absent the gates
  are bit-for-bit identical to today.
- New UI: button-rendering JSX is untouched; only the `fieldSupportsFilters` formula changes —
  minimal diff, easier review.
- The OTEL exclusion stays and composes via `&&` without conflict.

## Backward compatibility and edge cases

- **No method implemented** → `hasLogsFieldFilteringSupport(ds) === false` → predicate never
  created → `?? true` → behavior unchanged. Loki and all other data sources are unaffected.
- **Async resolution in the panel.** While `dataSourcesMap` is still resolving the predicate
  defaults to `true` (buttons visible). For a supporting data source this means a brief flicker:
  a complex-field button is shown on the first render and then hidden once the data source
  resolves and answers `false`. Accepted as a known minor; the default ("show") is the safe one.
- **Mixed-datasource panel** — data source chosen by `frame.refId`; missing refId or no entry in
  the map → `true`.
- **OTEL exclusion** and **`isFilterLabelActive`** are orthogonal: the former composes via `&&`;
  the latter only affects the `+` button's active styling, not whether it renders. Our gate
  controls rendering.
- **Filter mechanism is irrelevant.** The predicate gates only button visibility and does not
  depend on whether the data source filters via `toggleQueryFilter`, `modifyQuery`, or the panel's
  `onAddAdHocFilter`.

## Relationship to data-source-side work (scope boundary)

This PR is **half** of the full fix: "hide the button where no valid predicate exists." It does
**not** change query generation. It is complementary to data-source-side field flattening:

- A data source that flattens `Map` into primitive labels (e.g. `_map['host']`) keeps those labels
  **filterable** (they produce a valid predicate).
- For cases with no valid predicate (arrays, deeply-nested stringified blobs, the whole container),
  the data source returns `isFilterLabelSupported = false` and Grafana hides the button.

Together these close both #98038 and the tail of #678. The data-source-side flattening and the
reference `isFilterLabelSupported` implementation live in the consuming plugin repository, not in
Grafana.

## Testing

- **`grafana-data`** — unit test for `hasLogsFieldFilteringSupport`: true when the method is
  present; false for `null`, `undefined`, and objects without the method.
- **New UI — `LogLineDetailsFields.test.tsx`** — render with a context whose `canFilterLabel`
  returns `false` for a given key: assert the filter buttons are not rendered for that key and are
  rendered for others. With `canFilterLabel = undefined`: regression case "everything as before".
- **Old UI — `LogDetailsRow.test.tsx`** — `canFilterLabel → false` hides the buttons;
  `undefined` leaves behavior unchanged.
- **Threading** — light tests in `LogDetails.test` / `LogRows.test` that the prop is forwarded.
- **Creation sites** — test that in `Explore.tsx` / `LogsPanel.tsx` the predicate is `true` without
  support and calls `ds.isFilterLabelSupported` when present.
- **Reference implementation (separate PR, plugin repo)** — implement `isFilterLabelSupported` plus
  a unit test (`_map['host']` → true; `Array` / deep blob / whole `Map` → false). Validates the API
  end-to-end.
- **No new E2E in Grafana core** — unit coverage is sufficient; the exotic-label-key round-trip risk
  belongs to the plugin-side part.

## File-by-file change list (Grafana core)

| File | Change |
| --- | --- |
| `packages/grafana-data/src/types/logs.ts` | Add `DataSourceWithLogsFieldFilteringSupport` + `hasLogsFieldFilteringSupport` |
| `packages/grafana-data/src/index.ts` | Export the new interface and guard |
| `public/app/features/explore/.../Explore.tsx` | Build `canFilterLabel` from `datasourceInstance`; pass down |
| `public/app/plugins/panel/logs/LogsPanel.tsx` | Build `canFilterLabel` from `dataSourcesMap`; pass to `LogList` and old `LogRows`/`ControlledLogRows` |
| `public/app/features/logs/components/panel/LogListContext.tsx` | Add `canFilterLabel` to context data + provider props |
| `public/app/features/logs/components/panel/LogList.tsx` | Forward `canFilterLabel` into the provider |
| `public/app/features/logs/components/panel/LogLineDetailsFields.tsx` | AND `canFilterLabel` into `fieldSupportsFilters` |
| `public/app/features/logs/components/LogRows.tsx`, `LogRow.tsx`, `LogDetails.tsx` | Thread optional `canFilterLabel` prop |
| `public/app/features/logs/components/LogDetailsRow.tsx` | AND `canFilterLabel` into `hasFilteringFunctionality` |
| test files listed above | Coverage |

## Open questions

- Method name: `isFilterLabelSupported` vs `canFilterLabel` vs `isLogFieldFilterable`. Decide with
  maintainers; pick one and use it consistently.
- Whether maintainers prefer the new predicate to also gate the logs **table** detail view in the
  same PR (currently a non-goal).
