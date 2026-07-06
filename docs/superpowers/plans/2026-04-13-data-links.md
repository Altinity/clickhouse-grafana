# Data Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to configure clickable data links on query results that navigate to another ClickHouse query in a different panel/datasource.

**Architecture:** Per-query `dataLinks` config on `CHQuery`. A single `buildGrafanaDataLinks()` function converts configs into Grafana `DataLink` objects with `internal` queries. Links are attached to DataFrame fields in format converters. UI is a collapsible section in QueryEditor.

**Tech Stack:** TypeScript, React, Grafana DataLink API (`@grafana/data`), Grafana UI components (`@grafana/ui`), Jest for tests.

---

## File Structure

**New files:**
- `src/datasource/datalinks.ts` — `DataLinkConfig` type + `buildGrafanaDataLinks()` function
- `src/views/QueryEditor/components/DataLinks/DataLinkEditor.tsx` — Editor for a single data link
- `src/views/QueryEditor/components/DataLinks/DataLinksSection.tsx` — Collapsible section managing list of data links
- `src/spec/datalinks.test.ts` — Unit tests for `buildGrafanaDataLinks()`
- `docker/grafana/dashboards/data_links_demo.json` — Demo dashboard

**Modified files:**
- `src/types/types.ts` — Add `dataLinks?: DataLinkConfig[]` to `CHQuery`
- `src/datasource/sql-series/sql_series.ts` — Accept and store `dataLinks` in constructor
- `src/datasource/sql-series/toLogs.ts` — Attach links to log fields
- `src/datasource/sql-series/toTraces.ts` — Attach links to trace fields
- `src/datasource/sql-series/toTimeSeries.ts` — Attach links to time series fields
- `src/datasource/sql-series/toFlamegraph.ts` — Attach links to flamegraph fields
- `src/datasource/datasource.ts` — Pass `target.dataLinks` to SqlSeries
- `src/views/QueryEditor/QueryEditor.tsx` — Render `DataLinksSection` below query editor

---

### Task 1: Add DataLinkConfig type and extend CHQuery

**Files:**
- Create: `src/datasource/datalinks.ts`
- Modify: `src/types/types.ts`

- [ ] **Step 1: Create `src/datasource/datalinks.ts` with the type**

```typescript
import { DataLink } from '@grafana/data';
import { DatasourceMode } from '../types/types';

export interface DataLinkConfig {
  id: string;
  name: string;
  targetDatasourceUid: string;
  query: string;
  format: string;
}
```

- [ ] **Step 2: Add `dataLinks` to `CHQuery` in `src/types/types.ts`**

Add import at the top of the file:

```typescript
import { DataLinkConfig } from '../datasource/datalinks';
```

Add field to `CHQuery` interface after `useWindowFuncForMacros`:

```typescript
  dataLinks?: DataLinkConfig[];
```

- [ ] **Step 3: Commit**

```bash
git add src/datasource/datalinks.ts src/types/types.ts
git commit -m "feat(datalinks): add DataLinkConfig type and extend CHQuery"
```

---

### Task 2: Implement buildGrafanaDataLinks and write tests

**Files:**
- Modify: `src/datasource/datalinks.ts`
- Create: `src/spec/datalinks.test.ts`

- [ ] **Step 1: Write tests in `src/spec/datalinks.test.ts`**

