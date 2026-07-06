# Advanced Logs Field Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users control, per complex ClickHouse log field (Map/Array/Object/JSON), how it is presented in the Logs panel and how `+`/`-` filter clicks become valid SQL, via an "Advanced" modal in the logs query editor.

**Architecture:** A new optional `CHQuery.logsFieldConfig` (per-query, serialized in panel JSON) maps column name → mode (`expand`/`single`/`hide`/`raw`). `toLogs.ts` reads it (threaded through `SqlSeries`) to build labels/body. For filtering, the Go backend (`pkg/adhoc`) gains array-literal detection so `single`-mode array values produce `col = [...]`; `expand` already works via the subscript already present in the label key.

**Tech Stack:** TypeScript + React (`@grafana/ui`), Jest + React Testing Library (frontend); Go (backend), `go test` (backend).

## Global Constraints

- Backward compatibility is mandatory: with `logsFieldConfig` absent/empty, behavior must be **bit-for-bit identical** to today. All new branches are gated on config presence or complex-type defaults.
- Frontend test runner: `npm run test` (Jest). Lint: `npm run lint`.
- Backend tests: `go test ./pkg/adhoc/...` (run from repo root, requires `mage`/Go toolchain).
- Follow existing file/style conventions; do not restructure unrelated code.
- Commit after each task with a `feat:`/`test:`/`refactor:` prefixed message.

## Backend scope decision (read before Task 4)

The design spec proposed threading `logsFieldConfig` into the Go `ProcessAdhocFilters`. After reading the code (`pkg/resource_handlers.go` `Target` struct = `{Database, Table}` only; `ProcessAdhocFilters` has an existing test suite), this plan uses a **localized, lower-risk** approach instead:

- **`expand` mode** needs **no backend change** — the label key already carries the subscript (`col['k']`), and the current code emits `col['k'] = 'value'` correctly.
- **`single` array mode** is handled by **value-shape detection**: if a filter value is a well-formed JSON array, emit a ClickHouse array literal `col = [...]`. This is additive (only triggers on JSON-array values) and keeps every backend change inside `pkg/adhoc/adhoc_filters.go`.

**Deferred (known limitations, documented, not in MVP):**
- Type-dependent value quoting (e.g. `Map(String,String)` value `'200'` emitted unquoted) — the backend has no column-type info, so a correct fix needs the companion core/config work. Left as-is.
- Subscript key escaping for exotic Map keys containing `'`/`]`.

---

### Task 1: Field-mode types and `resolveFieldModes` helper

**Files:**
- Modify: `src/types/types.ts:33-67` (add types + `CHQuery.logsFieldConfig`)
- Create: `src/datasource/sql-series/logsFieldModes.ts`
- Test: `src/datasource/sql-series/logsFieldModes.test.ts`

**Interfaces:**
- Produces: `type LogsFieldMode = 'expand' | 'single' | 'hide' | 'raw'`; `interface LogsFieldConfigEntry { mode: LogsFieldMode }`; `CHQuery.logsFieldConfig?: Record<string, LogsFieldConfigEntry>`; `isComplexType(chType: string): boolean`; `defaultModeForType(chType: string): LogsFieldMode | undefined`; `resolveFieldModes(meta: Array<{name:string;type:string}>, logsFieldConfig?: Record<string, LogsFieldConfigEntry>): Record<string, LogsFieldMode>`.

- [ ] **Step 1: Add types to `src/types/types.ts`**

Add right above `export interface CHQuery extends DataQuery {` (line 33):

```ts
export type LogsFieldMode = 'expand' | 'single' | 'hide' | 'raw';

export interface LogsFieldConfigEntry {
  mode: LogsFieldMode;
}
```

Add this field inside `CHQuery`, right after the `adHocValuesQuery?: string;` line (line 58):

```ts
  logsFieldConfig?: Record<string, LogsFieldConfigEntry>;
```

- [ ] **Step 2: Write the failing test**

Create `src/datasource/sql-series/logsFieldModes.test.ts`:

