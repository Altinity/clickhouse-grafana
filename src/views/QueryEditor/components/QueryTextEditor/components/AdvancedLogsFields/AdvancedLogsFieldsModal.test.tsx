/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Mock @grafana/ui to avoid ESM-only transitive dependency issues in Jest
jest.mock('@grafana/ui', () => {
  const ModalFn: React.FC<any> = ({ isOpen, children }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null;
  (ModalFn as any).ButtonRow = ({ children }: any) => <div>{children}</div>;

  return {
    Modal: ModalFn,
    Button: ({ children, onClick, disabled }: any) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    ToolbarButton: ({ onClick, children }: any) => <button onClick={onClick}>{children}</button>,
    // Each RadioButtonGroup renders as a <div> whose children are <button>
    // elements labeled by option.label.  Mode options use word labels
    // (Expand/Hide/Raw (body)/Single) while depth options use digit labels
    // (1/2/3/4/All).  Tests distinguish the two by index in
    // getAllByTestId('radio-group'); within() scopes option lookups to the
    // correct group.
    RadioButtonGroup: ({ options, onChange }: any) => (
      <div data-testid="radio-group">
        {options.map((opt: any) => (
          <button key={opt.value} onClick={() => onChange(opt.value)}>
            {opt.label}
          </button>
        ))}
      </div>
    ),
    useStyles2: (fn: any) => fn(jest.requireActual('@grafana/data').createTheme()),
  };
});

import { AdvancedLogsFieldsModal } from './AdvancedLogsFieldsModal';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

// New sample-query shape: ONE row object keyed by column name (alias), each
// value a JSON-encoded string (the result of toJSONString(...) per column).
const sampleRow = {
  _map: JSON.stringify({ host: 'web1', env: 'prod' }),
  _arr: JSON.stringify(['a', 'b']),
  nested_attrs: JSON.stringify({ http: { method: 'GET' } }),
  // deep column: three levels of nesting
  deep3: JSON.stringify({ app: { http: { method: 'POST', status: '500' } } }),
};

const datasource: any = {
  metricFindQuery: jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('system.columns')) {
      return Promise.resolve([
        { text: '_map', value: 'Map(String, String)' },
        { text: '_arr', value: 'Array(String)' },
        { text: 'content', value: 'String' },
        { name: 'nested_attrs', value: 'Map(String, Map(String, String))' },
        { name: 'deep3', value: 'Map(String, Map(String, Map(String, String)))' },
      ]);
    }
    // sample query — single row keyed by column alias
    return Promise.resolve([sampleRow]);
  }),
};

const baseQuery: any = {
  refId: 'A',
  format: 'logs',
  database: 'default',
  table: 'logs',
  logsFieldConfig: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
  // _arr appears in multiple places (field name span + preview key span)
  expect(screen.getAllByText('_arr').length).toBeGreaterThan(0);
  expect(screen.queryByText('content')).not.toBeInTheDocument();

  // Save is disabled until something changes (UX2 dirty-state Save) — touch a
  // field (re-selecting its own default mode) to mark the config dirty.
  const mapCard = screen.getByTestId('field-card-_map');
  fireEvent.click(within(mapCard).getByText('Expand'));

  await waitFor(() => {
    expect(screen.getByText('Save').closest('button')).not.toBeDisabled();
  });
  fireEvent.click(screen.getByText('Save'));

  // expand columns carry depth; single/hide/raw do not.
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      _map: { mode: 'expand', depth: 1 },
      _arr: { mode: 'single' },
    })
  );
});

it('shows live preview for complex columns after sample is loaded', async () => {
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  // Wait for columns to appear first
  expect(await screen.findByText('_map')).toBeInTheDocument();

  // _map is in 'expand' mode by default.  The tree renderer surfaces the
  // top-level keys as individual spans — check for the key 'host' and its
  // value 'web1' as separate elements.
  expect(await screen.findByText('host')).toBeInTheDocument();
  expect(await screen.findByText('web1')).toBeInTheDocument();

  // _arr is in 'single' mode by default; the preview shows _arr = ["a","b"]
  // — the value span contains the JSON string.
  expect(await screen.findByText('["a","b"]')).toBeInTheDocument();
});