```typescript
import { buildGrafanaDataLinks, DataLinkConfig } from '../datasource/datalinks';

describe('buildGrafanaDataLinks', () => {
  it('should return empty array for undefined input', () => {
    expect(buildGrafanaDataLinks(undefined)).toEqual([]);
  });

  it('should return empty array for empty array input', () => {
    expect(buildGrafanaDataLinks([])).toEqual([]);
  });

  it('should build a single data link with internal query', () => {
    const configs: DataLinkConfig[] = [
      {
        id: 'test-1',
        name: 'View Trace',
        targetDatasourceUid: 'ds-uid-123',
        query: "SELECT * FROM traces WHERE trace_id = '${__data.fields.trace_id}'",
        format: 'traces',
      },
    ];

    const result = buildGrafanaDataLinks(configs);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('View Trace');
    expect(result[0].url).toBe('');
    expect(result[0].internal).toBeDefined();
    expect(result[0].internal!.datasourceUid).toBe('ds-uid-123');
    expect(result[0].internal!.query).toMatchObject({
      query: "SELECT * FROM traces WHERE trace_id = '${__data.fields.trace_id}'",
      format: 'traces',
    });
  });

  it('should build multiple data links', () => {
    const configs: DataLinkConfig[] = [
      {
        id: 'test-1',
        name: 'View Logs',
        targetDatasourceUid: 'ds-1',
        query: 'SELECT * FROM logs',
        format: 'logs',
      },
      {
        id: 'test-2',
        name: 'View Metrics',
        targetDatasourceUid: 'ds-2',
        query: 'SELECT $timeSeries as t, count() FROM metrics GROUP BY t',
        format: 'time_series',
      },
    ];

    const result = buildGrafanaDataLinks(configs);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('View Logs');
    expect(result[1].title).toBe('View Metrics');
    expect(result[0].internal!.datasourceUid).toBe('ds-1');
    expect(result[1].internal!.datasourceUid).toBe('ds-2');
  });

  it('should set correct CHQuery defaults on internal query', () => {
    const configs: DataLinkConfig[] = [
      {
        id: 'test-1',
        name: 'Link',
        targetDatasourceUid: 'ds-1',
        query: 'SELECT 1',
        format: 'table',
      },
    ];

    const result = buildGrafanaDataLinks(configs);
    const internalQuery = result[0].internal!.query;

    expect(internalQuery.refId).toBe('datalink');
    expect(internalQuery.rawQuery).toBe('SELECT 1');
    expect(internalQuery.extrapolate).toBe(false);
    expect(internalQuery.adHocFilters).toEqual([]);
    expect(internalQuery.showHelp).toBe(false);
    expect(internalQuery.showFormattedSQL).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/spec/datalinks.test.ts`
Expected: FAIL — `buildGrafanaDataLinks` is not exported

- [ ] **Step 3: Implement `buildGrafanaDataLinks` in `src/datasource/datalinks.ts`**

Add the function to the existing file after the interface:

```typescript
export function buildGrafanaDataLinks(configs: DataLinkConfig[] | undefined): DataLink[] {
  if (!configs || configs.length === 0) {
    return [];
  }

  return configs.map((config) => ({
    title: config.name,
    url: '',
    internal: {
      datasourceUid: config.targetDatasourceUid,
      query: {
        refId: 'datalink',
        query: config.query,
        rawQuery: config.query,
        format: config.format,
        datasourceMode: DatasourceMode.Datasource,
        extrapolate: false,
        adHocFilters: [],
        showHelp: false,
        showFormattedSQL: false,
      },
    },
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/spec/datalinks.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/datasource/datalinks.ts src/spec/datalinks.test.ts
git commit -m "feat(datalinks): implement buildGrafanaDataLinks with tests"
```

---

### Task 3: Wire dataLinks through SqlSeries

**Files:**
- Modify: `src/datasource/sql-series/sql_series.ts`

- [ ] **Step 1: Add `dataLinks` property and constructor parameter**

In `sql_series.ts`, add import at the top:

```typescript
import { DataLinkConfig } from '../datalinks';
```

Add property to the `SqlSeries` class (after `to: any;`):

```typescript
  dataLinks?: DataLinkConfig[];
```

Add assignment in constructor (after `this.keys = options.keys || [];`):

```typescript
    this.dataLinks = options.dataLinks;
```

- [ ] **Step 2: Pass dataLinks to converter methods**

Update the method signatures to pass `dataLinks` through. Each method passes `self` (which now has `dataLinks`), so no changes are needed to method calls — converters will access `self.dataLinks` directly.

No code changes needed here — converters already receive `self` and can access `self.dataLinks`.

- [ ] **Step 3: Commit**

```bash
git add src/datasource/sql-series/sql_series.ts
git commit -m "feat(datalinks): wire dataLinks through SqlSeries"
```

---

### Task 4: Attach data links in format converters

**Files:**
- Modify: `src/datasource/sql-series/toLogs.ts`
- Modify: `src/datasource/sql-series/toTraces.ts`
- Modify: `src/datasource/sql-series/toTimeSeries.ts`
- Modify: `src/datasource/sql-series/toFlamegraph.ts`