```ts
import { isComplexType, defaultModeForType, resolveFieldModes } from './logsFieldModes';

describe('isComplexType', () => {
  it('detects complex ClickHouse types', () => {
    expect(isComplexType('Map(String, String)')).toBe(true);
    expect(isComplexType('Array(String)')).toBe(true);
    expect(isComplexType('Object(\'json\')')).toBe(true);
    expect(isComplexType('JSON')).toBe(true);
    expect(isComplexType('Nullable(Map(String, UInt8))')).toBe(true);
  });
  it('returns false for primitives', () => {
    expect(isComplexType('String')).toBe(false);
    expect(isComplexType('UInt64')).toBe(false);
    expect(isComplexType('DateTime64(3)')).toBe(false);
  });
});

describe('defaultModeForType', () => {
  it('maps Array to single and Map/Object/JSON to expand', () => {
    expect(defaultModeForType('Array(String)')).toBe('single');
    expect(defaultModeForType('Map(String, String)')).toBe('expand');
    expect(defaultModeForType('JSON')).toBe('expand');
  });
  it('returns undefined for primitives', () => {
    expect(defaultModeForType('String')).toBeUndefined();
  });
});

describe('resolveFieldModes', () => {
  const meta = [
    { name: 'ts', type: 'DateTime64(3)' },
    { name: '_map', type: 'Map(String, String)' },
    { name: '_arr', type: 'Array(String)' },
  ];
  it('applies type defaults for complex columns and omits primitives', () => {
    expect(resolveFieldModes(meta)).toEqual({ _map: 'expand', _arr: 'single' });
  });
  it('lets config override the default', () => {
    const cfg = { _map: { mode: 'hide' as const }, _arr: { mode: 'raw' as const } };
    expect(resolveFieldModes(meta, cfg)).toEqual({ _map: 'hide', _arr: 'raw' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- logsFieldModes`
Expected: FAIL — `Cannot find module './logsFieldModes'`.

- [ ] **Step 4: Implement `src/datasource/sql-series/logsFieldModes.ts`**

```ts
import { LogsFieldMode, LogsFieldConfigEntry } from '../../types/types';

const stripNullable = (chType: string): string => {
  let t = chType.trim();
  if (t.startsWith('Nullable(')) {
    t = t.slice('Nullable('.length, -1);
  }
  return t;
};

export const isComplexType = (chType: string): boolean =>
  /^(Map|Array|Tuple|Nested|Object|JSON)/i.test(stripNullable(chType));

export const defaultModeForType = (chType: string): LogsFieldMode | undefined => {
  const t = stripNullable(chType);
  if (/^Array/i.test(t)) {
    return 'single';
  }
  if (/^(Map|Object|JSON|Tuple|Nested)/i.test(t)) {
    return 'expand';
  }
  return undefined;
};

export const resolveFieldModes = (
  meta: Array<{ name: string; type: string }>,
  logsFieldConfig?: Record<string, LogsFieldConfigEntry>
): Record<string, LogsFieldMode> => {
  const result: Record<string, LogsFieldMode> = {};
  for (const col of meta || []) {
    const override = logsFieldConfig?.[col.name]?.mode;
    if (override) {
      result[col.name] = override;
      continue;
    }
    const def = defaultModeForType(col.type);
    if (def) {
      result[col.name] = def;
    }
  }
  return result;
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- logsFieldModes`
Expected: PASS (all describe blocks green).

- [ ] **Step 6: Commit**

```bash
git add src/types/types.ts src/datasource/sql-series/logsFieldModes.ts src/datasource/sql-series/logsFieldModes.test.ts
git commit -m "feat: add logsFieldConfig types and resolveFieldModes helper"
```

---

### Task 2: Apply field modes in `toLogs`

**Files:**
- Modify: `src/datasource/sql-series/sql_series.ts:108-126` (thread `logsFieldConfig` through `SqlSeries`)
- Modify: `src/datasource/datasource.ts:396-404` (pass `target.logsFieldConfig`)
- Modify: `src/datasource/sql-series/toLogs.ts:86-196` (route columns by mode)
- Test: `src/datasource/sql-series/toLogs.test.ts` (extend)

**Interfaces:**
- Consumes: `resolveFieldModes`, `LogsFieldConfigEntry` from Task 1.
- Produces: `toLogs` honoring `self.logsFieldConfig`; `SqlSeries` accepting `options.logsFieldConfig`.

