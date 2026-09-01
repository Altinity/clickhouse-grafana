# Data Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add datasource-level cross-datasource data links to the Altinity ClickHouse Grafana plugin, attaching `DataLink` entries to specific result fields by exact column name match, covering `logs`, `traces`, `time_series` (on `time` field only) and `flamegraph` formats. Closes #432 and #645.

**Architecture:** Config in `jsonData.dataLinks: DataLinkConfig[]`, edited in `ConfigEditor`. `CHDataSource` reads it from `instanceSettings.jsonData` and passes through to `SqlSeries`. Each format converter calls a shared `applyDataLinks(fields, configs, options?)` helper that builds a Grafana `DataLink` per matching field and appends to `field.config.links`. Variable interpolation (`${__value.raw}`, `$__from`, etc.) is fully handled by Grafana at click time.

**Tech Stack:** TypeScript, React, Jest 30, React Testing Library 16, `@grafana/data`, `@grafana/ui`, `@grafana/runtime`, Playwright (E2E).

**Spec:** [`docs/superpowers/specs/2026-05-17-data-links-design.md`](../specs/2026-05-17-data-links-design.md)

**Branch:** `data-links` (already created off `master`).

---

## File Structure

**New:**
- `src/datasource/datalinks/types.ts` — `DataLinkConfig`, `CHFormat`
- `src/datasource/datalinks/buildDataLink.ts` — `buildDataLink`, `isClickHouseTarget`
- `src/datasource/datalinks/applyDataLinks.ts` — `applyDataLinks` helper
- `src/datasource/datalinks/index.ts` — public surface
- `src/views/ConfigEditor/components/DataLinks/DataLinkEditor.tsx`
- `src/views/ConfigEditor/components/DataLinks/DataLinksSection.tsx`
- `src/spec/datalinks.test.ts` — `buildDataLink` + `applyDataLinks` unit tests
- `src/spec/DataLinkEditor.test.tsx`
- `src/spec/DataLinksSection.test.tsx`
- `tests/e2e/features/data-links/data-links.spec.ts`
- `docker/grafana/dashboards/data_links_demo.json`

**Modify:**
- `src/types/types.ts` — extend `CHDataSourceOptions` with `dataLinks?: DataLinkConfig[]`
- `src/datasource/sql-series/sql_series.ts` — accept `dataLinks` in `SqlSeries` constructor, pass through
- `src/datasource/sql-series/toLogs.ts` — call `applyDataLinks` on result fields
- `src/datasource/sql-series/toTraces.ts` — accept `dataLinks`, call `applyDataLinks` per group
- `src/datasource/sql-series/toTimeSeries.ts` — accept `dataLinks`, call `applyDataLinks` with `time`-only
- `src/datasource/sql-series/toFlamegraph.ts` — accept `dataLinks`, call `applyDataLinks`
- `src/datasource/datasource.ts` — pass `this.instanceSettings.jsonData.dataLinks` when constructing `SqlSeries`
- `src/views/ConfigEditor/ConfigEditor.tsx` — render `<DataLinksSection>`
- `src/spec/sql_series_specs.jest.ts` — add `describe` blocks asserting link attachment per converter
- `README.md` — add a "Data Links" section

---

## Task 1: Core types and CHDataSourceOptions extension

**Files:**
- Create: `src/datasource/datalinks/types.ts`
- Modify: `src/types/types.ts`

- [ ] **Step 1: Create `src/datasource/datalinks/types.ts`**

```ts
export type CHFormat = 'table' | 'logs' | 'traces' | 'time_series' | 'flamegraph';

export interface DataLinkConfig {
  fieldName: string;
  title: string;
  targetDatasourceUid: string;
  query: string;
  format?: CHFormat;
}
```

- [ ] **Step 2: Extend `CHDataSourceOptions` in `src/types/types.ts`**

Add import near the top of the file (after the existing imports):

```ts
import { DataLinkConfig } from '../datasource/datalinks/types';
```

Add `dataLinks?: DataLinkConfig[];` to the `CHDataSourceOptions` interface — locate the interface declaration (around line 45-80, the one extending `DataSourceJsonData`) and add the field before the closing brace:

```ts
export interface CHDataSourceOptions extends DataSourceJsonData {
  // ... existing fields ...
  dataLinks?: DataLinkConfig[];
}
```

- [ ] **Step 3: Compile-check**

Run: `npx tsc --noEmit`
Expected: clean (no errors). If errors reference unrelated files, that's pre-existing — only fix errors caused by this change.

- [ ] **Step 4: Commit**

```bash
git add src/datasource/datalinks/types.ts src/types/types.ts
git commit -m "feat(data-links): add DataLinkConfig type and CHDataSourceOptions field"
```

---

## Task 2: `buildDataLink` — non-ClickHouse target branch

**Files:**
- Create: `src/datasource/datalinks/buildDataLink.ts`
- Create: `src/spec/datalinks.test.ts`

- [ ] **Step 1: Write failing test for non-CH target**

Create `src/spec/datalinks.test.ts`:

```ts
import { buildDataLink } from '../datasource/datalinks/buildDataLink';
import { DataLinkConfig } from '../datasource/datalinks/types';

describe('buildDataLink', () => {
  const baseConfig: DataLinkConfig = {
    fieldName: 'trace_id',
    title: 'View trace',
    targetDatasourceUid: 'target-uid',
    query: 'SELECT * FROM traces WHERE trace_id = ${__value.raw}',
  };

  it('builds a generic internal link when target is not ClickHouse', () => {
    const link = buildDataLink(baseConfig, false);

    expect(link.title).toBe('View trace');
    expect(link.url).toBe('');
    expect(link.internal).toEqual({
      datasourceUid: 'target-uid',
      datasourceName: '',
      query: { refId: 'datalink', query: baseConfig.query },
    });
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npx jest src/spec/datalinks.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '../datasource/datalinks/buildDataLink'`

- [ ] **Step 3: Create `src/datasource/datalinks/buildDataLink.ts` with non-CH branch only**

```ts
import { DataLink } from '@grafana/data';
import { DataLinkConfig } from './types';

export function buildDataLink(config: DataLinkConfig, _targetIsClickHouse: boolean): DataLink {
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

- [ ] **Step 4: Run test — verify it passes**

Run: `npx jest src/spec/datalinks.test.ts --no-coverage`
Expected: PASS — `1 passed`

- [ ] **Step 5: Commit**

```bash
git add src/datasource/datalinks/buildDataLink.ts src/spec/datalinks.test.ts
git commit -m "feat(data-links): buildDataLink — non-ClickHouse target branch"
```

---

## Task 3: `buildDataLink` — ClickHouse target branch

**Files:**
- Modify: `src/datasource/datalinks/buildDataLink.ts`
- Modify: `src/spec/datalinks.test.ts`

- [ ] **Step 1: Add failing test for CH target**

Append inside the `describe('buildDataLink', …)` block in `src/spec/datalinks.test.ts`:

```ts
  it('builds a CH-shaped CHQuery when target is ClickHouse', () => {
    const config: DataLinkConfig = { ...baseConfig, format: 'traces' };
    const link = buildDataLink(config, true);

    expect(link.title).toBe('View trace');
    expect(link.url).toBe('');
    expect(link.internal?.datasourceUid).toBe('target-uid');
    expect(link.internal?.query).toMatchObject({
      refId: 'datalink',
      query: config.query,
      rawQuery: config.query,
      format: 'traces',
      extrapolate: false,
      adHocFilters: [],
      showHelp: false,
      showFormattedSQL: false,
    });
  });

  it('defaults format to "table" when omitted on CH target', () => {
    const link = buildDataLink(baseConfig, true);
    expect((link.internal?.query as any).format).toBe('table');
  });
