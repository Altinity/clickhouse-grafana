# Advanced logs field settings (ClickHouse plugin) — design

- **Date:** 2026-06-22
- **Status:** Design approved, pending spec review
- **Repo:** Altinity/clickhouse-grafana (this plugin)
- **Related:**
  - Companion Grafana-core design: `2026-06-22-grafana-per-field-log-filtering-design.md`
  - [Altinity/clickhouse-grafana#678](https://github.com/Altinity/clickhouse-grafana/issues/678)
  - [grafana/grafana#98038](https://github.com/grafana/grafana/issues/98038)

> Written in English for consistency with the companion core spec and because
> code identifiers dominate. Conversation around it happens in Russian.

## Problem

When a ClickHouse logs query returns complex column types (`Map`, `Array`,
`Object`/`JSON`, `Tuple`, `Nested`), the plugin today has fixed behavior in
`toLogs.ts`: Maps are flattened one level into `field['key']` labels, arrays and
deeper structures are `JSON.stringify`'d. The user has no control over which
complex fields become filterable labels, how they are decomposed, or how a click
on the `+`/`-` filter button is turned into a valid ClickHouse predicate. Some of
these produce invalid SQL (see #678).

This is the **plugin-side half** of the solution: give the user explicit,
per-field control over how complex log fields are presented and filtered, applied
entirely within the plugin. It works on current Grafana versions with no core
dependency. The companion Grafana-core change (a `isFilterLabelSupported` hook)
later adds the one state the plugin alone cannot produce: "shown as a label, but
with the filter buttons hidden".

## Goals

- Per-field control over complex log fields, configured via a modal opened from
  the logs query editor.
- Four modes per field: `expand`, `single`, `hide`, `raw`.
- Every allowed filter click produces a **valid** ClickHouse predicate.
- Fully backward compatible: with no config, behavior is exactly as today.
- No dependency on a Grafana core change.

## Non-goals

- "Shown as label, filter buttons hidden" — requires the companion core hook.
- Manual per-field UI inside Grafana's panel options (that is core/panel territory).
- Deep recursive Map expansion with depth/breadth caps — MVP keeps the current
  first-level expansion; deeper levels stay stringified. Caps are future work.

## Decisions (from brainstorming)

- **Storage:** per-query, a new optional `CHQuery.logsFieldConfig` (serialized in
  the panel JSON).
- **Modes:** `expand` / `single` / `hide` / `raw`.
- **Array in `single` mode:** filter is **whole-array equality** (`col = [...]`),
  not element membership.
- **`raw`:** value is stringified into the **body** (the one detail entry that has
  no filter buttons), subject to an implementation spike (below).

## Data model

`src/types/types.ts`:

```ts
export type LogsFieldMode = 'expand' | 'single' | 'hide' | 'raw';

export interface LogsFieldConfigEntry {
  mode: LogsFieldMode;
}

export interface CHQuery extends DataQuery {
  // … existing fields …
  logsFieldConfig?: Record<string, LogsFieldConfigEntry>; // key = column name
}
```

### Mode semantics

| Mode | Log Details presentation | Filter predicate |
| --- | --- | --- |
| `expand` | Map/Object flattened into many `field['k']` labels | `field['k'] = 'value'` |
| `single` | one label for the whole field (array/scalar) | array: `col = [...]` (whole-array equality) |
| `hide` | not shown at all | — (no buttons) |
| `raw` | value stringified into the body (visible as text) | — (no buttons) |

**Default (a field with no entry in `logsFieldConfig`)** = current behavior:
`Map`/`Object` → `expand` (first level), `Array` → `single`, primitives → label as
today. This keeps existing panels unchanged.

## Modal UI and column introspection

- **"Advanced" button** in the logs branch of
  `src/views/QueryEditor/components/QueryTextEditor/QueryTextEditor.tsx` (after
  `ContextWindowSizeSelect`, under `{query.format === 'logs' && …}`), styled as a
  `ToolbarButton`.
- **Modal** using `@grafana/ui` `Modal`, following the existing pattern in
  `src/views/QueryEditor/components/QueryHeader/QueryHeader.tsx` (`isOpen` /
  `onDismiss` / `Modal.ButtonRow` with Cancel/Save).
- **Column introspection on open:** run the current query with a small `LIMIT`
  (or reuse the last response `meta`) to get output column names + ClickHouse
  types — robust for arbitrary SELECTs. Fallback:
  `SELECT name, type FROM system.columns WHERE database = … AND table = …` when
  `query.table` is known. Use the existing `datasource.metricFindQuery` (as in
  `src/datasource/adhoc.ts`).
- **Modal content:** list only complex-typed columns
  (`Map` / `Array` / `Tuple` / `Nested` / `Object` / `JSON`). For each: name,
  type, and a `RadioButtonGroup` with the four modes, pre-filled from
  `logsFieldConfig` or the type default. Primitives are not listed.
- **Save:** `onChange({ ...query, logsFieldConfig })`.

## Label/body building (`src/datasource/sql-series/toLogs.ts`)

- Thread `logsFieldConfig` into `toLogs` (set on `self` from the `target`).
- New helper `resolveFieldModes(meta, logsFieldConfig)` → `Record<colName, LogsFieldMode>`,
  combining the per-type default with config overrides.
- Route each column by mode (replacing the current "everything string-typed →
  labelFields → `transformObject`" path):
  - `expand`: include in `labelFields`; `transformObject` flattens it (first level
    as today; recursive option is future work).
  - `single`: include in `labelFields` as **one** label = `JSON.stringify(value)`
    (no flattening).
  - `hide`: exclude from labels and from output; ensure it is also excluded
    cleanly from the `data`/`messageField` detection so the body choice is not
    affected.
  - `raw`: exclude from labels; append the stringified value to the body
    (`body += " field=<json>"`).
- `transformObject` is kept but invoked **selectively** — only for `expand`
  columns.

> **Implementation spike:** verify whether a non-label DataFrame field renders
> `+`/`-` buttons in current Grafana logs details. If it does NOT, `raw` should be
> emitted as a separate non-filterable field (cleaner) instead of polluting the
> body. If it does, the body is the only guaranteed button-free slot. Default to
> body (the chosen option); switch to a separate field if the spike allows.

## Adhoc filter predicate building

Flow: `+`/`-` click → `toggleQueryFilter` (`src/datasource/datasource.ts:341`)
pushes `{ key, value, operator }` into `query.adHocFilters` → applied via
`applyAdhocFilters(query, adhocFilters, target)` → backend
`pkg/adhoc/adhoc_filters.go` `ProcessAdhocFilters`.

- **Extend** `ProcessAdhocFilters(adhocFilters, targetDatabase, targetTable, logsFieldConfig)`
  (read `logsFieldConfig` from `target`). For each filter, parse the key into a
  base column (`col['k']` → `col`; `col` → `col`), look up the mode, and build the
  predicate:

  | Mode (key shape) | Predicate |
  | --- | --- |
  | `expand` (`col['k']`) | `col['k'] = 'value'` (subscript already in the key) |
  | `single` (`col`, array) | `col = [...]` (whole-array equality; `!=` → `col != [...]`) |
  | bare key, no config | `col = 'value'` (current scalar behavior) |
  | `hide` / `raw` | no label exists → no button → no filter; drop safely if seen |

- **`single` array equality:** the stored value is the JSON-stringified array; the
  backend parses it and emits a valid ClickHouse array literal `[...]`, escaping
  element values.

### Bug fixes on the same path (`pkg/adhoc/adhoc_filters.go`)

1. **Value quoting:** today a string value that looks numeric (e.g. `'200'` from a
   `Map(String,String)`) is emitted unquoted (`= 200`) → type error. Fix the
   heuristic so string values are quoted correctly.
2. **Key escaping:** `col['k']` is currently injected raw; a key containing `'` or
   `]` breaks the SQL or injects. Escape the key literal.

- **All 3 call sites** of `ProcessAdhocFilters` updated
  (`pkg/resource_handlers.go:375, 615, 1025`). When `logsFieldConfig` is absent
  (old queries) → `nil` → current scalar behavior. Backward compatible.

### Values dropdown (secondary)

`src/datasource/adhoc.ts` `DEFAULT_VALUES_QUERY` should be mode-aware for correct
DISTINCT suggestions: `expand` → `SELECT DISTINCT col['k']`; `single` array →
`SELECT DISTINCT arrayJoin(col)`. Lower priority; may be refined after MVP. Logged
explicitly so it is not silently skipped.

## Edge cases

- **No config** → current behavior; existing panels unaffected.
- **`format !== 'logs'`** → no button/modal; `logsFieldConfig` ignored.
- **`hide`** → also excluded from `data`/`messageField` detection so the body is
  not broken.
- **Stale config** → if modes change after filters were added, an old filter's key
  shape may not match; acceptable for MVP, documented.
- **Backend disambiguation:** key with subscript → `expand`; bare key + `single`
  → array equality; bare key + no config → scalar.

## Testing

- **Frontend (Jest):**
  - `resolveFieldModes` — type defaults + config overrides.
  - `toLogs` per mode (extend `toLogs.test.ts`): `expand` → many labels; `single`
    → one stringified label; `hide` → absent; `raw` → appended to body.
  - Modal component (React Testing Library): renders complex columns, mode
    selectors, Save merges into `query.logsFieldConfig`.
- **Backend (Go, `pkg/adhoc`):** `ProcessAdhocFilters` per mode — subscript
  `expand`, array-equality `single`, value-quoting fix, key escaping, `hide`/`raw`
  drop, `nil` config fallback.
- **E2E (Playwright):** open a logs query → Advanced modal → set modes → verify
  label rendering + that a filter click produces a valid query (no ClickHouse
  error). Matrix: Map / nested Map / Array / hostile keys.

## File-by-file change list

| File | Change |
| --- | --- |
| `src/types/types.ts` | Add `LogsFieldMode`, `LogsFieldConfigEntry`, `CHQuery.logsFieldConfig` |
| `src/views/QueryEditor/components/QueryTextEditor/QueryTextEditor.tsx` | "Advanced" button in the logs branch |
| `src/views/QueryEditor/components/QueryTextEditor/components/AdvancedLogsFields/AdvancedLogsFieldsModal.tsx` (new) | Modal UI + introspection + Save |
| `src/datasource/sql-series/toLogs.ts` | `resolveFieldModes`; route columns by mode; selective `transformObject`; body-raw |
| `src/datasource/datasource.ts` | Ensure `logsFieldConfig` flows onto the series object passed to `toLogs` |
| `src/datasource/adhoc.ts` | Mode-aware values DISTINCT (secondary) |
| `pkg/adhoc/adhoc_filters.go` | Mode-aware predicate; value-quoting fix; key escaping; new param |
| `pkg/resource_handlers.go` | Pass `logsFieldConfig` at the 3 call sites |
| test files above | Coverage |

## Relationship to the Grafana-core spec

Complementary, not competing:

- **This plugin feature (now):** controls what becomes a filterable label and how a
  click maps to valid SQL — `expand` / `single` / `hide` / `raw`. Ships on current
  Grafana, no core dependency.
- **Core hook (later, companion spec):** adds the one state the plugin cannot
  produce alone — "shown as label, filter buttons hidden" — via
  `isFilterLabelSupported`.

## Open questions / spikes

- `raw` rendering: body-append vs separate non-filterable field (resolve via the
  spike above).
- Whether `logsFieldConfig` should later also drive the companion core hook (the
  plugin would implement `isFilterLabelSupported` from the same config).
- Recursive `expand` depth/breadth caps — deferred; current first-level only.