- [ ] **Step 1: Thread config through `SqlSeries`**

In `src/datasource/sql-series/sql_series.ts`, add the field to the class (after `keys: any;`, line 111):

```ts
  logsFieldConfig: any;
```

In the constructor (after `this.keys = options.keys || [];`, line 125):

```ts
    this.logsFieldConfig = options.logsFieldConfig;
```

- [ ] **Step 2: Pass config from the datasource**

In `src/datasource/datasource.ts`, inside `processQueryResponse` where `SqlSeries` is created (line 396-404), add `logsFieldConfig` to the options object:

```ts
      let sqlSeries = new SqlSeries({
        refId: target.refId,
        series: response.data,
        meta: response.meta,
        keys: keys,
        tillNow: options.rangeRaw?.to === 'now',
        from: convertTimestamp(options.range.from),
        to: convertTimestamp(options.range.to),
        logsFieldConfig: target.logsFieldConfig,
      });
```

- [ ] **Step 3: Write the failing tests (extend `toLogs.test.ts`)**

Append to `src/datasource/sql-series/toLogs.test.ts`:

```ts
describe('toLogs with logsFieldConfig modes', () => {
  const baseSelf = (logsFieldConfig?: any) => ({
    refId: 'A',
    meta: [
      { name: 'ts', type: 'DateTime64(3)' },
      { name: 'content', type: 'String' },
      { name: '_map', type: 'Map(String, String)' },
      { name: '_arr', type: 'Array(String)' },
    ],
    series: [
      {
        ts: '2023-01-01 10:00:00',
        content: 'msg',
        _map: { host: 'web1', env: 'prod' },
        _arr: ['a', 'b'],
      },
    ],
    logsFieldConfig,
  });

  const labelsOf = (frames: any[]) =>
    frames[0].fields.find((f: any) => f.name === 'labels')?.values[0] ?? {};
  const bodyOf = (frames: any[]) =>
    frames[0].fields.find((f: any) => f.name === 'body')?.values[0] ?? '';

  it('expand splits a Map into per-key labels (default for Map)', () => {
    const frames = toLogs(baseSelf());
    const labels = labelsOf(frames);
    expect(labels["_map['host']"]).toBe('web1');
    expect(labels["_map['env']"]).toBe('prod');
  });

  it('single keeps a single stringified label (default for Array)', () => {
    const labels = labelsOf(toLogs(baseSelf()));
    expect(labels['_arr']).toBe(JSON.stringify(['a', 'b']));
  });

  it('hide removes the field from labels', () => {
    const labels = labelsOf(toLogs(baseSelf({ _map: { mode: 'hide' } })));
    expect(labels["_map['host']"]).toBeUndefined();
    expect(labels['_map']).toBeUndefined();
  });

  it('raw appends the value to the body and is not a label', () => {
    const frames = toLogs(baseSelf({ _map: { mode: 'raw' } }));
    expect(labelsOf(frames)["_map['host']"]).toBeUndefined();
    expect(bodyOf(frames)).toContain('_map=');
    expect(bodyOf(frames)).toContain('web1');
  });
});
```

(Add `import { toLogs } from './toLogs';` at the top of the test file if not already present.)

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm run test -- toLogs`
Expected: FAIL — `hide`/`raw`/`single` assertions fail (current code flattens everything and ignores config).

- [ ] **Step 5: Implement mode routing in `toLogs.ts`**

At the top of `src/datasource/sql-series/toLogs.ts`, add the import:

```ts
import { resolveFieldModes } from './logsFieldModes';
```

Inside `toLogs`, after `const reservedFields = [...]` (line 87) and the empty-series guard, compute modes:

```ts
  const fieldModes = resolveFieldModes(self.meta || [], self.logsFieldConfig);
```

Replace the label-classification loop (lines 108-116) so `hide`/`raw` columns are excluded from `labelFields`:

```ts
  each(self.meta, function (col: any, index: number) {
    let type = _toFieldType(col.type, index);
    const mode = fieldModes[col.name];

    const isLabelCandidate =
      (type === FieldType.number || type === FieldType.string) &&
      col.name !== messageField &&
      !reservedFields.includes(col.name);

    if (isLabelCandidate && mode !== 'hide' && mode !== 'raw') {
      labelFields.push(col.name);
    }

    types[col.name] = type;
  });

  const rawFields = (self.meta || [])
    .map((c: any) => c.name)
    .filter((name: string) => fieldModes[name] === 'raw');