- [ ] **Step 1: Add links to `toLogs.ts`**

Add import at the top of `src/datasource/sql-series/toLogs.ts`:

```typescript
import { buildGrafanaDataLinks } from '../datalinks';
```

After the `result` DataFrame is created (before `return [result]`), add:

```typescript
  const links = buildGrafanaDataLinks(self.dataLinks);
  if (links.length > 0) {
    result.fields.forEach((field) => {
      if (!field.config) {
        field.config = {};
      }
      field.config.links = [...(field.config.links || []), ...links];
    });
  }
```

- [ ] **Step 2: Add links to `toTraces.ts`**

Add import at the top of `src/datasource/sql-series/toTraces.ts`:

```typescript
import { buildGrafanaDataLinks } from '../datalinks';
import { DataLinkConfig } from '../datalinks';
```

Change function signature to accept dataLinks:

```typescript
export const toTraces = (series: Trace[], meta: any, dataLinks?: DataLinkConfig[]): TraceData[] => {
```

After building fields for each trace group (after the `for (const span of spans)` loop, before `results.push`), add:

```typescript
    const links = buildGrafanaDataLinks(dataLinks);
    if (links.length > 0) {
      Object.values(fields).forEach((field) => {
        field.config = { ...field.config, links: [...(field.config.links || []), ...links] };
      });
    }
```

Update `toTraces` call in `sql_series.ts`:

```typescript
  toTraces = (): any => {
    return toTraces(this.series, this.meta, this.dataLinks);
  };
```

- [ ] **Step 3: Add links to `toTimeSeries.ts`**

Add import at the top of `src/datasource/sql-series/toTimeSeries.ts`:

```typescript
import { buildGrafanaDataLinks } from '../datalinks';
import { DataLinkConfig } from '../datalinks';
```

Change function signature to accept dataLinks:

```typescript
export const toTimeSeries = (extrapolate = true, nullifySparse = false, self, dataLinks?: DataLinkConfig[]): any => {
```

In the `each(metrics, ...)` block where `timeSeries.push(...)` is called, replace the hardcoded `links: []` with data links:

```typescript
    const links = buildGrafanaDataLinks(dataLinks);

    timeSeries.push({
      length: processedDataPoints.length,
      fields: [
        { config: { links: [] }, name: 'time', type: 'time', values: processedDataPoints.map((v: any) => v[1]) },
        { config: { links }, name: seriesName, values: processedDataPoints.map((v: any) => v[0]) },
      ],
      refId: seriesName && self.refId ? `${self.refId} - ${seriesName}` : undefined,
    });
```

Note: links are only on value fields, not on the time field.

Update `toTimeSeries` call in `sql_series.ts`:

```typescript
  toTimeSeries = (extrapolate = true, nullifySparse = false): any => {
    let self = this;
    return toTimeSeries(extrapolate, nullifySparse, self, self.dataLinks);
  };
```

- [ ] **Step 4: Add links to `toFlamegraph.ts`**

Add import at the top of `src/datasource/sql-series/toFlamegraph.ts`:

```typescript
import { buildGrafanaDataLinks } from '../datalinks';
import { DataLinkConfig } from '../datalinks';
```

Change function signature:

```typescript
export const toFlamegraph = (inputSeries, dataLinks?: DataLinkConfig[]): any => {
```

In `transformTraceData`, after building the fields object and before `return`, add links to the label field:

```typescript
    const links = buildGrafanaDataLinks(dataLinks);
    if (links.length > 0) {
      fields.label.config = { ...fields.label.config, links };
    }
```

Update `toFlamegraph` call in `sql_series.ts`:

```typescript
  toFlamegraph = (): any => {
    return toFlamegraph(this.series, this.dataLinks);
  };
```

- [ ] **Step 5: Run existing tests to verify nothing is broken**

Run: `npx jest src/spec/sql_series_specs.jest.ts`
Expected: All existing tests PASS (dataLinks is optional, defaults to undefined)

- [ ] **Step 6: Commit**

