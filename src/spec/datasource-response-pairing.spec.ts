// Mock @grafana/runtime before importing the datasource: the real module drags the
// @grafana/ui ESM chain into jest. Only the names the datasource imports are stubbed.
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(() => ({ fetch: jest.fn() })),
  getTemplateSrv: jest.fn(() => ({ replace: (s: any) => s, getAdhocFilters: jest.fn(() => []) })),
  getGrafanaLiveSrv: jest.fn(),
  toDataQueryResponse: jest.fn(),
  config: { featureToggles: {} },
  DataSourceWithBackend: class {},
}));
// datasource.ts also imports the QueryEditor component tree, which pulls @grafana/ui.
jest.mock('@grafana/ui', () => ({}));

import { CHDataSource } from '../datasource/datasource';

// processQueryResponse must pair responses with the SAME (filtered) targets list
// that built the queries — not the unfiltered options.targets (a hidden target
// preceding a visible one would shift the pairing by one).
describe('processQueryResponse target pairing', () => {
  const hiddenTarget = { refId: 'A', hide: true, format: 'time_series', query: 'SELECT 1' };
  const logsTarget = { refId: 'B', format: 'logs', query: 'SELECT 2' };

  const response = {
    rows: 1,
    meta: [
      { name: 'ts', type: 'DateTime64(3)' },
      { name: 'content', type: 'String' },
    ],
    data: [{ ts: '2023-01-01 10:00:00', content: 'hello' }],
  };

  const options = {
    targets: [hiddenTarget, logsTarget], // unfiltered: hidden first
    rangeRaw: { to: 'now' },
    range: { from: new Date('2023-01-01T00:00:00Z'), to: new Date('2023-01-02T00:00:00Z') },
  };
  const queries = [{ keys: [] }];

  it('uses the filtered targets list when provided (logs target renders as logs)', () => {
    const result = CHDataSource.prototype.processQueryResponse.call(
      {},
      [response],
      options,
      queries,
      [logsTarget] // filtered list: only the visible logs target
    );
    // logs path returns DataFrames with LogLines meta and a refId of the LOGS target
    expect(result.data[0].refId).toBe('B');
    expect(result.data[0].meta?.type).toBe('log-lines');
  });
});