```

Replace the per-row label building (lines 128-133) with mode-aware building:

```ts
  each(self.series, function (ser: any) {
    const labels: any = {};
    for (const key of labelFields) {
      const value = ser[key];
      const mode = fieldModes[key];
      if (mode === 'single') {
        labels[key] = value && typeof value === 'object' ? JSON.stringify(value) : value;
      } else if (mode === 'expand') {
        Object.assign(labels, transformObject({ [key]: value }));
      } else {
        labels[key] = value;
      }
    }

    if (Object.keys(labels).length > 0) {
      labelFieldsList.push(labels);
    }
```

Keep the rest of the per-row loop, but build a raw suffix and append it to the message value. Replace the `data` push block (lines 142-155) with:

```ts
    let rawSuffix = '';
    for (const rawName of rawFields) {
      const v = ser[rawName];
      rawSuffix += ` ${rawName}=${v && typeof v === 'object' ? JSON.stringify(v) : v}`;
    }

    Object.entries(data)?.forEach(([key, value]) => {
      let outValue: any = value;
      if (key === messageField && rawSuffix) {
        outValue = `${value}${rawSuffix}`;
      }
      if (
        types[key] &&
        types[key] instanceof Object &&
        'fieldType' in types[key] &&
        types[key].fieldType === FieldType.time
      ) {
        timestampKey = key;
        dataObjectValues[key].values.push(convertTimezonedDateToUTC(value, types[key].timezone));
      } else {
        dataObjectValues[key].values.push(outValue);
      }
    });
  });
```

(The `timestampObject`/`timestampKey` lines at 139-140 stay as they are, immediately before this `forEach`.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- toLogs`
Expected: PASS — all new mode tests plus the existing `toLogs` tests.

- [ ] **Step 7: Commit**

```bash
git add src/datasource/sql-series/sql_series.ts src/datasource/datasource.ts src/datasource/sql-series/toLogs.ts src/datasource/sql-series/toLogs.test.ts
git commit -m "feat: apply logsFieldConfig modes (expand/single/hide/raw) in toLogs"
```

---

### Task 3: "Advanced" modal in the logs query editor

**Files:**
- Create: `src/views/QueryEditor/components/QueryTextEditor/components/AdvancedLogsFields/AdvancedLogsFieldsModal.tsx`
- Create: `src/views/QueryEditor/components/QueryTextEditor/components/AdvancedLogsFields/AdvancedLogsFieldsModal.test.tsx`
- Modify: `src/views/QueryEditor/components/QueryTextEditor/QueryTextEditor.tsx:130-135` (add the button + modal)

**Interfaces:**
- Consumes: `LogsFieldMode`, `LogsFieldConfigEntry`, `CHQuery` (Task 1); `isComplexType`, `defaultModeForType` (Task 1); `query.logsFieldConfig`; the existing `onFieldChange({ fieldName, value })` handler used throughout `QueryTextEditor`.
- Produces: `AdvancedLogsFieldsModal` React component.

- [ ] **Step 1: Write the failing component test**

Create `.../AdvancedLogsFields/AdvancedLogsFieldsModal.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedLogsFieldsModal } from './AdvancedLogsFieldsModal';

const datasource: any = {
  metricFindQuery: jest.fn().mockResolvedValue([
    { text: '_map', value: 'Map(String, String)' },
    { text: '_arr', value: 'Array(String)' },
    { text: 'content', value: 'String' },
  ]),
};

const baseQuery: any = {
  refId: 'A',
  format: 'logs',
  database: 'default',
  table: 'logs',
  logsFieldConfig: {},
};

it('lists complex columns and saves chosen modes', async () => {
  const onChange = jest.fn();
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={onChange}
    />
  );

  // complex columns appear, primitive column does not
  expect(await screen.findByText('_map')).toBeInTheDocument();
  expect(screen.getByText('_arr')).toBeInTheDocument();
  expect(screen.queryByText('content')).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('Save'));
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      logsFieldConfig: expect.objectContaining({
        _map: { mode: 'expand' },
        _arr: { mode: 'single' },
      }),
    })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- AdvancedLogsFieldsModal`
