import AdHocFilter, { DEFAULT_VALUES_QUERY } from './adhoc';

const makeDatasource = (overrides: any = {}) => ({
  defaultDatabase: '',
  adHocHideTableNames: false,
  adHocValuesQuery: '',
  metricFindQuery: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('AdHocFilter constructor', () => {
  it('filters out system databases when no default database is set', () => {
    const filter = new AdHocFilter(makeDatasource());
    expect(filter.query).toContain("database NOT IN ('system','INFORMATION_SCHEMA','information_schema')");
  });

  it('filters by default database when set', () => {
    const filter = new AdHocFilter(makeDatasource({ defaultDatabase: 'mydb' }));
    expect(filter.query).toContain("database = 'mydb'");
  });
});

describe('GetTagKeys', () => {
  it('returns cached keys without querying', async () => {
    const ds = makeDatasource();
    const filter = new AdHocFilter(ds);
    filter.tagKeys = [{ text: 'cached', value: 'cached' }];
    await expect(filter.GetTagKeys()).resolves.toEqual([{ text: 'cached', value: 'cached' }]);
    expect(ds.metricFindQuery).not.toHaveBeenCalled();
  });

  it('uses a custom query when provided', async () => {
    const ds = makeDatasource();
    ds.metricFindQuery.mockResolvedValue([]);
    await new AdHocFilter(ds).GetTagKeys('SELECT custom');
    expect(ds.metricFindQuery).toHaveBeenCalledWith('SELECT custom');
  });

  it('builds fully qualified and bare column keys', async () => {
    const ds = makeDatasource();
    ds.metricFindQuery.mockResolvedValue([
      { database: 'db', table: 'tab', name: 'col', type: 'String' },
      { database: 'db', table: 'tab2', name: 'col', type: 'String' },
    ]);
    const keys = await new AdHocFilter(ds).GetTagKeys();
    expect(keys).toEqual([
      { text: 'db.tab.col', value: 'db.tab.col' },
      { text: 'db.tab2.col', value: 'db.tab2.col' },
      { text: 'col', value: 'col' },
    ]);
  });

  it('omits database prefix when defaultDatabase is set', async () => {
    const ds = makeDatasource({ defaultDatabase: 'db' });
    ds.metricFindQuery.mockResolvedValue([{ database: 'db', table: 'tab', name: 'col', type: 'String' }]);
    const keys = await new AdHocFilter(ds).GetTagKeys();
    expect(keys[0]).toEqual({ text: 'tab.col', value: 'tab.col' });
  });

  it('extracts Enum values into tagValues', async () => {
    const ds = makeDatasource();
    ds.metricFindQuery.mockResolvedValue([
      { database: 'db', table: 'tab', name: 'status', type: "Enum8('ok' = 1, 'fail' = 2)" },
    ]);
    const filter = new AdHocFilter(ds);
    await filter.GetTagKeys();
    expect(filter.tagValues['db.tab.status']).toEqual([
      { text: "'ok'", value: "'ok'" },
      { text: "'fail'", value: "'fail'" },
    ]);
    expect(filter.tagValues['status']).toEqual(filter.tagValues['db.tab.status']);
  });

  it('hides table-qualified keys when adHocHideTableNames is set', async () => {
    const ds = makeDatasource({ adHocHideTableNames: true });
    ds.metricFindQuery.mockResolvedValue([{ database: 'db', table: 'tab', name: 'col', type: 'String' }]);
    const keys = await new AdHocFilter(ds).GetTagKeys();
    expect(keys).toEqual([{ text: 'col', value: 'col' }]);
  });

  it('returns [] on permission errors', async () => {
    const ds = makeDatasource();
    ds.metricFindQuery.mockRejectedValue({ data: { exception: 'ACCESS_DENIED' } });
    await expect(new AdHocFilter(ds).GetTagKeys()).resolves.toEqual([]);
  });

  it('rethrows non-permission errors', async () => {
    const ds = makeDatasource();
    ds.metricFindQuery.mockRejectedValue(new Error('network down'));
    await expect(new AdHocFilter(ds).GetTagKeys()).rejects.toThrow('network down');
  });
});

describe('GetTagValues', () => {
  it('returns cached values immediately', async () => {
    const ds = makeDatasource();
    const filter = new AdHocFilter(ds);
    filter.tagValues['db.tab.col'] = [{ text: 'v', value: 'v' }];
    await expect(filter.GetTagValues({ key: 'db.tab.col' })).resolves.toEqual([{ text: 'v', value: 'v' }]);
    expect(ds.metricFindQuery).not.toHaveBeenCalled();
  });

  it.each([
    ['single segment', 'bare'],
    ['two segments without defaultDatabase', 'tab.col'],
    ['four segments', 'a.b.c.d'],
  ])('returns [] for invalid key: %s', async (_name, key) => {
    await expect(new AdHocFilter(makeDatasource()).GetTagValues({ key })).resolves.toEqual([]);
  });

  it('queries distinct values for a three-part key', async () => {
    const ds = makeDatasource();
    ds.metricFindQuery.mockResolvedValue([{ text: 'v1' }, { text: 'v2' }]);
    const values = await new AdHocFilter(ds).GetTagValues({ key: 'db.tab.col' });
    expect(ds.metricFindQuery).toHaveBeenCalledWith('SELECT DISTINCT col AS value FROM db.tab LIMIT 300');
    expect(values).toEqual([
      { text: 'v1', value: 'v1' },
      { text: 'v2', value: 'v2' },
    ]);
  });

  it('uses defaultDatabase for a two-part key', async () => {
    const ds = makeDatasource({ defaultDatabase: 'db' });
    ds.metricFindQuery.mockResolvedValue([]);
    await new AdHocFilter(ds).GetTagValues({ key: 'tab.col' });
    expect(ds.metricFindQuery).toHaveBeenCalledWith('SELECT DISTINCT col AS value FROM db.tab LIMIT 300');
  });

  it('uses custom adHocValuesQuery template', async () => {
    const ds = makeDatasource({ adHocValuesQuery: 'SELECT {field} FROM {database}.{table} WHERE 1' });
    ds.metricFindQuery.mockResolvedValue([]);
    await new AdHocFilter(ds).GetTagValues({ key: 'db.tab.col' });
    expect(ds.metricFindQuery).toHaveBeenCalledWith('SELECT col FROM db.tab WHERE 1');
  });

  it('caches [] when the value query fails', async () => {
    const ds = makeDatasource();
    ds.metricFindQuery.mockRejectedValue(new Error('boom'));
    const filter = new AdHocFilter(ds);
    await expect(filter.GetTagValues({ key: 'db.tab.col' })).resolves.toEqual([]);
    expect(filter.tagValues['db.tab.col']).toEqual([]);
  });
});

describe('GetTagValues with adHocHideTableNames', () => {
  it('unions per-table value queries from system.columns lookup', async () => {
    const ds = makeDatasource({ adHocHideTableNames: true });
    ds.metricFindQuery
      .mockResolvedValueOnce([
        { name: 'col', database: 'db1', table: 't1' },
        { name: 'col', database: 'db2', table: 't2' },
      ])
      .mockResolvedValueOnce([{ text: 'v' }]);
    const values = await new AdHocFilter(ds).GetTagValues({ key: 'col' });
    expect(ds.metricFindQuery).toHaveBeenNthCalledWith(
      1,
      "SELECT name,database,table FROM system.columns WHERE name='col'"
    );
    expect(ds.metricFindQuery).toHaveBeenNthCalledWith(
      2,
      '(SELECT DISTINCT col AS value FROM db1.t1 LIMIT 300) UNION ALL (SELECT DISTINCT col AS value FROM db2.t2 LIMIT 300)'
    );
    expect(values).toEqual([{ text: 'v', value: 'v' }]);
  });

  it('returns [] when the system.columns lookup hits a permission error', async () => {
    const ds = makeDatasource({ adHocHideTableNames: true });
    ds.metricFindQuery.mockRejectedValue({ data: { exception: 'ACCESS_DENIED' } });
    await expect(new AdHocFilter(ds).GetTagValues({ key: 'col' })).resolves.toEqual([]);
  });

  it('returns [] when the system.columns lookup fails generically', async () => {
    const ds = makeDatasource({ adHocHideTableNames: true });
    ds.metricFindQuery.mockRejectedValue(new Error('boom'));
    await expect(new AdHocFilter(ds).GetTagValues({ key: 'col' })).resolves.toEqual([]);
  });

  it('returns [] when the union value query fails', async () => {
    const ds = makeDatasource({ adHocHideTableNames: true });
    ds.metricFindQuery
      .mockResolvedValueOnce([{ name: 'col', database: 'db', table: 't' }])
      .mockRejectedValueOnce(new Error('boom'));
    await expect(new AdHocFilter(ds).GetTagValues({ key: 'col' })).resolves.toEqual([]);
  });
});

describe('processTagValuesResponse', () => {
  it('maps text to text/value pairs', async () => {
    const filter = new AdHocFilter(makeDatasource());
    await expect(filter.processTagValuesResponse([{ text: 'a' }, { text: 'b' }])).resolves.toEqual([
      { text: 'a', value: 'a' },
      { text: 'b', value: 'b' },
    ]);
  });
});

it('exports the default values query template', () => {
  expect(DEFAULT_VALUES_QUERY).toBe('SELECT DISTINCT {field} AS value FROM {database}.{table} LIMIT 300');
});