```bash
git add src/datasource/sql-series/toLogs.ts src/datasource/sql-series/toTraces.ts src/datasource/sql-series/toTimeSeries.ts src/datasource/sql-series/toFlamegraph.ts src/datasource/sql-series/sql_series.ts
git commit -m "feat(datalinks): attach data links in format converters"
```

---

### Task 5: Pass dataLinks from query targets to SqlSeries in datasource.ts

**Files:**
- Modify: `src/datasource/datasource.ts`

- [ ] **Step 1: Update `processQueryResponse` to pass `dataLinks`**

In `src/datasource/datasource.ts`, in the `processQueryResponse` method, find the `SqlSeries` constructor call (around line 394). Add `dataLinks` to the options:

```typescript
      let sqlSeries = new SqlSeries({
        refId: target.refId,
        series: response.data,
        meta: response.meta,
        keys: keys,
        tillNow: options.rangeRaw?.to === 'now',
        from: convertTimestamp(options.range.from),
        to: convertTimestamp(options.range.to),
        dataLinks: target.dataLinks,
      });
```

- [ ] **Step 2: Commit**

```bash
git add src/datasource/datasource.ts
git commit -m "feat(datalinks): pass dataLinks from query target to SqlSeries"
```

---

### Task 6: Build UI components

**Files:**
- Create: `src/views/QueryEditor/components/DataLinks/DataLinkEditor.tsx`
- Create: `src/views/QueryEditor/components/DataLinks/DataLinksSection.tsx`

- [ ] **Step 1: Create `DataLinkEditor.tsx`**

```typescript
import React from 'react';
import { Button, CodeEditor, Field, Input, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { DataLinkConfig } from '../../../../datasource/datalinks';
import { FORMAT_OPTIONS } from '../QueryTextEditor/constants';

interface Props {
  dataLink: DataLinkConfig;
  datasources: Array<SelectableValue<string>>;
  onChange: (updated: DataLinkConfig) => void;
  onDelete: () => void;
}

export function DataLinkEditor({ dataLink, datasources, onChange, onDelete }: Props) {
  return (
    <div style={{ border: '1px solid var(--border-weak)', borderRadius: 4, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Field label="Name" style={{ flex: 1 }}>
          <Input
            value={dataLink.name}
            placeholder="e.g. View Trace"
            onChange={(e) => onChange({ ...dataLink, name: e.currentTarget.value })}
          />
        </Field>
        <Field label="Target datasource" style={{ flex: 1 }}>
          <Select
            options={datasources}
            value={dataLink.targetDatasourceUid}
            onChange={(v) => onChange({ ...dataLink, targetDatasourceUid: v.value || '' })}
            placeholder="Select datasource"
          />
        </Field>
        <Field label="Format" style={{ width: 150 }}>
          <Select
            options={FORMAT_OPTIONS}
            value={dataLink.format}
            onChange={(v) => onChange({ ...dataLink, format: v.value || 'table' })}
          />
        </Field>
      </div>
      <Field label="Query" description="Use ${__data.fields.fieldName} to reference values from the clicked row">
        <CodeEditor
          language="sql"
          height={100}
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

- [ ] **Step 2: Create `DataLinksSection.tsx`**

```typescript
import React, { useMemo } from 'react';
import { Button, CollapsableSection } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { DataLinkConfig } from '../../../../datasource/datalinks';
import { DataLinkEditor } from './DataLinkEditor';

interface Props {
  dataLinks: DataLinkConfig[];
  onChange: (dataLinks: DataLinkConfig[]) => void;
}