Expected: FAIL — `Cannot find module './AdvancedLogsFieldsModal'`.

- [ ] **Step 3: Implement the modal**

Create `.../AdvancedLogsFields/AdvancedLogsFieldsModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Button, Modal, RadioButtonGroup } from '@grafana/ui';
import { CHQuery, LogsFieldConfigEntry, LogsFieldMode } from '../../../../../../types/types';
import { isComplexType, defaultModeForType } from '../../../../../../datasource/sql-series/logsFieldModes';

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
  query: CHQuery;
  datasource: any;
  onChange: (query: CHQuery) => void;
}

const MODE_OPTIONS: Array<{ label: string; value: LogsFieldMode }> = [
  { label: 'Expand', value: 'expand' },
  { label: 'Single', value: 'single' },
  { label: 'Hide', value: 'hide' },
  { label: 'Raw (body)', value: 'raw' },
];

export const AdvancedLogsFieldsModal: React.FC<Props> = ({ isOpen, onDismiss, query, datasource, onChange }) => {
  const [columns, setColumns] = useState<Array<{ name: string; type: string }>>([]);
  const [config, setConfig] = useState<Record<string, LogsFieldConfigEntry>>(query.logsFieldConfig || {});

  useEffect(() => {
    if (!isOpen || !query.database || !query.table) {
      return;
    }
    const sql = `SELECT name, type FROM system.columns WHERE database = '${query.database}' AND table = '${query.table}' ORDER BY position`;
    datasource
      .metricFindQuery(sql)
      .then((rows: any[]) => {
        const parsed = (rows || []).map((r) => ({
          name: r.text ?? r.name,
          type: String(r.value ?? r.type ?? ''),
        }));
        setColumns(parsed.filter((c) => isComplexType(c.type)));
      })
      .catch(() => setColumns([]));
  }, [isOpen, query.database, query.table, datasource]);

  const modeFor = (col: { name: string; type: string }): LogsFieldMode =>
    config[col.name]?.mode ?? defaultModeForType(col.type) ?? 'expand';

  const setMode = (name: string, mode: LogsFieldMode) =>
    setConfig((prev) => ({ ...prev, [name]: { mode } }));

  const save = () => {
    onChange({ ...query, logsFieldConfig: config });
    onDismiss();
  };

  return (
    <Modal title="Advanced logs fields" isOpen={isOpen} onDismiss={onDismiss} onClickBackdrop={onDismiss}>
      {columns.length === 0 && <div>No complex fields detected (set database and table).</div>}
      {columns.map((col) => (
        <div key={col.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ minWidth: 220 }}>
            <strong>{col.name}</strong> <span style={{ opacity: 0.7 }}>{col.type}</span>
          </div>
          <RadioButtonGroup
            options={MODE_OPTIONS}
            value={modeFor(col)}
            onChange={(v) => setMode(col.name, v as LogsFieldMode)}
          />
        </div>
      ))}
      <Modal.ButtonRow>
        <Button variant="secondary" onClick={onDismiss}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save}>
          Save
        </Button>
      </Modal.ButtonRow>
    </Modal>
  );
};
```

Note: the test mocks columns with default modes only (no `config` override), so the modal must seed each unset column with its type default when saving. Adjust `save` to materialize defaults:

```ts
  const save = () => {
    const merged: Record<string, LogsFieldConfigEntry> = { ...config };
    for (const col of columns) {
      if (!merged[col.name]) {
        merged[col.name] = { mode: modeFor(col) };
      }
    }
    onChange({ ...query, logsFieldConfig: merged });
    onDismiss();
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- AdvancedLogsFieldsModal`
Expected: PASS.

- [ ] **Step 5: Wire the button into `QueryTextEditor.tsx`**

Add the import near the top of `src/views/QueryEditor/components/QueryTextEditor/QueryTextEditor.tsx`:

```ts
import { Button } from '@grafana/ui';
import { AdvancedLogsFieldsModal } from './components/AdvancedLogsFields/AdvancedLogsFieldsModal';
```