```

- [ ] **Step 2: Run tests — verify the two new ones fail**

Run: `npx jest src/spec/datalinks.test.ts --no-coverage`
Expected: FAIL — both new cases fail because `internal.query` does not have CH fields yet.

- [ ] **Step 3: Add CH branch in `src/datasource/datalinks/buildDataLink.ts`**

Replace the body so the function branches on `targetIsClickHouse`:

```ts
import { DataLink } from '@grafana/data';
import { DataLinkConfig } from './types';
import { DatasourceMode } from '../../types/types';

export function buildDataLink(config: DataLinkConfig, targetIsClickHouse: boolean): DataLink {
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
        },
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

- [ ] **Step 4: Run tests — verify all three pass**

Run: `npx jest src/spec/datalinks.test.ts --no-coverage`
Expected: PASS — `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/datasource/datalinks/buildDataLink.ts src/spec/datalinks.test.ts
git commit -m "feat(data-links): buildDataLink — ClickHouse target branch with CHQuery shape"
```

---

## Task 4: `isClickHouseTarget` helper

**Files:**
- Modify: `src/datasource/datalinks/buildDataLink.ts`
- Modify: `src/spec/datalinks.test.ts`

- [ ] **Step 1: Add failing tests for `isClickHouseTarget`**

Append a new `describe` block to `src/spec/datalinks.test.ts`:

```ts
import { isClickHouseTarget } from '../datasource/datalinks/buildDataLink';

jest.mock('@grafana/runtime', () => ({
  getDataSourceSrv: () => ({
    getInstanceSettings: (uid: string) => {
      if (uid === 'ch-uid') {
        return { type: 'vertamedia-clickhouse-datasource' };
      }
      if (uid === 'loki-uid') {
        return { type: 'loki' };
      }
      return undefined;
    },
  }),
}));

describe('isClickHouseTarget', () => {
  it('returns true for our plugin id', () => {
    expect(isClickHouseTarget('ch-uid')).toBe(true);
  });

  it('returns false for foreign datasource', () => {
    expect(isClickHouseTarget('loki-uid')).toBe(false);
  });

  it('returns false when target uid is unknown / deleted', () => {
    expect(isClickHouseTarget('missing-uid')).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify it fails on import**

Run: `npx jest src/spec/datalinks.test.ts --no-coverage`
Expected: FAIL — `isClickHouseTarget` is not exported.

- [ ] **Step 3: Add `isClickHouseTarget` to `src/datasource/datalinks/buildDataLink.ts`**

Add an import at the top:

```ts
import { getDataSourceSrv } from '@grafana/runtime';
```

Add the helper (anywhere in the file after the imports):

```ts
const CH_PLUGIN_ID = 'vertamedia-clickhouse-datasource';

export function isClickHouseTarget(uid: string): boolean {
  if (!uid) return false;
  const settings = getDataSourceSrv().getInstanceSettings(uid);
  return settings?.type === CH_PLUGIN_ID;
}
```

- [ ] **Step 4: Run — verify all pass**

Run: `npx jest src/spec/datalinks.test.ts --no-coverage`
Expected: PASS — `6 passed` (3 buildDataLink + 3 isClickHouseTarget).

- [ ] **Step 5: Commit**

```bash
git add src/datasource/datalinks/buildDataLink.ts src/spec/datalinks.test.ts
git commit -m "feat(data-links): isClickHouseTarget helper using getDataSourceSrv"
```

---

## Task 5: `applyDataLinks` — basic exact-match attachment

**Files:**
- Create: `src/datasource/datalinks/applyDataLinks.ts`
- Modify: `src/spec/datalinks.test.ts`

- [ ] **Step 1: Add failing test for basic attachment**

Append to `src/spec/datalinks.test.ts`:

```ts
import { applyDataLinks } from '../datasource/datalinks/applyDataLinks';

type AnyField = { name: string; config?: { links?: any[] } & Record<string, unknown> };