it('renders deep-expand preview for nested map columns', async () => {
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  // Wait for columns (including nested_attrs) to appear
  expect(await screen.findByText('nested_attrs')).toBeInTheDocument();

  // Default depth is 1 (legacy-compatible) — deep expansion is an explicit
  // opt-in: pick depth 3 on the nested_attrs card first.
  const nestedCard = screen.getByTestId('field-card-nested_attrs');
  const nestedGroups = within(nestedCard).getAllByTestId('radio-group');
  fireEvent.click(within(nestedGroups[1]).getByText('3'));

  // nested_attrs is Map(String, Map(String, String)) — the tree renderer
  // shows 'http' as a branch node and 'method'/'GET' as leaf nodes.
  // 'http' and 'method' also appear in deep3's preview so use getAllByText.
  expect((await screen.findAllByText('http')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('method').length).toBeGreaterThan(0);
  // 'GET' is unique to nested_attrs (deep3 uses 'POST').
  expect(await screen.findByText('GET')).toBeInTheDocument();
});

it('updates preview when mode is changed', async () => {
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  // Wait for columns to appear
  expect(await screen.findByText('_map')).toBeInTheDocument();

  // Wait for the tree preview to render — 'host' is a top-level key of _map
  expect(await screen.findByText('host')).toBeInTheDocument();

  // Scope to the _map field card; _map is Map(String,String) — flat, so only the mode
  // radio group is rendered (no depth group).  Click 'Hide' within that card.
  const mapCard = screen.getByTestId('field-card-_map');
  fireEvent.click(within(mapCard).getByText('Hide'));

  // After switching to hide, the preview should say "hidden"
  expect(await screen.findByText(/hidden/i)).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// NEW: Tree preview for the deep3 column
// ---------------------------------------------------------------------------

it('shows tree-style preview for the deep3 column', async () => {
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  // Wait for deep3 card to appear
  expect(await screen.findByText('deep3')).toBeInTheDocument();

  // Default depth is 1 — opt into depth 3 to see the full tree.
  const deep3TreeCard = screen.getByTestId('field-card-deep3');
  const deep3TreeGroups = within(deep3TreeCard).getAllByTestId('radio-group');
  fireEvent.click(within(deep3TreeGroups[1]).getByText('3'));

  // Sample: { app: { http: { method: 'POST', status: '500' } } } at depth 3.
  // Tree (no root label — col.name already shown in card header):
  //   app  (branch)
  //     http  (branch)
  //       method = POST  (leaf)
  //       status = 500   (leaf)
  expect(await screen.findByText('app')).toBeInTheDocument();
  // 'http' also appears in nested_attrs preview; just verify at least one exists
  expect(screen.getAllByText('http').length).toBeGreaterThan(0);
  // 'method' also appears in nested_attrs (method=GET); verify at least one exists
  expect(screen.getAllByText('method').length).toBeGreaterThan(0);
  // 'POST' is unique to deep3 (nested_attrs uses 'GET')
  expect(await screen.findByText('POST')).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// NEW: Depth selector presence
// ---------------------------------------------------------------------------

it('shows depth selector for expand columns and omits it for single-mode columns', async () => {
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  await screen.findByText('_map'); // wait for all columns

  // Each field renders inside a card identified by data-testid="field-card-<name>".
  // Scoping per-card avoids brittle global radio-group index arithmetic.

  // _map is Map(String, String) — flat, no nesting — depth selector must be absent.
  // Only the mode group should exist inside the card.
  const mapCard = screen.getByTestId('field-card-_map');
  const mapGroups = within(mapCard).getAllByTestId('radio-group');
  expect(mapGroups).toHaveLength(1); // mode only, no depth
  const mapModeLabels = Array.from(mapGroups[0].querySelectorAll('button')).map((b) => b.textContent);
  expect(mapModeLabels).not.toContain('1');
  expect(mapModeLabels).not.toContain('All');

  // _arr is Array(String) — single mode — depth selector must be absent.
  const arrCard = screen.getByTestId('field-card-_arr');
  const arrGroups = within(arrCard).getAllByTestId('radio-group');
  expect(arrGroups).toHaveLength(1); // mode only
  const arrModeLabels = Array.from(arrGroups[0].querySelectorAll('button')).map((b) => b.textContent);
  expect(arrModeLabels).not.toContain('1');
  expect(arrModeLabels).not.toContain('All');

  // nested_attrs is Map(String, Map(String, String)) — has nesting — depth selector must appear.
  const nestedCard = screen.getByTestId('field-card-nested_attrs');
  const nestedGroups = within(nestedCard).getAllByTestId('radio-group');
  expect(nestedGroups).toHaveLength(2); // mode + depth
  const nestedDepthLabels = Array.from(nestedGroups[1].querySelectorAll('button')).map((b) => b.textContent);
  expect(nestedDepthLabels).toContain('1');
  expect(nestedDepthLabels).toContain('All');
});

// ---------------------------------------------------------------------------
// NEW: Depth change updates the preview
// ---------------------------------------------------------------------------

it('changing depth expands the collapsed default preview', async () => {
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  // Wait for the deep3 card; at the DEFAULT depth 1 the nested object is
  // collapsed into a stringified leaf — 'POST' is not a standalone text node.
  expect(await screen.findByText('deep3')).toBeInTheDocument();
  expect(screen.queryByText('POST')).not.toBeInTheDocument();

  // Scope to the deep3 card; deep3 is Map(String,Map(String,Map(String,String))) — nested.
  // Its card has two radio groups: [0] = mode, [1] = depth.
  const deep3Card = screen.getByTestId('field-card-deep3');
  const deep3Groups = within(deep3Card).getAllByTestId('radio-group');
  fireEvent.click(within(deep3Groups[1]).getByText('3'));

  // After depth = 3 the tree expands and 'POST' appears as a leaf value.
  expect(await screen.findByText('POST')).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// NEW: Dynamic / Variant columns appear as single-mode configurable fields
// ---------------------------------------------------------------------------

it('shows Variant column in modal with Single mode (not Expand) and no depth selector', async () => {
  // Local datasource mock that includes a Variant(UInt64, String) column alongside
  // a Map column (so we can verify the contrast: Map gets Expand, Variant gets Single).
  // Two complex columns => sample query returns one row keyed by column alias.
  const variantSampleRow = {
    _map: JSON.stringify({ host: 'web1', env: 'prod' }),
    variant_col: JSON.stringify('42'),
  };

  const datasourceWithVariant: any = {
    metricFindQuery: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('system.columns')) {
        return Promise.resolve([
          { text: '_map', value: 'Map(String, String)' },
          { text: 'variant_col', value: 'Variant(UInt64, String)' },
          { text: 'plain_str', value: 'String' }, // primitive — must NOT appear
        ]);
      }
      return Promise.resolve([variantSampleRow]);
    }),
  };

  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasourceWithVariant}
      onChange={() => {}}
    />
  );

  // Wait for columns to load (variant_col appears in card header + single-mode preview)
  expect((await screen.findAllByText('variant_col')).length).toBeGreaterThan(0);

  // Primitive column must NOT appear
  expect(screen.queryByText('plain_str')).not.toBeInTheDocument();

  // Variant column card should be present
  const variantCard = screen.getByTestId('field-card-variant_col');

  // Mode radio group: should have "Single" button, NOT "Expand" button
  const variantGroups = within(variantCard).getAllByTestId('radio-group');
  expect(variantGroups).toHaveLength(1); // mode only — no depth selector
  const modeLabels = Array.from(variantGroups[0].querySelectorAll('button')).map((b) => b.textContent);
  expect(modeLabels).toContain('Single');
  expect(modeLabels).not.toContain('Expand');

  // Depth selector must be absent (no nesting for Variant)
  expect(within(variantCard).queryByText('1')).not.toBeInTheDocument();
  expect(within(variantCard).queryByText('All')).not.toBeInTheDocument();

  // Map column still gets Expand (regression: contrast check)
  const mapCard = screen.getByTestId('field-card-_map');
  const mapGroups = within(mapCard).getAllByTestId('radio-group');
  const mapModeLabels = Array.from(mapGroups[0].querySelectorAll('button')).map((b) => b.textContent);
  expect(mapModeLabels).toContain('Expand');
  expect(mapModeLabels).not.toContain('Single');
});

// ---------------------------------------------------------------------------
// NEW: Save persists depth for expand columns, omits it for others
// ---------------------------------------------------------------------------

it('save includes depth for expand columns and excludes it for single-mode columns', async () => {
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

  // Wait for all columns to appear
  await screen.findByText('deep3');

  // Save is disabled until something changes (UX2 dirty-state Save).
  const deep3Card = screen.getByTestId('field-card-deep3');
  fireEvent.click(within(deep3Card).getByText('Expand'));

  await waitFor(() => {
    expect(screen.getByText('Save').closest('button')).not.toBeDisabled();
  });
  fireEvent.click(screen.getByText('Save'));

  // deep3 (expand) must carry depth; _arr (single) must NOT.
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      deep3: { mode: 'expand', depth: 1 },
      _arr: { mode: 'single' },
    })
  );
});