Add modal state inside the component (after `const handlers = useQueryHandlers(...)`, line 41):

```ts
  const [advancedOpen, setAdvancedOpen] = useState(false);
```

Replace the logs branch (lines 130-135) with the existing select plus the Advanced button and modal:

```tsx
          {query.format === 'logs' && (
            <>
              <ContextWindowSizeSelect
                query={query}
                onChange={(e: any) => handlers.handleContextWindowChange(e.value)}
              />
              <Button variant="secondary" size="sm" onClick={() => setAdvancedOpen(true)}>
                Advanced
              </Button>
              <AdvancedLogsFieldsModal
                isOpen={advancedOpen}
                onDismiss={() => setAdvancedOpen(false)}
                query={query}
                datasource={datasource}
                onChange={(updated) => onFieldChange({ fieldName: 'logsFieldConfig', value: updated.logsFieldConfig })}
              />
            </>
          )}
```

(`useState` is already imported on line 1.)

- [ ] **Step 6: Run the full frontend suite + lint**

Run: `npm run test -- AdvancedLogsFieldsModal logsFieldModes toLogs`
Expected: PASS.
Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/views/QueryEditor/components/QueryTextEditor/components/AdvancedLogsFields/ src/views/QueryEditor/components/QueryTextEditor/QueryTextEditor.tsx
git commit -m "feat: Advanced logs fields modal in the logs query editor"
```

---

### Task 4: Backend — array-literal predicate for `single` mode

**Files:**
- Modify: `pkg/adhoc/adhoc_filters.go:54-79` (value formatting)
- Test: `pkg/adhoc/adhoc_filters_test.go` (add cases)

**Interfaces:**
- Consumes: nothing new (signature unchanged — additive behavior).
- Produces: a `formatAdhocValue(v interface{}) string` helper and array-literal emission inside `ProcessAdhocFilters`.

- [ ] **Step 1: Write the failing test**

Append to `pkg/adhoc/adhoc_filters_test.go`:

```go
func TestProcessAdhocFilters_ArrayLiteral(t *testing.T) {
	tests := []struct {
		name     string
		filter   AdhocFilter
		expected string
	}{
		{
			name:     "json string array becomes ClickHouse array literal",
			filter:   AdhocFilter{Key: "_arr", Operator: "=", Value: `["a","b"]`},
			expected: "_arr = ['a', 'b']",
		},
		{
			name:     "json numeric array stays unquoted",
			filter:   AdhocFilter{Key: "_arr", Operator: "=", Value: `[1,2,3]`},
			expected: "_arr = [1, 2, 3]",
		},
		{
			name:     "not-equals on array",
			filter:   AdhocFilter{Key: "_arr", Operator: "!=", Value: `["a"]`},
			expected: "_arr != ['a']",
		},
		{
			name:     "expand subscript scalar is unaffected",
			filter:   AdhocFilter{Key: "_map['host']", Operator: "=", Value: "web1"},
			expected: "_map['host'] = 'web1'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ProcessAdhocFilters([]AdhocFilter{tt.filter}, "default", "test_grafana")
			if len(result) != 1 || result[0] != tt.expected {
				t.Errorf("got %v, want [%q]", result, tt.expected)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./pkg/adhoc/ -run TestProcessAdhocFilters_ArrayLiteral -v`
Expected: FAIL — array values are emitted as quoted/raw strings, not `['a', 'b']`.

- [ ] **Step 3: Implement array detection in `adhoc_filters.go`**

Add `encoding/json` to the imports:

```go
import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)
```

Add a helper above `ProcessAdhocFilters`:

```go
// formatAdhocScalar quotes a scalar value for SQL, matching legacy behavior.
func formatAdhocScalar(v interface{}) string {
	switch val := v.(type) {
	case float64:
		return fmt.Sprintf("%g", val)
	case string:
		if regexp.MustCompile(`^\s*\d+(\.\d+)?\s*$`).MatchString(val) ||
			strings.Contains(val, "'") ||
			strings.Contains(val, ", ") {
			return val
		}
		escaped := strings.ReplaceAll(val, "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	default:
		str := fmt.Sprintf("%v", val)
		escaped := strings.ReplaceAll(str, "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	}
}

// tryArrayLiteral converts a JSON-array string into a ClickHouse array literal.
// Returns ("", false) if v is not a JSON array.
func tryArrayLiteral(v interface{}) (string, bool) {
	s, ok := v.(string)
	if !ok {
		return "", false
	}
	trimmed := strings.TrimSpace(s)
	if !strings.HasPrefix(trimmed, "[") {
		return "", false
	}
	var elems []interface{}
	if err := json.Unmarshal([]byte(trimmed), &elems); err != nil {
		return "", false
	}
	parts := make([]string, 0, len(elems))
	for _, e := range elems {
		switch ev := e.(type) {
		case string:
			parts = append(parts, fmt.Sprintf("'%s'", strings.ReplaceAll(ev, "'", "''")))
		case float64:
			parts = append(parts, fmt.Sprintf("%g", ev))
		case bool:
			parts = append(parts, fmt.Sprintf("%t", ev))
		default:
			parts = append(parts, fmt.Sprintf("'%v'", ev))
		}
	}
	return "[" + strings.Join(parts, ", ") + "]", true
}
```

Replace the value-formatting block (lines 54-75) so it tries the array literal first:

```go
		// Format value: array literal for JSON arrays, else scalar quoting
		var value string
		if lit, ok := tryArrayLiteral(filter.Value); ok {
			value = lit
		} else {
			value = formatAdhocScalar(filter.Value)
		}
```

The `condition := fmt.Sprintf("%s %s %s", parts[2], operator, value)` line (78) stays unchanged.

- [ ] **Step 4: Run the new test + the full adhoc suite**

Run: `go test ./pkg/adhoc/ -run TestProcessAdhocFilters_ArrayLiteral -v`
Expected: PASS.
Run: `go test ./pkg/adhoc/...`
Expected: PASS — all pre-existing tests still green (array detection only triggers on JSON-array string values, which no existing test uses).

- [ ] **Step 5: Commit**

```bash
git add pkg/adhoc/adhoc_filters.go pkg/adhoc/adhoc_filters_test.go
git commit -m "feat: emit ClickHouse array literal for single-mode array adhoc filters"
```

---

## Self-Review

**Spec coverage:**
- Data model `CHQuery.logsFieldConfig` → Task 1. ✓
- Four modes `expand`/`single`/`hide`/`raw` → Task 1 (resolve) + Task 2 (apply). ✓
- Array `single` = whole-array equality → Task 4 (`col = [...]`). ✓
- Modal UI + introspection + Save → Task 3. ✓
- Backward compatible default → Tasks 1/2 (modes only for complex/config; absent config = current path). ✓
- Backend predicate for filtering → Task 4 (array literal; expand already valid). ✓
- **Divergences from spec (intentional, documented above):** backend uses value-shape array detection instead of threading `logsFieldConfig`; type-dependent value quoting and subscript key escaping are deferred as known limitations. The `raw` body-append is implemented as specified, pending the runtime spike (whether a non-label field shows buttons); if the spike says non-label fields are button-free, a follow-up can switch `raw` to a separate non-filterable field.
- Mode-aware values dropdown (secondary in spec) is **not** in this plan — logged here as deferred.

**Placeholder scan:** No TBD/TODO; every code step has complete code and a concrete run command.

**Type consistency:** `LogsFieldMode`, `LogsFieldConfigEntry`, `logsFieldConfig`, `resolveFieldModes`, `isComplexType`, `defaultModeForType` are used identically across Tasks 1–3. `AdvancedLogsFieldsModal` prop names (`isOpen`, `onDismiss`, `query`, `datasource`, `onChange`) match between its definition (Task 3 Step 3) and its usage (Task 3 Step 5).

## Deferred / follow-up (not in this plan)
- Mode-aware DISTINCT values query in `src/datasource/adhoc.ts` (`expand` → `col['k']`, `single` → `arrayJoin(col)`).
- Type-dependent value quoting fix and subscript key escaping in the backend.
- Recursive `expand` with depth/breadth caps (currently first-level only).
- Companion Grafana core hook (`isFilterLabelSupported`) for "shown as label, buttons hidden".