describe('applyDataLinks', () => {
  const cfg: DataLinkConfig = {
    fieldName: 'trace_id',
    title: 'View trace',
    targetDatasourceUid: 'loki-uid',
    query: 'q',
  };

  it('attaches a link to a field with matching name only', () => {
    const fields: AnyField[] = [
      { name: 'trace_id', config: {} },
      { name: 'service', config: {} },
    ];

    applyDataLinks(fields, [cfg]);

    expect(fields[0].config?.links).toHaveLength(1);
    expect(fields[0].config?.links?.[0].title).toBe('View trace');
    expect(fields[1].config?.links ?? []).toHaveLength(0);
  });

  it('is a no-op when configs is undefined or empty', () => {
    const fields: AnyField[] = [{ name: 'trace_id', config: {} }];
    applyDataLinks(fields, undefined);
    applyDataLinks(fields, []);
    expect(fields[0].config?.links ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx jest src/spec/datalinks.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '../datasource/datalinks/applyDataLinks'`.

- [ ] **Step 3: Create `src/datasource/datalinks/applyDataLinks.ts`**

```ts
import { buildDataLink, isClickHouseTarget } from './buildDataLink';
import { DataLinkConfig } from './types';

interface MinimalField {
  name: string;
  config?: { links?: any[] } & Record<string, unknown>;
}

interface ApplyOptions {
  allowedFieldNames?: Set<string>;
}

export function applyDataLinks(
  fields: MinimalField[],
  configs: DataLinkConfig[] | undefined,
  options?: ApplyOptions,
): void {
  if (!configs?.length) return;
  for (const field of fields) {
    if (options?.allowedFieldNames && !options.allowedFieldNames.has(field.name)) continue;
    const matching = configs.filter((c) => c.fieldName && c.fieldName === field.name);
    if (!matching.length) continue;
    const links = matching.map((c) => buildDataLink(c, isClickHouseTarget(c.targetDatasourceUid)));
    field.config = {
      ...field.config,
      links: [...(field.config?.links ?? []), ...links],
    };
  }
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx jest src/spec/datalinks.test.ts --no-coverage`
Expected: PASS — `8 passed` (3 buildDataLink + 3 isClickHouseTarget + 2 applyDataLinks).

- [ ] **Step 5: Commit**

```bash
git add src/datasource/datalinks/applyDataLinks.ts src/spec/datalinks.test.ts
git commit -m "feat(data-links): applyDataLinks — exact field-name match"
```

---

## Task 6: `applyDataLinks` — multiple links + accumulation + restrictions

**Files:**
- Modify: `src/spec/datalinks.test.ts`

- [ ] **Step 1: Add failing tests for the remaining behaviours**

Append to the `describe('applyDataLinks', …)` block in `src/spec/datalinks.test.ts`:

```ts
  it('attaches multiple links to the same field when several configs match', () => {
    const fields: AnyField[] = [{ name: 'trace_id', config: {} }];
    const cfgA: DataLinkConfig = { ...cfg, title: 'A' };
    const cfgB: DataLinkConfig = { ...cfg, title: 'B' };

    applyDataLinks(fields, [cfgA, cfgB]);

    expect(fields[0].config?.links).toHaveLength(2);
    expect(fields[0].config?.links?.map((l: any) => l.title)).toEqual(['A', 'B']);
  });

  it('appends to existing field.config.links instead of overwriting', () => {
    const existing = { title: 'pre-existing', url: 'https://x' };
    const fields: AnyField[] = [{ name: 'trace_id', config: { links: [existing] } }];

    applyDataLinks(fields, [cfg]);

    expect(fields[0].config?.links).toHaveLength(2);
    expect(fields[0].config?.links?.[0]).toBe(existing);
  });

  it('respects allowedFieldNames restriction', () => {
    const fields: AnyField[] = [
      { name: 'time', config: {} },
      { name: 'service', config: {} },
    ];
    const onTime: DataLinkConfig = { ...cfg, fieldName: 'time' };
    const onService: DataLinkConfig = { ...cfg, fieldName: 'service' };

    applyDataLinks(fields, [onTime, onService], { allowedFieldNames: new Set(['time']) });

    expect(fields[0].config?.links).toHaveLength(1);
    expect(fields[1].config?.links ?? []).toHaveLength(0);
  });

  it('skips configs with empty fieldName silently', () => {
    const fields: AnyField[] = [{ name: 'trace_id', config: {} }];
    const bad: DataLinkConfig = { ...cfg, fieldName: '' };

    applyDataLinks(fields, [bad]);

    expect(fields[0].config?.links ?? []).toHaveLength(0);
  });
```

- [ ] **Step 2: Run — verify the new tests pass on existing implementation**

Run: `npx jest src/spec/datalinks.test.ts --no-coverage`
Expected: PASS — `12 passed`. The Task 5 implementation already supports all four cases (multiple-match, accumulation via spread, `allowedFieldNames` filter, empty-`fieldName` filter via `c.fieldName && …`). These tests pin that behaviour.

- [ ] **Step 3: Commit**

```bash
git add src/spec/datalinks.test.ts
git commit -m "test(data-links): cover multiple-match, accumulation, and field restriction"
```

---

## Task 7: Public surface `index.ts`

**Files:**
- Create: `src/datasource/datalinks/index.ts`

- [ ] **Step 1: Create `src/datasource/datalinks/index.ts`**

```ts
export type { DataLinkConfig, CHFormat } from './types';
export { buildDataLink, isClickHouseTarget } from './buildDataLink';
export { applyDataLinks } from './applyDataLinks';
```

- [ ] **Step 2: Verify the project still compiles**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/datasource/datalinks/index.ts
git commit -m "feat(data-links): expose public surface via datalinks/index.ts"
```

---

## Task 8: `SqlSeries` accepts `dataLinks` (field + constructor only)

**Files:**
- Modify: `src/datasource/sql-series/sql_series.ts`

This step adds the storage and constructor handling. The method call sites that pass `this.dataLinks` into converters are added later (Task 13), once each converter accepts the parameter. Splitting this way keeps every commit compilable.

- [ ] **Step 1: Edit `src/datasource/sql-series/sql_series.ts`**

Add the import after the existing `@grafana/data` import (line 8):

```ts
import { DataLinkConfig } from '../datalinks';
```

In the `SqlSeries` class (around lines 108-126):

1. Add a field after `to: any;` (around line 115):

```ts
  dataLinks?: DataLinkConfig[];
```

2. In the constructor, after `this.keys = options.keys || [];`:

```ts
    this.dataLinks = options.dataLinks;
```

Do **not** modify the converter methods (`toLogs`, `toTraces`, `toFlamegraph`, `toTimeSeries`) at this point. They are updated in Task 13 after each converter accepts the new parameter.

- [ ] **Step 2: Compile-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/datasource/sql-series/sql_series.ts
git commit -m "feat(data-links): SqlSeries stores optional dataLinks from options"
```

---

## Task 9: Wire `toTraces` to apply data links

**Files:**
- Modify: `src/datasource/sql-series/toTraces.ts`
- Modify: `src/spec/sql_series_specs.jest.ts`

- [ ] **Step 1: Add failing test to `src/spec/sql_series_specs.jest.ts`**

Append a new `describe` block at the bottom of the file:

```ts
describe('sql-series. toTraces data links', () => {
  const meta = [
    { name: 'traceID', type: 'String' },
    { name: 'spanID', type: 'String' },
    { name: 'parentSpanID', type: 'String' },
    { name: 'serviceName', type: 'String' },
    { name: 'startTime', type: 'UInt64' },
    { name: 'duration', type: 'UInt64' },
    { name: 'operationName', type: 'String' },
  ];
  const series = [
    {
      traceID: 't1',
      spanID: 's1',
      parentSpanID: null,
      serviceName: 'web',
      startTime: 1000,
      duration: 10,
      operationName: 'GET /',
      tags: {},
      serviceTags: {},
    },
  ];

  it('attaches data link to matching field name', () => {
    const links = [
      {
        fieldName: 'traceID',
        title: 'View',
        targetDatasourceUid: 'x',
        query: 'q',
      },
    ];

    const out = toTraces(series as any, meta, links as any);
    const traceIdField = out[0].fields.find((f: any) => f.name === 'traceID');
    const serviceField = out[0].fields.find((f: any) => f.name === 'serviceName');

    expect(traceIdField?.config?.links).toHaveLength(1);
    expect(serviceField?.config?.links ?? []).toHaveLength(0);
  });

  it('is a no-op when dataLinks is undefined', () => {
    const out = toTraces(series as any, meta, undefined);
    const traceIdField = out[0].fields.find((f: any) => f.name === 'traceID');
    expect(traceIdField?.config?.links ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage -t "toTraces data links"`
Expected: FAIL — `toTraces` does not accept a third argument / link is not attached.

- [ ] **Step 3: Edit `src/datasource/sql-series/toTraces.ts`**

Add import at the top (after the existing imports):

```ts
import { applyDataLinks } from '../datalinks';
import { DataLinkConfig } from '../datalinks/types';
```

Change the function signature on line 35 and insert the `applyDataLinks` call inside the loop, just before `results.push(...)`:

```ts
export const toTraces = (series: Trace[], meta: any, dataLinks?: DataLinkConfig[]): TraceData[] => {
  // ... existing body unchanged until the end of the for-loop iteration ...

  for (const spans of sortedGroups) {
    const fields = createEmptyFields();

    // ... existing inner span-loop unchanged ...

    const fieldArray = Object.values(fields);
    applyDataLinks(fieldArray, dataLinks);

    results.push({
      fields: fieldArray,
      length: spans.length,
    });
  }

  return results;
};
```

(Replace the existing `results.push({ fields: Object.values(fields), length: spans.length });` with the two-line form above so we can run `applyDataLinks` on the same array we push.)

- [ ] **Step 4: Run — verify it passes**

Run: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage -t "toTraces data links"`
Expected: PASS — `2 passed`.

Also run the full file to confirm no regression: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage`
Expected: all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/datasource/sql-series/toTraces.ts src/spec/sql_series_specs.jest.ts
git commit -m "feat(data-links): wire toTraces to apply data links per group"
```

---

## Task 10: Wire `toLogs` to apply data links

**Files:**
- Modify: `src/datasource/sql-series/toLogs.ts`
- Modify: `src/spec/sql_series_specs.jest.ts`

- [ ] **Step 1: Add failing test to `src/spec/sql_series_specs.jest.ts`**

Append a new `describe` block:

```ts
describe('sql-series. toLogs data links', () => {
  const meta = [
    { name: 'timestamp', type: 'DateTime' },
    { name: 'content', type: 'String' },
    { name: 'trace_id', type: 'String' },
  ];
  const series = [
    { timestamp: '2024-01-01 00:00:00', content: 'hello', trace_id: 't1' },
  ];

  it('attaches data link to matching label field', () => {
    const links = [
      { fieldName: 'trace_id', title: 'T', targetDatasourceUid: 'x', query: 'q' },
    ];
    const self: any = { refId: 'A', series, meta, dataLinks: links };
    const out = toLogs(self);
    const labels = out[0].fields.find((f: any) => f.name === 'labels');
    // log labels are stored as a stringified key/value list, not as a field per column,
    // so trace_id is only addressable by the labels field — assert the link lands on
    // the timestamp/body/labels fields appropriately. trace_id has no dedicated field
    // in the log DataFrame, so this test asserts that no spurious link lands on body.
    const body = out[0].fields.find((f: any) => f.name === 'body');
    expect(body?.config?.links ?? []).toHaveLength(0);
    // The link won't attach because there's no field literally named "trace_id" in the
    // produced DataFrame — Grafana's log labels are nested. This documents the limitation.
    expect(labels?.config?.links ?? []).toHaveLength(0);
  });

  it('attaches link to body when fieldName matches "body"', () => {
    const links = [
      { fieldName: 'body', title: 'View body source', targetDatasourceUid: 'x', query: 'q' },
    ];
    const self: any = { refId: 'A', series, meta, dataLinks: links };
    const out = toLogs(self);
    const body = out[0].fields.find((f: any) => f.name === 'body');
    expect(body?.config?.links).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage -t "toLogs data links"`
Expected: FAIL — no link is attached to body yet.

- [ ] **Step 3: Edit `src/datasource/sql-series/toLogs.ts`**

Add import at the top (after the existing imports):

```ts
import { applyDataLinks } from '../datalinks';
```

In the existing `toLogs` function, right before `return [result]` at the very end (around line 195), insert:

```ts
  applyDataLinks(result.fields as any, self.dataLinks);
```

So the final tail of `toLogs` becomes:

```ts
  const result = createDataFrame({ /* ... existing ... */ });

  applyDataLinks(result.fields as any, self.dataLinks);

  return [result];
```

- [ ] **Step 4: Run — verify tests pass**

Run: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage -t "toLogs data links"`
Expected: PASS — `2 passed`.

Full-file regression: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage` — all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/datasource/sql-series/toLogs.ts src/spec/sql_series_specs.jest.ts
git commit -m "feat(data-links): wire toLogs to apply data links by field name"
```

---

## Task 11: Wire `toFlamegraph` to apply data links

**Files:**
- Modify: `src/datasource/sql-series/toFlamegraph.ts`
- Modify: `src/spec/sql_series_specs.jest.ts`

- [ ] **Step 1: Add failing test**

Append to `src/spec/sql_series_specs.jest.ts`:

```ts
describe('sql-series. toFlamegraph data links', () => {
  const input = [
    { label: 'root', level: 1, value: '10', self: 5 },
    { label: 'child', level: 2, value: '4', self: 2 },
  ];

  it('attaches data link to matching field', () => {
    const links = [
      { fieldName: 'label', title: 'Inspect', targetDatasourceUid: 'x', query: 'q' },
    ];
    const out = toFlamegraph(input, links as any);
    const labelField = out[0].fields.find((f: any) => f.name === 'label');
    const valueField = out[0].fields.find((f: any) => f.name === 'value');
    expect(labelField?.config?.links).toHaveLength(1);
    expect(valueField?.config?.links ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage -t "toFlamegraph data links"`
Expected: FAIL — `toFlamegraph` does not accept a second argument.

- [ ] **Step 3: Edit `src/datasource/sql-series/toFlamegraph.ts`**

Add imports at the top:

```ts
import { applyDataLinks } from '../datalinks';
import { DataLinkConfig } from '../datalinks/types';
```

Change signature and call `applyDataLinks` on the produced `fields` (full updated function for clarity — replace the existing `export const toFlamegraph` and its inner `transformTraceData`):

```ts
export const toFlamegraph = (inputSeries, dataLinks?: DataLinkConfig[]): any => {
  try {
    const series: FlamegraphData[] = inputSeries;
    return transformTraceData(series);
  } catch (error: any) {
    return [
      {
        fields: [
          {
            name: 'error',
            type: 'string',
            values: [error?.message],
            config: {},
          },
        ],
        length: 1,
      },
    ];
  }

  function transformTraceData(inputData: FlamegraphData[]): any {
    const sortedData = inputData.filter((item) => !(Number(item.level) === 0));

    const fields: { [key: string]: Field } = {
      label: { name: 'label', type: 'string', values: ['all'], config: {} },
      level: { name: 'level', type: 'number', values: [0], config: {} },
      value: { name: 'value', type: 'number', values: [0], config: {} },
      self: { name: 'self', type: 'number', values: [0], config: {} },
    };

    fields.value.values[0] = inputData
      .filter((item) => Number(item.level) === 1)
      .reduce((acc, item) => acc + Number(item.value), 0);

    sortedData.forEach((item) => {
      fields.label.values.push(item.label);
      fields.level.values.push(Number(item.level));
      fields.value.values.push(Number(item.value));
      fields.self.values.push(item.self);
    });

    const fieldArray = Object.values(fields);
    applyDataLinks(fieldArray, dataLinks);

    return [{ fields: fieldArray, length: inputData.length }];
  }
};
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage -t "toFlamegraph"`
Expected: PASS for both the new test and the pre-existing `toFlamegraph unit tests`. (The existing test asserts `config: {}` on each field — that remains true when `dataLinks` is undefined because `applyDataLinks` is a no-op then.)

Full regression: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/datasource/sql-series/toFlamegraph.ts src/spec/sql_series_specs.jest.ts
git commit -m "feat(data-links): wire toFlamegraph to apply data links by field name"
```

---

## Task 12: Wire `toTimeSeries` to apply data links on the `time` field only

**Files:**
- Modify: `src/datasource/sql-series/toTimeSeries.ts`
- Modify: `src/spec/sql_series_specs.jest.ts`

- [ ] **Step 1: Add failing test**

Append to `src/spec/sql_series_specs.jest.ts`:

```ts
describe('sql-series. toTimeSeries data links', () => {
  const meta = [
    { name: 'time', type: 'DateTime' },
    { name: 'metric', type: 'UInt64' },
  ];
  const series = [
    { time: '2024-01-01 00:00:00', metric: 1 },
    { time: '2024-01-01 00:00:10', metric: 2 },
  ];

  it('attaches data link only to the time field', () => {
    const self: any = {
      refId: 'A',
      series,
      meta,
      keys: [],
      tillNow: false,
      from: 0,
      to: 1,
      dataLinks: [
        { fieldName: 'time', title: 'On time', targetDatasourceUid: 'x', query: 'q' },
        { fieldName: 'metric', title: 'On metric', targetDatasourceUid: 'x', query: 'q' },
      ],
    };

    const out = toTimeSeries(true, false, self);
    const ts = out[0];
    const timeField = ts.fields.find((f: any) => f.name === 'time');
    const metricField = ts.fields.find((f: any) => f.name === 'metric');

    expect(timeField?.config?.links).toHaveLength(1);
    expect(timeField?.config?.links?.[0].title).toBe('On time');
    expect(metricField?.config?.links ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage -t "toTimeSeries data links"`
Expected: FAIL — links not attached.

- [ ] **Step 3: Edit `src/datasource/sql-series/toTimeSeries.ts`**

Add import at the top:

```ts
import { applyDataLinks } from '../datalinks';
```

In the existing `each(metrics, function (dataPoints, seriesName) { … })` block (around lines 203-215), after each timeseries entry is pushed, attach links on its fields. Replace the `each(metrics, ...)` block with:

```ts
  each(metrics, function (dataPoints, seriesName) {
    const processedDataPoints = (extrapolate ? extrapolateDataPoints(dataPoints, self) : dataPoints).filter(item => (typeof item[0] === 'number' || typeof item[0] === 'string' || item[0] === null) && item[1]);

    const fields = [
      { config: { links: [] as any[] }, name: 'time', type: 'time', values: processedDataPoints.map((v: any) => v[1]) },
      { config: { links: [] as any[] }, name: seriesName, values: processedDataPoints.map((v: any) => v[0]) },
    ];

    applyDataLinks(fields as any, self.dataLinks, { allowedFieldNames: new Set(['time']) });

    timeSeries.push({
      length: processedDataPoints.length,
      fields,
      refId: seriesName && self.refId ? `${self.refId} - ${seriesName}` : undefined,
    });
  });
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage -t "toTimeSeries data links"`
Expected: PASS — `1 passed`.

Full regression: `npx jest src/spec/sql_series_specs.jest.ts --no-coverage`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/datasource/sql-series/toTimeSeries.ts src/spec/sql_series_specs.jest.ts
git commit -m "feat(data-links): wire toTimeSeries to apply links on time field only"
```

---

## Task 13: Wire `SqlSeries` methods to pass `this.dataLinks` to converters; pass `jsonData.dataLinks` from `CHDataSource`

**Files:**
- Modify: `src/datasource/sql-series/sql_series.ts`
- Modify: `src/datasource/datasource.ts`

This step closes the data flow from `jsonData.dataLinks` (Task 1) through `CHDataSource` to `SqlSeries` (Task 8) and finally into each converter (Tasks 9–12).

- [ ] **Step 1: Update `SqlSeries` converter methods in `src/datasource/sql-series/sql_series.ts`**

In the class body (around lines 132-153), replace the existing method bodies to pass `this.dataLinks` where it is now expected:

```ts
  toFlamegraph = (): any => {
    return toFlamegraph(this.series, this.dataLinks);
  };

  toTraces = (): any => {
    return toTraces(this.series, this.meta, this.dataLinks);
  };
```

(`toLogs` and `toTimeSeries` already read `self.dataLinks` because `self` is the `SqlSeries` instance — no change needed in their methods.)

- [ ] **Step 2: Compile-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Locate the `new SqlSeries({...})` construction in `src/datasource/datasource.ts`**

Find the `new SqlSeries(` call near line 392-402 (inside the `query()` flow).

- [ ] **Step 4: Add `dataLinks` to the construction options**

Modify the options object passed to `new SqlSeries(...)`:

```ts
let sqlSeries = new SqlSeries({
  refId: target.refId,
  series: response.data,
  meta: response.meta,
  keys: keys,
  tillNow: options.rangeRaw?.to === 'now',
  from: convertTimestamp(options.range.from),
  to: convertTimestamp(options.range.to),
  dataLinks: this.instanceSettings.jsonData.dataLinks,
});
```

`CHDataSource` extends `DataSourceApi`, which provides `this.instanceSettings`. If a different variable name is used in this codebase (check the class constructor), adapt accordingly.

- [ ] **Step 5: Compile-check + run full test suite**

```bash
npx tsc --noEmit
npm run test
```

Expected: both clean / all green.

- [ ] **Step 6: Commit**

```bash
git add src/datasource/sql-series/sql_series.ts src/datasource/datasource.ts
git commit -m "feat(data-links): wire SqlSeries methods and CHDataSource to propagate dataLinks"
```

---

## Task 14: `DataLinkEditor` component

**Files:**
- Create: `src/views/ConfigEditor/components/DataLinks/DataLinkEditor.tsx`
- Create: `src/spec/DataLinkEditor.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/spec/DataLinkEditor.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataLinkEditor } from '../views/ConfigEditor/components/DataLinks/DataLinkEditor';
import { DataLinkConfig } from '../datasource/datalinks/types';

jest.mock('@grafana/runtime', () => ({
  getDataSourceSrv: () => ({
    getInstanceSettings: (uid: string) => {
      if (uid === 'ch-uid') return { type: 'vertamedia-clickhouse-datasource', name: 'CH' };
      if (uid === 'loki-uid') return { type: 'loki', name: 'Loki' };
      return undefined;
    },
  }),
  DataSourcePicker: ({ current, onChange }: any) => (
    <select
      data-testid="ds-picker"
      value={current ?? ''}
      onChange={(e) => onChange({ uid: e.target.value })}
    >
      <option value="">(none)</option>
      <option value="ch-uid">CH</option>
      <option value="loki-uid">Loki</option>
    </select>
  ),
}));

// Mock @grafana/ui's CodeEditor to a plain textarea for test simplicity.
jest.mock('@grafana/ui', () => {
  const actual = jest.requireActual('@grafana/ui');
  return {
    ...actual,
    CodeEditor: ({ value, onBlur }: any) => (
      <textarea
        data-testid="code-editor"
        defaultValue={value}
        onBlur={(e) => onBlur(e.currentTarget.value)}
      />
    ),
  };
});

describe('DataLinkEditor', () => {
  const baseLink: DataLinkConfig = {
    fieldName: 'trace_id',
    title: 'View',
    targetDatasourceUid: 'loki-uid',
    query: 'q',
  };

  it('renders all editable fields with current values', () => {
    render(
      <DataLinkEditor
        dataLink={baseLink}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByDisplayValue('trace_id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('View')).toBeInTheDocument();
    expect(screen.getByTestId('code-editor')).toHaveValue('q');
  });

  it('hides Format selector when target is not ClickHouse', () => {
    render(
      <DataLinkEditor
        dataLink={baseLink}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.queryByLabelText(/format/i)).not.toBeInTheDocument();
  });

  it('shows Format selector when target is ClickHouse', () => {
    render(
      <DataLinkEditor
        dataLink={{ ...baseLink, targetDatasourceUid: 'ch-uid' }}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByLabelText(/format/i)).toBeInTheDocument();
  });

  it('calls onChange when fieldName is edited', () => {
    const onChange = jest.fn();
    render(
      <DataLinkEditor dataLink={baseLink} onChange={onChange} onDelete={() => {}} />
    );
    fireEvent.change(screen.getByDisplayValue('trace_id'), { target: { value: 'span_id' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fieldName: 'span_id' }));
  });

  it('calls onDelete when remove button is clicked', () => {
    const onDelete = jest.fn();
    render(
      <DataLinkEditor dataLink={baseLink} onChange={() => {}} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onDelete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — verify failure**

Run: `npx jest src/spec/DataLinkEditor.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/views/ConfigEditor/components/DataLinks/DataLinkEditor.tsx`**

```tsx
import React, { useMemo } from 'react';
import { Button, CodeEditor, Field, Input, Select } from '@grafana/ui';
import { DataSourcePicker, getDataSourceSrv } from '@grafana/runtime';
import { SelectableValue } from '@grafana/data';
import { CHFormat, DataLinkConfig } from '../../../../datasource/datalinks/types';

const FORMAT_OPTIONS: Array<SelectableValue<CHFormat>> = [
  { label: 'Table', value: 'table' },
  { label: 'Logs', value: 'logs' },
  { label: 'Traces', value: 'traces' },
  { label: 'Time series', value: 'time_series' },
  { label: 'Flamegraph', value: 'flamegraph' },
];

const CH_PLUGIN_ID = 'vertamedia-clickhouse-datasource';

interface Props {
  dataLink: DataLinkConfig;
  onChange: (updated: DataLinkConfig) => void;
  onDelete: () => void;
}

export function DataLinkEditor({ dataLink, onChange, onDelete }: Props) {
  const isCHTarget = useMemo(() => {
    if (!dataLink.targetDatasourceUid) return false;
    const settings = getDataSourceSrv().getInstanceSettings(dataLink.targetDatasourceUid);
    return settings?.type === CH_PLUGIN_ID;
  }, [dataLink.targetDatasourceUid]);

  return (
    <div style={{ border: '1px solid var(--border-weak)', borderRadius: 4, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Field label="Field name" style={{ flex: 1 }}>
          <Input
            value={dataLink.fieldName}
            placeholder="e.g. trace_id"
            onChange={(e) => onChange({ ...dataLink, fieldName: e.currentTarget.value })}
          />
        </Field>
        <Field label="Title" style={{ flex: 1 }}>
          <Input
            value={dataLink.title}
            placeholder="e.g. View trace"
            onChange={(e) => onChange({ ...dataLink, title: e.currentTarget.value })}
          />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Field label="Target datasource" style={{ flex: 1 }}>
          <DataSourcePicker
            current={dataLink.targetDatasourceUid}
            onChange={(ds) => onChange({ ...dataLink, targetDatasourceUid: ds.uid ?? '' })}
            noDefault
          />
        </Field>
        {isCHTarget && (
          <Field label="Format" style={{ width: 180 }}>
            <Select
              options={FORMAT_OPTIONS}
              value={dataLink.format ?? 'table'}
              onChange={(v) => onChange({ ...dataLink, format: (v.value ?? 'table') as CHFormat })}
            />
          </Field>
        )}
      </div>
      <Field
        label="Query"
        description="Supports ${__value.raw}, ${__data.fields.<name>}, $__from, $__to, and dashboard variables. See Grafana docs on data link variables."
      >
        <CodeEditor
          language="sql"
          height={120}
          value={dataLink.query}
          onBlur={(value) => onChange({ ...dataLink, query: value })}
          showMiniMap={false}
          showLineNumbers={false}
        />
      </Field>
      <Button variant="destructive" size="sm" icon="trash-alt" onClick={onDelete}>
        Remove
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run — verify tests pass**

Run: `npx jest src/spec/DataLinkEditor.test.tsx --no-coverage`
Expected: PASS — `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/views/ConfigEditor/components/DataLinks/DataLinkEditor.tsx src/spec/DataLinkEditor.test.tsx
git commit -m "feat(data-links): DataLinkEditor component with adaptive format selector"
```

---

## Task 15: `DataLinksSection` component

**Files:**
- Create: `src/views/ConfigEditor/components/DataLinks/DataLinksSection.tsx`
- Create: `src/spec/DataLinksSection.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/spec/DataLinksSection.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataLinksSection } from '../views/ConfigEditor/components/DataLinks/DataLinksSection';
import { DataLinkConfig } from '../datasource/datalinks/types';

// Replace DataLinkEditor with a stub so we only test list management here.
jest.mock('../views/ConfigEditor/components/DataLinks/DataLinkEditor', () => ({
  DataLinkEditor: ({ dataLink, onChange, onDelete }: any) => (
    <div data-testid="editor">
      <input
        data-testid={`name-${dataLink.fieldName}`}
        value={dataLink.fieldName}
        onChange={(e) => onChange({ ...dataLink, fieldName: e.target.value })}
      />
      <button onClick={onDelete}>delete-{dataLink.fieldName}</button>
    </div>
  ),
}));

describe('DataLinksSection', () => {
  it('renders empty state when list is empty', () => {
    render(<DataLinksSection dataLinks={[]} onChange={() => {}} />);
    expect(screen.getByText(/no data links configured/i)).toBeInTheDocument();
  });

  it('renders one editor per data link', () => {
    const links: DataLinkConfig[] = [
      { fieldName: 'a', title: 'A', targetDatasourceUid: 'x', query: 'q' },
      { fieldName: 'b', title: 'B', targetDatasourceUid: 'x', query: 'q' },
    ];
    render(<DataLinksSection dataLinks={links} onChange={() => {}} />);
    expect(screen.getAllByTestId('editor')).toHaveLength(2);
  });

  it('appends a new empty link on "Add data link"', () => {
    const onChange = jest.fn();
    render(<DataLinksSection dataLinks={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add data link/i }));
    expect(onChange).toHaveBeenCalledWith([
      { fieldName: '', title: '', targetDatasourceUid: '', query: '' },
    ]);
  });

  it('removes a link by index', () => {
    const links: DataLinkConfig[] = [
      { fieldName: 'a', title: 'A', targetDatasourceUid: 'x', query: 'q' },
      { fieldName: 'b', title: 'B', targetDatasourceUid: 'x', query: 'q' },
    ];
    const onChange = jest.fn();
    render(<DataLinksSection dataLinks={links} onChange={onChange} />);
    fireEvent.click(screen.getByText('delete-a'));
    expect(onChange).toHaveBeenCalledWith([
      { fieldName: 'b', title: 'B', targetDatasourceUid: 'x', query: 'q' },
    ]);
  });

  it('propagates an edit by index', () => {
    const links: DataLinkConfig[] = [
      { fieldName: 'a', title: 'A', targetDatasourceUid: 'x', query: 'q' },
    ];
    const onChange = jest.fn();
    render(<DataLinksSection dataLinks={links} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('name-a'), { target: { value: 'aa' } });
    expect(onChange).toHaveBeenCalledWith([
      { fieldName: 'aa', title: 'A', targetDatasourceUid: 'x', query: 'q' },
    ]);
  });
});
```

- [ ] **Step 2: Run — verify failure**

Run: `npx jest src/spec/DataLinksSection.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/views/ConfigEditor/components/DataLinks/DataLinksSection.tsx`**

```tsx
import React from 'react';
import { Button } from '@grafana/ui';
import { DataLinkConfig } from '../../../../datasource/datalinks/types';
import { DataLinkEditor } from './DataLinkEditor';

interface Props {
  dataLinks: DataLinkConfig[];
  onChange: (next: DataLinkConfig[]) => void;
}

const EMPTY_LINK: DataLinkConfig = {
  fieldName: '',
  title: '',
  targetDatasourceUid: '',
  query: '',
};

export function DataLinksSection({ dataLinks, onChange }: Props) {
  const onAdd = () => onChange([...dataLinks, { ...EMPTY_LINK }]);
  const onUpdate = (index: number, updated: DataLinkConfig) => {
    const next = dataLinks.slice();
    next[index] = updated;
    onChange(next);
  };
  const onDelete = (index: number) => {
    onChange(dataLinks.filter((_, i) => i !== index));
  };

  return (
    <section style={{ marginTop: 16 }}>
      <h3>Data Links</h3>
      <p style={{ color: 'var(--text-secondary)' }}>
        Attach clickable links to query result fields. Configured links open the target datasource in Explore with the chosen query.
      </p>

      {dataLinks.length === 0 ? (
        <p style={{ fontStyle: 'italic' }}>
          No data links configured. Add one to enable cross-datasource navigation from query results.
        </p>
      ) : (
        dataLinks.map((dl, i) => (
          <DataLinkEditor
            key={i}
            dataLink={dl}
            onChange={(updated) => onUpdate(i, updated)}
            onDelete={() => onDelete(i)}
          />
        ))
      )}

      <Button variant="secondary" size="sm" icon="plus" onClick={onAdd}>
        Add data link
      </Button>
    </section>
  );
}
```

- [ ] **Step 4: Run — verify tests pass**

Run: `npx jest src/spec/DataLinksSection.test.tsx --no-coverage`
Expected: PASS — `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/views/ConfigEditor/components/DataLinks/DataLinksSection.tsx src/spec/DataLinksSection.test.tsx
git commit -m "feat(data-links): DataLinksSection list + add/remove/edit handlers"
```

---

## Task 16: Wire `DataLinksSection` into `ConfigEditor`

**Files:**
- Modify: `src/views/ConfigEditor/ConfigEditor.tsx`

- [ ] **Step 1: Add import in `src/views/ConfigEditor/ConfigEditor.tsx`**

Add near the top, after the existing imports:

```ts
import { DataLinksSection } from './components/DataLinks/DataLinksSection';
import { DataLinkConfig } from '../../datasource/datalinks/types';
```

- [ ] **Step 2: Add an `onDataLinksChange` handler and render the section**

Inside the `ConfigEditor` function body, add a handler after the other `on*` handlers:

```ts
  const onDataLinksChange = (dataLinks: DataLinkConfig[]) => {
    onOptionsChange({
      ...options,
      jsonData: { ...jsonData, dataLinks },
    });
  };
```

In the JSX returned by the component, find the closing `</>` and insert the section just above it (i.e. as the last block before close):

```tsx
      <DataLinksSection
        dataLinks={jsonData.dataLinks ?? []}
        onChange={onDataLinksChange}
      />
    </>
```

- [ ] **Step 3: Compile-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Run full unit + component test suite**

Run: `npm run test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/views/ConfigEditor/ConfigEditor.tsx
git commit -m "feat(data-links): render DataLinksSection in ConfigEditor"
```

---

## Task 17: Demo dashboard

**Files:**
- Create: `docker/grafana/dashboards/data_links_demo.json`

- [ ] **Step 1: Create a minimal dashboard demonstrating one configured link**

Place a small dashboard JSON at `docker/grafana/dashboards/data_links_demo.json`. Use the existing dashboards in `docker/grafana/dashboards/` as structural templates (panel count, datasource UIDs, etc.). Minimum content: one Logs panel that queries `system.text_log` (or equivalent) returning a `trace_id` column. The data link itself is configured on the datasource — not in the dashboard JSON.

```json
{
  "title": "Data Links Demo",
  "uid": "data-links-demo",
  "schemaVersion": 39,
  "version": 1,
  "panels": [
    {
      "id": 1,
      "title": "Logs with trace_id column",
      "type": "logs",
      "datasource": {
        "type": "vertamedia-clickhouse-datasource",
        "uid": "altinity-clickhouse-plugin"
      },
      "gridPos": { "h": 12, "w": 24, "x": 0, "y": 0 },
      "targets": [
        {
          "refId": "A",
          "format": "logs",
          "datasourceMode": "datasource",
          "query": "SELECT event_time AS timestamp, level AS severity, message AS content, query_id AS trace_id FROM system.text_log WHERE $timeFilter ORDER BY event_time DESC LIMIT 100",
          "rawQuery": "SELECT event_time AS timestamp, level AS severity, message AS content, query_id AS trace_id FROM system.text_log WHERE $timeFilter ORDER BY event_time DESC LIMIT 100"
        }
      ]
    }
  ],
  "time": { "from": "now-1h", "to": "now" }
}
```

Verify the UID `altinity-clickhouse-plugin` matches the one in `docker/grafana/datasources/`. If different, substitute.

- [ ] **Step 2: Commit**

```bash
git add docker/grafana/dashboards/data_links_demo.json
git commit -m "test(data-links): add demo dashboard for manual verification"
```

---

## Task 18: Manual end-to-end verification

**Why manual:** the `tests/e2e/` tree in this repo is currently empty and `npm run e2e` is wired to the legacy `grafana-e2e` (Cypress) framework, not Playwright. Standing up E2E test infrastructure is out of scope for this PR; instead, run a structured manual verification before opening the PR. Automated coverage is provided by the unit + component tests in Tasks 2-15.

- [ ] **Step 1: Start the dev environment**

```bash
docker compose up --no-deps -d grafana clickhouse
docker compose run --rm frontend_builder
docker compose run --rm backend_builder
docker compose restart grafana
```

Wait for Grafana to come up at `http://localhost:3000/` (admin / admin).

- [ ] **Step 2: Configure a data link**

In Grafana UI:
1. Go to **Connections → Data sources → Altinity plugin for ClickHouse** (the pre-provisioned test datasource).
2. Scroll to **Data Links** at the bottom.
3. Click **Add data link**.
4. Fill:
   - **Field name:** `query_id`
   - **Title:** `Inspect query`
   - **Target datasource:** the same ClickHouse datasource (self-link).
   - **Format:** `logs` (Format selector should appear because target is CH).
   - **Query:** `SELECT event_time AS timestamp, level AS severity, message AS content FROM system.text_log WHERE query_id = '${__value.raw}' ORDER BY event_time DESC LIMIT 100`
5. **Save & Test**.

- [ ] **Step 3: Verify in Explore — logs format**

1. Go to **Explore**, pick the ClickHouse datasource.
2. Run: `SELECT event_time AS timestamp, level AS severity, message AS content, query_id FROM system.text_log WHERE $timeFilter ORDER BY event_time DESC LIMIT 50`
3. Set **Format: logs**.
4. Expand a log line — `query_id` should appear as a label.
5. **Note:** logs labels are nested inside the `labels` field; clickable links work on body / severity / timestamp columns when their names match. To validate, configure a second data link with `fieldName: body` and verify it renders.

- [ ] **Step 4: Verify in Explore — traces format**

1. Configure a second data link: `fieldName: traceID`, `Title: Open trace`, target = self, `Format: traces`, query suitable for your `system.opentelemetry_span_log` (or whichever traces table exists).
2. Run a traces-format query in Explore. Assert that span rows in the traces panel have a clickable link on `traceID`.

- [ ] **Step 5: Verify in Explore — time_series format**

1. Configure: `fieldName: time`, target = same CH datasource, `Format: time_series`, simple drill-down query.
2. Run a timeseries query in Explore. Hover on the time axis; assert the link is offered on the `time` field only, **not** on dimension series.

- [ ] **Step 6: Verify configuration UX**

1. Add a fourth data link, leave target empty. Save & Test should not error.
2. Pick a non-CH datasource (e.g. the built-in `-- Grafana --` test datasource). The `Format` selector must disappear.
3. Remove the link. State persists on Save.

- [ ] **Step 7: Record results**

Take screenshots of each working format and attach them to the PR description.

- [ ] **Step 8: (No commit — manual verification only.)**

---

## Task 19: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Data Links" section to `README.md`**

Find an appropriate location (after "Configuration" or near the bottom, before "Development"). Add:

```markdown
## Data Links

You can configure clickable data links on query result fields at the datasource level. When a result column matches a configured `Field name` (exact, case-sensitive), every cell in that column becomes a link that opens Explore with a chosen target query in another datasource (or in this one).

Configured per datasource in the **Data Links** section of the datasource settings. Each link has:

- **Field name** — exact column name in your `SELECT` (including aliases) that the link should attach to.
- **Title** — what appears in the click popover.
- **Target datasource** — any datasource in your Grafana instance. The plugin adapts the produced query shape automatically when the target is ClickHouse.
- **Query** — the target datasource's query body. Supports Grafana data link variables: `${__value.raw}`, `${__data.fields.<name>}`, `$__from`, `$__to`, and dashboard variables. Variables are resolved by Grafana at click time.
- **Format** (ClickHouse target only) — `logs`, `traces`, `time_series`, `flamegraph`, or `table`.

Supported result formats: `logs`, `traces`, `time_series` (links work only on the `time` field — see #788), and `flamegraph`. Table format support is planned for a follow-up release.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(data-links): add Data Links section to README"
```

---

## Task 20: Final verification + push

- [ ] **Step 1: Run the automated test matrix**

```bash
npm run lint
npm run test
```

Expected: both green.

- [ ] **Step 2: Complete manual verification from Task 18**

Re-run the Task 18 checklist if not already done. Save screenshots of each verified format.

- [ ] **Step 3: Push branch**

```bash
git push -u origin data-links
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "Add data links (closes #432, #645)" --body "$(cat <<'EOF'
## Summary

- Datasource-level data link configuration in ConfigEditor (canonical Grafana pattern, modelled after Loki/Elasticsearch).
- Per-field attachment by exact column name; links produced on `logs`, `traces`, `time_series` (time field only), and `flamegraph` formats.
- Adaptive UI: Format selector only appears when target is ClickHouse.

Closes #432, closes #645.

## Test plan

- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Manual verification (Task 18) — screenshots attached below

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec coverage check (self-review of this plan)

- **Spec §References, §Context, §Goals, §Non-Goals** → no code; informational. Covered.
- **Spec §Architecture — Layout** → file structure section above mirrors this exactly. Covered.
- **Spec §Architecture — Layers of responsibility** → Tasks 1, 5, 8, 9-12, 13, 14-16 each touch one layer. Covered.
- **Spec §Data Model — `DataLinkConfig`** → Task 1.
- **Spec §Data Model — `CHDataSourceOptions` extension** → Task 1.
- **Spec §Data Model — `buildDataLink` (both branches, isClickHouseTarget)** → Tasks 2, 3, 4.
- **Spec §Variable interpolation** → no code (Grafana handles it). README in Task 19 documents it.
- **Spec §Application — `applyDataLinks` helper** → Tasks 5, 6.
- **Spec §Application — Insertion points (logs/traces/timeseries/flamegraph)** → Tasks 9, 10, 11, 12.
- **Spec §Application — `SqlSeries` wiring** → Task 8.
- **Spec §Application — Edge cases** → covered by tests in Tasks 5, 6 (empty configs, multiple matches, accumulation), 12 (allowedFieldNames).
- **Spec §UI — DataLinksSection, DataLinkEditor, validation, empty state** → Tasks 14, 15, 16.
- **Spec §Testing — unit, component, demo dashboard** → Tasks 2-12, 14, 15, 17. Spec §Testing — E2E section is replaced by Task 18 (manual verification) because the repo's `tests/e2e/` is empty and `npm run e2e` is wired to legacy Cypress; standing up E2E is out of scope.
- **Spec §Documentation** → Task 19.
- **Spec §Release** → Task 20.

No spec gaps. Deviations from spec: §Testing's "E2E (Playwright)" subsection is replaced by Task 18 manual verification; the spec will be updated separately.