// ---------------------------------------------------------------------------
// NEW (Fix P): sample query is a single cheap LIMIT 1 query, not N UNION ALLs
// ---------------------------------------------------------------------------

it('issues a single LIMIT 1 sample query instead of per-column UNION ALL aggregations', async () => {
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  // Wait for everything to settle (columns + sample loaded)
  expect(await screen.findByText('host')).toBeInTheDocument();

  const calls = (datasource.metricFindQuery as jest.Mock).mock.calls.map((c) => c[0] as string);
  const sampleSql = calls.find((sql) => !sql.includes('system.columns'));

  expect(sampleSql).toBeDefined();
  expect(sampleSql).toContain('LIMIT 1');
  expect(sampleSql).not.toContain('UNION ALL');
  // Uses toJSONString per column, aliased back to the escaped column name.
  expect(sampleSql).toContain('toJSONString');
});

it('handles the single-complex-column edge case where the parser collapses to {text: value}', async () => {
  // Only ONE complex column => the shared ResponseParser reduces a one-key row
  // object to {text: value} instead of {colName: value}. The component must
  // fall back to rows[0].text when rows[0][name] is undefined and there is
  // exactly one column.
  const singleColDatasource: any = {
    metricFindQuery: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('system.columns')) {
        return Promise.resolve([{ text: 'solo_map', value: 'Map(String, String)' }]);
      }
      // Parser behavior for a single-column SELECT: {text: value}
      return Promise.resolve([{ text: JSON.stringify({ a: '1' }) }]);
    }),
  };

  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={singleColDatasource}
      onChange={() => {}}
    />
  );

  expect(await screen.findByText('solo_map')).toBeInTheDocument();
  // Expand-mode tree preview should surface the parsed key/value.
  expect(await screen.findByText('a')).toBeInTheDocument();
  expect(await screen.findByText('1')).toBeInTheDocument();
});

