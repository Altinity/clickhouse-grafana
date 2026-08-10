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

import { config, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { CHDataSource } from './datasource';

let templateSrvMock: any;
let fetchMock: jest.Mock;

beforeEach(() => {
  templateSrvMock = {
    // substitute $name from scopedVars, leave unknown variables intact
    replace: jest.fn((target: string, scopedVars?: any) =>
      (target || '').replace(/\$(\w+)/g, (match: string, name: string) => scopedVars?.[name]?.value ?? match)
    ),
    getVariables: jest.fn(() => []),
  };
  (getTemplateSrv as jest.Mock).mockReturnValue(templateSrvMock);
  fetchMock = jest.fn(() => ({ subscribe: (next: any) => next({ data: '{"meta":[],"data":[]}' }) }));
  (getBackendSrv as jest.Mock).mockImplementation(() => ({ fetch: (...args: any[]) => fetchMock(...args) }));
  (config as any).bootData.user.login = 'roman';
});

const makeDatasource = () => {
  const ds = new CHDataSource({ uid: 'UID', url: 'http://localhost:8123', meta: { id: 'x' }, jsonData: {} } as any);
  ds.resourceClient = {
    createQueryWithAdhoc: jest.fn(async (queryData: any) => ({ sql: queryData.query })),
    getAstProperty: jest.fn(async () => ({ properties: ['host'] })),
    getMultipleAstProperties: jest.fn(),
    replaceTimeFilters: jest.fn(async (q: string) => q),
  } as any;
  return ds;
};

const options: any = {
  panelId: 5,
  interval: '15s',
  scopedVars: {},
  maxDataPoints: 100,
  range: {
    from: { toISOString: () => '2024-01-01T00:00:00.000Z', valueOf: () => 1704067200000 },
    to: { toISOString: () => '2024-01-01T01:00:00.000Z', valueOf: () => 1704070800000 },
  },
};

const lastQueryData = (ds: any) =>
  (ds.resourceClient.createQueryWithAdhoc as jest.Mock).mock.calls.at(-1)[0];

describe('replace', () => {
  it('substitutes $__searchFilter with % when no search filter is set', async () => {
    const ds = makeDatasource();
    await ds.replace(options, { query: "SELECT x WHERE x LIKE '$__searchFilter'" } as any);
    expect(lastQueryData(ds).query).toBe("SELECT x WHERE x LIKE '%'");
  });

  it('appends % to an existing scoped search filter', async () => {
    const ds = makeDatasource();
    const opts = { ...options, scopedVars: { __searchFilter: { value: 'foo' } } };
    await ds.replace(opts, { query: "SELECT x WHERE x LIKE '$__searchFilter'" } as any);
    expect(lastQueryData(ds).query).toBe("SELECT x WHERE x LIKE 'foo%'");
  });

  it('falls back to % when the backend re-introduces $__searchFilter', async () => {
    const ds = makeDatasource();
    (ds.resourceClient.createQueryWithAdhoc as jest.Mock).mockResolvedValue({
      sql: "SELECT y WHERE y LIKE '$__searchFilter'",
    });
    const { stmt } = await ds.replace(options, { query: 'SELECT x' } as any);
    expect(stmt).toBe("SELECT y WHERE y LIKE '%'");
  });

  it('keeps the $adhoc macro intact through templateSrv interpolation', async () => {
    const ds = makeDatasource();
    templateSrvMock.replace = jest.fn((q: string) => q.replace(/\$adhoc/g, "'broken'"));
    await ds.replace(options, { query: 'SELECT x WHERE $adhoc' } as any);
    expect(lastQueryData(ds).query).toBe('SELECT x WHERE $adhoc');
  });

  it('fills queryData defaults', async () => {
    const ds = makeDatasource();
    const opts = { ...options, headers: { 'X-Rule-Uid': 'rule-1' } };
    await ds.replace(opts, { refId: 'A', query: 'SELECT x' } as any);
    expect(lastQueryData(ds)).toMatchObject({
      frontendDatasource: true,
      refId: 'A',
      ruleUid: 'rule-1',
      dateTimeType: 'DATETIME',
      format: 'time_series',
      round: '0s',
      intervalFactor: 1,
      interval: '15s',
      database: 'default',
      maxDataPoints: 100,
      timeRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-01T01:00:00.000Z' },
      metadataUserLogin: 'roman',
    });
  });

  it.each([
    ['target interval wins', '1m', '1m'],
    ['falls back to options.interval', undefined, '15s'],
  ])('interval chain: %s', async (_name, targetInterval, expected) => {
    const ds = makeDatasource();
    await ds.replace(options, { query: 'SELECT x', interval: targetInterval } as any);
    expect(lastQueryData(ds).interval).toBe(expected);
  });

  it('defaults interval to 30s when neither target nor options define it', async () => {
    const ds = makeDatasource();
    await ds.replace({ ...options, interval: undefined }, { query: 'SELECT x' } as any);
    expect(lastQueryData(ds).interval).toBe('30s');
  });

  it('throws when the backend reports an error', async () => {
    const ds = makeDatasource();
    (ds.resourceClient.createQueryWithAdhoc as jest.Mock).mockResolvedValue({ sql: '', error: 'bad macro' });
    await expect(ds.replace(options, { query: 'SELECT x' } as any)).rejects.toThrow('bad macro');
  });

  it('returns group by properties as keys', async () => {
    const ds = makeDatasource();
    const result = await ds.replace(options, { query: 'SELECT x' } as any);
    expect(ds.resourceClient.getAstProperty).toHaveBeenCalledWith('SELECT x', 'group by');
    expect(result).toEqual({ stmt: 'SELECT x', keys: ['host'] });
  });
});

describe('createQuery', () => {
  it('wraps replace output with a panel-scoped requestId', async () => {
    const ds = makeDatasource();
    jest.spyOn(ds, 'replace').mockResolvedValue({ stmt: 'SELECT final', keys: ['k'] });
    const result = await ds.createQuery(options, { refId: 'A' });
    expect(result.stmt).toBe('SELECT final');
    expect(result.keys).toEqual(['k']);
    expect(result.requestId.startsWith('5A')).toBe(true);
  });

  it('propagates replace errors', async () => {
    const ds = makeDatasource();
    jest.spyOn(ds, 'replace').mockRejectedValue(new Error('nope'));
    await expect(ds.createQuery(options, { refId: 'A' })).rejects.toThrow('nope');
  });
});

describe('annotationQuery', () => {
  it('throws when the annotation has no query', async () => {
    await expect(makeDatasource().annotationQuery({ annotation: {} })).rejects.toThrow(
      'Query missing in annotation definition'
    );
  });

  it('flattens newlines, appends FORMAT JSON and transforms the response', async () => {
    const ds = makeDatasource();
    jest.spyOn(ds, 'replace').mockResolvedValue({ stmt: 'SELECT time\nFROM anno', keys: [] });
    const body = JSON.stringify({
      meta: [{ name: 'time', type: 'UInt64' }],
      data: [{ time: 1704067200000, title: 'T', text: 'txt', tags: 'a, b' }],
    });
    fetchMock = jest.fn(() => ({ subscribe: (next: any) => next({ data: body }) }));
    const annotation = { query: 'SELECT time FROM anno' };
    const events: any = await ds.annotationQuery({ annotation, range: options.range });
    expect(fetchMock.mock.calls[0][0].data).toBe('SELECT time FROM anno FORMAT JSON');
    expect(events).toEqual([
      expect.objectContaining({ annotation, time: 1704067200000, title: 'T', text: 'txt', tags: ['a', 'b'] }),
    ]);
  });

  it('rejects on unparseable responses', async () => {
    const ds = makeDatasource();
    jest.spyOn(ds, 'replace').mockResolvedValue({ stmt: 'SELECT 1', keys: [] });
    fetchMock = jest.fn(() => ({ subscribe: (next: any) => next({ data: 'not json' }) }));
    await expect(ds.annotationQuery({ annotation: { query: 'q' }, range: options.range })).rejects.toBeInstanceOf(
      SyntaxError
    );
  });

  it('rejects transport errors with the body parsed back to an object', async () => {
    const ds = makeDatasource();
    jest.spyOn(ds, 'replace').mockResolvedValue({ stmt: 'SELECT 1', keys: [] });
    fetchMock = jest.fn(() => ({
      subscribe: (_next: any, err: any) => err({ status: 500, data: '{"exception":"boom"}' }),
    }));
    await expect(ds.annotationQuery({ annotation: { query: 'q' }, range: options.range })).rejects.toMatchObject({
      status: 500,
      data: { exception: 'boom' },
    });
  });
});

describe('metricFindQuery', () => {
  it('returns [] for empty queries', async () => {
    await expect(makeDatasource().metricFindQuery('')).resolves.toEqual([]);
    await expect(makeDatasource().metricFindQuery('   ')).resolves.toEqual([]);
  });

  it('substitutes $__searchFilter with the search filter plus wildcard', async () => {
    const ds = makeDatasource();
    const seriesSpy = jest.spyOn(ds as any, 'seriesQuery').mockResolvedValue({ meta: [], data: [] });
    await ds.metricFindQuery("SELECT x WHERE x LIKE '$__searchFilter'", { searchFilter: 'foo' });
    expect(seriesSpy).toHaveBeenCalledWith("SELECT x WHERE x LIKE 'foo%'");
  });

  it('substitutes $__searchFilter with % without a search filter', async () => {
    const ds = makeDatasource();
    const seriesSpy = jest.spyOn(ds as any, 'seriesQuery').mockResolvedValue({ meta: [], data: [] });
    await ds.metricFindQuery("SELECT x WHERE x LIKE '$__searchFilter'");
    expect(seriesSpy).toHaveBeenCalledWith("SELECT x WHERE x LIKE '%'");
  });

  it('replaces $from/$to, applies backend time filters and flattens newlines', async () => {
    const ds = makeDatasource();
    (ds.resourceClient.replaceTimeFilters as jest.Mock).mockImplementation(async (q: string) => q + ' /*tf*/');
    const seriesSpy = jest.spyOn(ds as any, 'seriesQuery').mockResolvedValue({ meta: [], data: [] });
    await ds.metricFindQuery('SELECT $from,\n$to', { range: options.range, dateTimeType: 'DATETIME' });
    expect(ds.resourceClient.replaceTimeFilters).toHaveBeenCalledWith(
      'SELECT 1704067200,\n1704070800',
      options.range,
      'DATETIME'
    );
    expect(seriesSpy).toHaveBeenCalledWith('SELECT 1704067200, 1704070800 /*tf*/');
  });

  it('parses the response through responseParser', async () => {
    const ds = makeDatasource();
    jest.spyOn(ds as any, 'seriesQuery').mockResolvedValue({ meta: [{ name: 'x' }], data: [{ x: 'v' }] });
    await expect(ds.metricFindQuery('SELECT x')).resolves.toEqual([{ text: 'v' }]);
  });
});

describe('testDatasource', () => {
  it('reports success when the probe query works', async () => {
    const ds = makeDatasource();
    const spy = jest.spyOn(ds, 'metricFindQuery').mockResolvedValue([]);
    await expect(ds.testDatasource()).resolves.toEqual({
      status: 'success',
      message: 'Data source is working',
      title: 'Success',
    });
    expect(spy).toHaveBeenCalledWith('SELECT 1');
  });
});
