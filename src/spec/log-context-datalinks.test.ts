import { LogRowContextQueryDirection } from '@grafana/data';

// Cut the heavy React import chain (datasource.ts imports QueryEditor only to
// register it as the datasource's editor component).
jest.mock('../views/QueryEditor/QueryEditor', () => ({
  QueryEditor: () => null,
  QueryEditorVariable: () => null,
}));

jest.mock('@grafana/runtime', () => ({
  DataSourceWithBackend: class {},
  config: {},
  getBackendSrv: jest.fn(),
  getGrafanaLiveSrv: jest.fn(),
  getTemplateSrv: jest.fn(),
  getDataSourceSrv: () => ({
    getInstanceSettings: () => undefined, // non-CH target → generic internal link
  }),
  DataSourcePicker: () => null,
}));

import { CHDataSource } from '../datasource/datasource';

describe('getLogRowContext data links', () => {
  const dataLinks = [
    { fieldName: 'trace_id', title: 'View trace', targetDatasourceUid: 'tempo-uid', query: 'q ${__value.raw}' },
  ];

  const meta = [
    { name: 'timestamp', type: 'DateTime' },
    { name: 'content', type: 'String' },
    { name: 'trace_id', type: 'String' },
  ];
  const contextRows = [{ timestamp: '2024-01-01 00:00:10', content: 'hello', trace_id: 't-1' }];

  function createDatasource(): any {
    const ds: any = Object.create(CHDataSource.prototype);
    ds.dataLinks = dataLinks;
    ds.options = { range: { from: 0, to: 1 }, app: 'explore' };
    ds.createQuery = jest.fn().mockResolvedValue({ stmt: 'SELECT 1', requestId: 'rq' });
    ds.resourceClient = {
      getMultipleAstProperties: jest.fn().mockResolvedValue({
        properties: { select: ['timestamp', 'content', 'trace_id'], where: [] },
      }),
    };
    ds.seriesQuery = jest
      .fn()
      // 1st call: time-boundaries probe
      .mockResolvedValueOnce({ rows: 1, data: [{ timestamp: '2024-01-01 00:00:00' }] })
      // 2nd call: the actual context rows
      .mockResolvedValueOnce({ rows: 1, data: contextRows, meta });
    return ds;
  }

  const row: any = { timeEpochMs: 1704067210000, timeUtc: '2024-01-01 00:00:10' };
  const query: any = { dateTimeColDataType: 'timestamp', contextWindowSize: '10' };

  it('attaches configured data links to log-context frames', async () => {
    const ds = createDatasource();

    const result = await ds.getLogRowContext(row, { direction: LogRowContextQueryDirection.Backward }, query);

    expect(result.data).toHaveLength(1);
    const traceField = result.data[0].fields.find((f: any) => f.name === 'trace_id');
    expect(traceField).toBeDefined();
    expect(traceField?.config?.links).toHaveLength(1);
    expect(traceField?.config?.links?.[0].title).toBe('View trace');
    expect(traceField?.config?.links?.[0].internal?.datasourceUid).toBe('tempo-uid');
    // app context is forwarded: explore → split pane, no new tab
    expect(traceField?.config?.links?.[0].targetBlank).toBe(false);
  });

  it('still returns plain frames when no data links are configured', async () => {
    const ds = createDatasource();
    ds.dataLinks = undefined;

    const result = await ds.getLogRowContext(row, { direction: LogRowContextQueryDirection.Backward }, query);

    expect(result.data).toHaveLength(1);
    const traceField = result.data[0].fields.find((f: any) => f.name === 'trace_id');
    // without a data-link config the column is not promoted to a top-level field
    expect(traceField).toBeUndefined();
    const labels = result.data[0].fields.find((f: any) => f.name === 'labels');
    expect(labels).toBeDefined();
  });
});