it('handles an empty result table by leaving the sample empty (no infinite loading)', async () => {
  const emptyTableDatasource: any = {
    metricFindQuery: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('system.columns')) {
        return Promise.resolve([{ text: '_map', value: 'Map(String, String)' }]);
      }
      return Promise.resolve([]); // empty table -> no rows
    }),
  };

  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={emptyTableDatasource}
      onChange={() => {}}
    />
  );

  expect(await screen.findByText('_map')).toBeInTheDocument();
  // Sample loading finished but produced nothing — must show the "no sample
  // data" message rather than looping in "Loading preview…" forever.
  expect(await screen.findByText(/no sample data/i)).toBeInTheDocument();
  expect(screen.queryByText(/Loading preview…/i)).not.toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// NEW (UX1): loading state while columns are being fetched
// ---------------------------------------------------------------------------

it('shows a "Loading fields…" message while columns are being fetched, not the empty state', async () => {
  let resolveColumns: (rows: any[]) => void = () => {};
  const slowDatasource: any = {
    metricFindQuery: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('system.columns')) {
        return new Promise((resolve) => {
          resolveColumns = resolve;
        });
      }
      return Promise.resolve([sampleRow]);
    }),
  };

  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={slowDatasource}
      onChange={() => {}}
    />
  );

  // While the columns fetch is still pending, the loading message must show
  // and the "No complex fields detected" empty state must NOT show.
  expect(await screen.findByText(/Loading fields/i)).toBeInTheDocument();
  expect(screen.queryByText(/No complex fields detected/i)).not.toBeInTheDocument();

  // Resolve the pending fetch and confirm the loading message goes away.
  resolveColumns([
    { text: '_map', value: 'Map(String, String)' },
    { text: '_arr', value: 'Array(String)' },
    { text: 'nested_attrs', value: 'Map(String, Map(String, String))' },
    { text: 'deep3', value: 'Map(String, Map(String, Map(String, String)))' },
  ]);

  await waitFor(() => {
    expect(screen.queryByText(/Loading fields/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// NEW (UX2): dirty-state Save + Reset to defaults
// ---------------------------------------------------------------------------

it('disables Save until a change is made, and re-enables it after a mode change', async () => {
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  await screen.findByText('_map');

  const saveButton = screen.getByText('Save').closest('button') as HTMLButtonElement;
  expect(saveButton).toBeDisabled();

  const mapCard = screen.getByTestId('field-card-_map');
  fireEvent.click(within(mapCard).getByText('Hide'));

  await waitFor(() => {
    expect(saveButton).not.toBeDisabled();
  });
});

it('Reset to defaults clears a modified selection and re-enables Save when initial config was non-empty', async () => {
  const queryWithConfig: any = {
    ...baseQuery,
    logsFieldConfig: { _map: { mode: 'hide' } },
  };

  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={queryWithConfig}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  await screen.findByText('_map');

  // Initial config already differs from defaults (hide vs. expand default) —
  // the modified badge should be visible on _map from the start.
  const mapCard = screen.getByTestId('field-card-_map');
  expect(within(mapCard).getByTitle(/modified/i)).toBeInTheDocument();
  expect(await screen.findByText(/hidden/i)).toBeInTheDocument();

  const resetButton = screen.getByText(/Reset to defaults/i);
  fireEvent.click(resetButton);

  // Preview should revert to the expand-mode tree (default for Map).
  expect(await screen.findByText('host')).toBeInTheDocument();
  // Modified badge disappears once back at defaults.
  expect(within(mapCard).queryByTitle(/modified/i)).not.toBeInTheDocument();

  // Because the initial config was non-empty, resetting to {} is itself a
  // change relative to the snapshot taken on open — Save should be enabled.
  const saveButton = screen.getByText('Save').closest('button') as HTMLButtonElement;
  await waitFor(() => {
    expect(saveButton).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// NEW (UX3): "modified" badge next to the field name
// ---------------------------------------------------------------------------

it('shows a "modified" badge only after the mode is switched away from the type default', async () => {
  render(
    <AdvancedLogsFieldsModal
      isOpen={true}
      onDismiss={() => {}}
      query={baseQuery}
      datasource={datasource}
      onChange={() => {}}
    />
  );

  await screen.findByText('_map');
  const mapCard = screen.getByTestId('field-card-_map');

  // No badge before any change — _map is at its type default (expand, depth 3).
  expect(within(mapCard).queryByTitle(/modified/i)).not.toBeInTheDocument();

  fireEvent.click(within(mapCard).getByText('Hide'));

  await waitFor(() => {
    expect(within(mapCard).getByTitle(/modified/i)).toBeInTheDocument();
  });
});