export function DataLinksSection({ dataLinks, onChange }: Props) {
  const datasources = useMemo<Array<SelectableValue<string>>>(() => {
    return getDataSourceSrv()
      .getList()
      .map((ds) => ({ label: ds.name, value: ds.uid, description: ds.type }));
  }, []);

  const onAdd = () => {
    const newLink: DataLinkConfig = {
      id: crypto.randomUUID(),
      name: '',
      targetDatasourceUid: '',
      query: '',
      format: 'table',
    };
    onChange([...dataLinks, newLink]);
  };

  const onUpdate = (index: number, updated: DataLinkConfig) => {
    const next = [...dataLinks];
    next[index] = updated;
    onChange(next);
  };

  const onDelete = (index: number) => {
    onChange(dataLinks.filter((_, i) => i !== index));
  };

  return (
    <CollapsableSection label={`Data Links (${dataLinks.length})`} isOpen={false}>
      {dataLinks.map((dl, i) => (
        <DataLinkEditor
          key={dl.id}
          dataLink={dl}
          datasources={datasources}
          onChange={(updated) => onUpdate(i, updated)}
          onDelete={() => onDelete(i)}
        />
      ))}
      <Button variant="secondary" size="sm" icon="plus" onClick={onAdd}>
        Add data link
      </Button>
    </CollapsableSection>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/views/QueryEditor/components/DataLinks/
git commit -m "feat(datalinks): add DataLinkEditor and DataLinksSection UI components"
```

---

### Task 7: Integrate DataLinksSection into QueryEditor

**Files:**
- Modify: `src/views/QueryEditor/QueryEditor.tsx`

- [ ] **Step 1: Add import and render DataLinksSection**

Add import at the top of `QueryEditor.tsx`:

```typescript
import { DataLinksSection } from './components/DataLinks/DataLinksSection';
```

In the `QueryEditor` function, after the closing of the `{editorMode === EditorMode.SQL && (...)}` block and before the closing `</>`, add:

```typescript
      <DataLinksSection
        dataLinks={initializedQuery.dataLinks || []}
        onChange={(dataLinks) => onChange({ ...initializedQuery, dataLinks })}
      />
```

- [ ] **Step 2: Commit**

```bash
git add src/views/QueryEditor/QueryEditor.tsx
git commit -m "feat(datalinks): integrate DataLinksSection into QueryEditor"
```

---

### Task 8: Add demo dashboard

**Files:**
- Create: `docker/grafana/dashboards/data_links_demo.json`

- [ ] **Step 1: Create dashboard JSON**

Create `docker/grafana/dashboards/data_links_demo.json` with a dashboard containing two panels:

1. **Time Series panel** — queries `$timeSeries as t, count() FROM system.query_log GROUP BY t` with a data link to "View as Logs" targeting the same datasource with format `logs`.

2. **Logs panel** — queries `SELECT event_time as timestamp, type as level, query as content, query_id FROM system.query_log ORDER BY event_time DESC LIMIT 100` with a data link to "View Query Details" targeting the same datasource with format `table` using `${__data.fields.query_id}`.

The dashboard should use the pre-configured test datasource UID `P7E099F39B84EA795`.

The `dataLinks` config is stored directly in the panel target's JSON, matching the `CHQuery` schema. Example target:

```json
{
  "refId": "A",
  "query": "SELECT ...",
  "format": "logs",
  "dataLinks": [
    {
      "id": "demo-link-1",
      "name": "View Query Details",
      "targetDatasourceUid": "P7E099F39B84EA795",
      "query": "SELECT * FROM system.query_log WHERE query_id = '${__data.fields.query_id}' LIMIT 10",
      "format": "table"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add docker/grafana/dashboards/data_links_demo.json
git commit -m "feat(datalinks): add demo dashboard"
```

---

### Task 9: Build, lint, and verify

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass, including new datalinks tests

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No new errors. If there are lint issues, fix them.

- [ ] **Step 3: Build frontend**

Run: `npm run build:frontend`
Expected: Build succeeds with no errors

- [ ] **Step 4: Manual verification (optional)**

Start dev environment and verify:

```bash
docker compose up --no-deps -d grafana clickhouse
```

1. Open Grafana at http://localhost:3000/
2. Open the "Data Links Demo" dashboard
3. Verify data links appear on log/time series panels
4. Click a data link — verify navigation works

- [ ] **Step 5: Commit any lint/build fixes**

```bash
git add -u
git commit -m "fix(datalinks): lint and build fixes"
```

---

## Known Limitations

- **Table format not supported** — `toTable()` returns legacy `{columns, rows}` format which doesn't support `field.config.links`. Requires separate refactoring to return DataFrames.
- **Target datasource assumed to be ClickHouse** — the internal query is built as a CHQuery object. Cross-datasource links (e.g., to Jaeger/Tempo) would need datasource-specific query objects.
- **No time shift** — omitted for simplicity. Can be added later as an optional field on `DataLinkConfig`.
