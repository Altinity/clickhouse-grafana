jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(() => ({})),
  getTemplateSrv: jest.fn(),
  getGrafanaLiveSrv: jest.fn(),
  config: { bootData: { user: { login: '' } } },
  DataSourceWithBackend: class {},
}));
jest.mock('../views/QueryEditor/QueryEditor', () => ({
  QueryEditor: () => null,
  QueryEditorVariable: () => null,
}));
jest.mock('../utils/indexedDBManager', () => ({
  IndexedDBManager: { cleanupAllExpired: jest.fn().mockResolvedValue({ removedKeys: 0 }) },
}));

import { getTemplateSrv } from '@grafana/runtime';
import { LogRowContextQueryDirection } from '@grafana/data';
import { CHDataSource } from './datasource';

beforeEach(() => {
  (getTemplateSrv as jest.Mock).mockReturnValue({ replace: (q: string) => q, getVariables: () => [] });
});

const logsResponse = {
  rows: 1,
  meta: [
    { name: 'ts', type: 'DateTime' },
    { name: 'content', type: 'String' },
  ],
  data: [{ ts: '2024-01-01 00:00:00', content: 'line' }],
};

const row: any = { timeEpochMs: 1704067200123, timeUtc: '2024-01-01 00:00:00' };
const chQuery: any = { dateTimeColDataType: 'ts', contextWindowSize: 10, query: 'SELECT * FROM logs' };

// createQuery echoes the target query as stmt so we can inspect the generated SQL per call
const setup = (where: string[] = ["host='web'"], responses?: any[]) => {
  const ds = new CHDataSource({ uid: 'UID', url: 'http://x', meta: { id: 'x' }, jsonData: {} } as any);
  ds.options = { range: {} };
  const queries: string[] = [];
  jest.spyOn(ds, 'createQuery').mockImplementation(async (_o: any, target: any) => {
    queries.push(target.query);
    return { keys: [], requestId: 'R', stmt: target.query };
  });
  ds.resourceClient = {
    getMultipleAstProperties: jest.fn(async () => ({ properties: { select: ['a', 'b'], where } })),
  } as any;
  const seriesQuery = jest.spyOn(ds as any, 'seriesQuery');
  (responses ?? [{ data: [{ timestamp: 'TS_BOUND' }] }, logsResponse]).forEach((r) => seriesQuery.mockResolvedValueOnce(r));
  return { ds, queries };
};

describe('getLogRowContext', () => {
  it('generates backward boundary and context SQL', async () => {
    const { ds, queries } = setup();
    const result = await ds.getLogRowContext(row, { direction: LogRowContextQueryDirection.Backward }, chQuery);

    // boundaries query: FIRST_VALUE window over ts, 13-digit epoch -> toDateTime64
    expect(queries[1]).toContain('FIRST_VALUE(ts)');
    expect(queries[1]).toContain('10 PRECEDING');
    expect(queries[1]).toContain("WHERE host='web'");
    expect(queries[1]).toContain('WHERE ts = toDateTime64(1704067200123/1000,3)');
    // context query: rows between the boundary and the current row
    expect(queries[2]).toBe(
      "SELECT a,b FROM $table WHERE host='web' AND ts > 'TS_BOUND' AND ts < '2024-01-01 00:00:00'"
    );
    expect(result.data).toHaveLength(1);
  });

  it('generates forward boundary and context SQL', async () => {
    const { ds, queries } = setup();
    await ds.getLogRowContext(row, { direction: LogRowContextQueryDirection.Forward }, chQuery);

    expect(queries[1]).toContain('LAST_VALUE(ts)');
    expect(queries[1]).toContain('10 FOLLOWING');
    expect(queries[2]).toBe("SELECT a,b FROM $table WHERE host='web' AND ts <'TS_BOUND' AND ts > '2024-01-01 00:00:00'");
  });

  it('uses timeUtc for second-precision timestamps', async () => {
    const { ds, queries } = setup();
    await ds.getLogRowContext({ ...row, timeEpochMs: 1704067200 }, { direction: LogRowContextQueryDirection.Backward }, chQuery);
    expect(queries[1]).toContain("WHERE ts = '2024-01-01 00:00:00'");
  });

  it('omits the where prefix when the query has no where clause', async () => {
    const { ds, queries } = setup([]);
    await ds.getLogRowContext(row, { direction: LogRowContextQueryDirection.Backward }, chQuery);
    expect(queries[2]).toBe("SELECT a,b FROM $table WHERE  ts > 'TS_BOUND' AND ts < '2024-01-01 00:00:00'");
  });

  it('returns empty data when the context query yields no rows', async () => {
    const { ds } = setup(undefined as any, [{ data: [{ timestamp: 'TS' }] }, { data: [], meta: [] }]);
    await expect(
      ds.getLogRowContext(row, { direction: LogRowContextQueryDirection.Backward }, chQuery)
    ).resolves.toEqual({ data: [] });
  });

  it('throws when the context query returns nothing', async () => {
    const { ds } = setup(undefined as any, [{ data: [{ timestamp: 'TS' }] }, null]);
    await expect(ds.getLogRowContext(row, { direction: LogRowContextQueryDirection.Backward }, chQuery)).rejects.toThrow(
      'No response for log context query'
    );
  });
});
