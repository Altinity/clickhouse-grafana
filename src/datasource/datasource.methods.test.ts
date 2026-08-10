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
import { VariableSupportType } from '@grafana/data';
import { CHDataSource } from './datasource';

let templateSrvMock: any;

beforeEach(() => {
  templateSrvMock = {
    replace: jest.fn((q: string) => q),
    getVariables: jest.fn(() => []),
    containsTemplate: jest.fn(() => true),
  };
  (getTemplateSrv as jest.Mock).mockReturnValue(templateSrvMock);
});

const makeDatasource = (jsonData: any = {}) =>
  new CHDataSource({ uid: 'UID', url: 'http://localhost:8123', meta: { id: 'x' }, jsonData } as any);

describe('toggleQueryFilter', () => {
  const baseQuery: any = { query: 'SELECT 1', adHocFilters: [] };

  it('adds an equality filter for FILTER_FOR', () => {
    const result = makeDatasource().toggleQueryFilter(baseQuery, {
      type: 'FILTER_FOR',
      options: { key: 'host', value: 'a' },
    });
    expect(result.adHocFilters).toEqual([{ key: 'host', value: 'a', operator: '=' }]);
  });

  it('removes an existing FILTER_FOR filter', () => {
    const query: any = { query: 'SELECT 1', adHocFilters: [{ key: 'host', value: 'a', operator: '=' }] };
    const result = makeDatasource().toggleQueryFilter(query, {
      type: 'FILTER_FOR',
      options: { key: 'host', value: 'a', operator: '=' },
    });
    expect(result.adHocFilters).toEqual([]);
  });

  it('adds a != filter for FILTER_OUT', () => {
    const result = makeDatasource().toggleQueryFilter(baseQuery, {
      type: 'FILTER_OUT',
      options: { key: 'host', value: 'a' },
    });
    expect(result.adHocFilters).toEqual([{ key: 'host', value: 'a', operator: '!=' }]);
  });

  it('removes an existing FILTER_OUT filter', () => {
    const query: any = { query: 'SELECT 1', adHocFilters: [{ key: 'host', value: 'a', operator: '!=' }] };
    const result = makeDatasource().toggleQueryFilter(query, {
      type: 'FILTER_OUT',
      options: { key: 'host', value: 'a', operator: '!=' },
    });
    expect(result.adHocFilters).toEqual([]);
  });

  it('ignores unknown filter types', () => {
    const result = makeDatasource().toggleQueryFilter(baseQuery, { type: 'OTHER', options: { key: 'k', value: 'v' } });
    expect(result.adHocFilters).toEqual([]);
  });
});

describe('queryHasFilter', () => {
  it('matches on key and value', () => {
    const ds = makeDatasource();
    const query: any = { adHocFilters: [{ key: 'host', value: 'a', operator: '=' }] };
    expect(ds.queryHasFilter(query, { key: 'host', value: 'a' } as any)).toBe(true);
    expect(ds.queryHasFilter(query, { key: 'host', value: 'b' } as any)).toBe(false);
  });
});

describe('interpolateVariablesInQueries', () => {
  it('passes empty arrays through', () => {
    expect(makeDatasource().interpolateVariablesInQueries([], {})).toEqual([]);
  });

  it('interpolates and attaches the datasource ref', () => {
    templateSrvMock.replace = jest.fn(() => 'SELECT interpolated');
    const result = makeDatasource().interpolateVariablesInQueries([{ query: 'SELECT $var' }], {});
    expect(result[0].query).toBe('SELECT interpolated');
    expect(result[0].datasource).toEqual({ type: undefined, uid: 'UID' });
  });

  it('protects the $adhoc macro from templateSrv', () => {
    templateSrvMock.replace = jest.fn((q: string) => q.replace(/\$adhoc/g, "'oops'"));
    const result = makeDatasource().interpolateVariablesInQueries([{ query: 'SELECT * WHERE $adhoc' }], {});
    expect(result[0].query).toBe('SELECT * WHERE $adhoc');
  });

  it('applies conditionalTest before interpolation', () => {
    templateSrvMock.getVariables = jest.fn(() => [{ name: 'v', type: 'textbox', current: { value: '' } }]);
    const result = makeDatasource().interpolateVariablesInQueries(
      [{ query: 'SELECT 1 WHERE $conditionalTest(x=1, $v)' }],
      {}
    );
    expect(result[0].query).not.toContain('$conditionalTest');
    expect(result[0].query).not.toContain('x=1');
  });
});

describe('misc accessors', () => {
  it('getRef returns the uid', () => {
    expect(makeDatasource().getRef()).toEqual({ type: undefined, uid: 'UID' });
  });

  it('targetContainsTemplate delegates to templateSrv', () => {
    expect(makeDatasource().targetContainsTemplate({ query: 'SELECT $x' } as any)).toBe(true);
    expect(templateSrvMock.containsTemplate).toHaveBeenCalledWith('SELECT $x');
  });

  it('getTagKeys forwards the adhoc_query_filter variable query', () => {
    templateSrvMock.getVariables = jest.fn(() => [{ name: 'adhoc_query_filter', query: 'SELECT cols', type: 'query' }]);
    const ds = makeDatasource();
    const spy = jest.spyOn(ds.adHocFilter, 'GetTagKeys').mockResolvedValue([]);
    ds.getTagKeys();
    expect(spy).toHaveBeenCalledWith('SELECT cols');
  });

  it('getTagKeys passes empty filter without the variable', () => {
    const ds = makeDatasource();
    const spy = jest.spyOn(ds.adHocFilter, 'GetTagKeys').mockResolvedValue([]);
    ds.getTagKeys();
    expect(spy).toHaveBeenCalledWith('');
  });

  it('getTagValues delegates to the adhoc filter', () => {
    const ds = makeDatasource();
    const spy = jest.spyOn(ds.adHocFilter, 'GetTagValues').mockResolvedValue([]);
    ds.getTagValues({ key: 'a.b.c' });
    expect(spy).toHaveBeenCalledWith({ key: 'a.b.c' });
  });
});

describe('constructor configuration', () => {
  it('builds defaultValues when useDefaultConfiguration is set', () => {
    const ds = makeDatasource({
      useDefaultConfiguration: true,
      defaultDateTime64: 'dt64',
      defaultDateTime: 'dt',
      defaultDateTimeType: 'DATETIME64',
      contextWindowSize: 20,
      nullifySparse: true,
    });
    expect(ds.defaultValues.dateTime.defaultDateTime64).toBe('dt64');
    expect(ds.defaultValues.dateTime.defaultDateTime).toBe('dt');
    expect(ds.defaultValues.defaultDateTimeType).toBe('DATETIME64');
    expect(ds.defaultValues.contextWindowSize).toBe(20);
    expect(ds.defaultValues.nullifySparse).toBe(true);
  });

  it('leaves defaultValues unset otherwise', () => {
    expect(makeDatasource().defaultValues).toBeUndefined();
  });

  it('registers custom variable support', () => {
    const ds = makeDatasource();
    expect((ds.variables as any).getType()).toBe(VariableSupportType.Custom);
  });
});

describe('_getRequestOptions', () => {
  const base = { url: 'http://localhost:8123' };

  it('uses POST with the query as body', () => {
    const opts = CHDataSource._getRequestOptions('SELECT 1', true, 'r1', base);
    expect(opts.method).toBe('POST');
    expect(opts.data).toBe('SELECT 1');
    expect(opts.url).toBe('http://localhost:8123');
  });

  it('uses GET with the query url-encoded', () => {
    const opts = CHDataSource._getRequestOptions('SELECT 1', false, 'r1', base);
    expect(opts.method).toBe('GET');
    expect(opts.url).toBe('http://localhost:8123/?query=' + encodeURIComponent('SELECT 1'));
  });

  it('adds the database param', () => {
    const opts = CHDataSource._getRequestOptions('q', true, 'r', { ...base, defaultDatabase: 'db' });
    expect(opts.url).toContain('/?database=db');
  });

  it('sets credentials and Authorization for basicAuth', () => {
    const opts = CHDataSource._getRequestOptions('q', true, 'r', { ...base, basicAuth: 'Basic xyz' });
    expect(opts.withCredentials).toBe(true);
    expect(opts.headers!.Authorization).toBe('Basic xyz');
  });

  it('sets credentials for withCredentials alone', () => {
    const opts = CHDataSource._getRequestOptions('q', true, 'r', { ...base, withCredentials: true });
    expect(opts.withCredentials).toBe(true);
    expect(opts.headers!.Authorization).toBeUndefined();
  });

  it('adds compression header and param', () => {
    const opts = CHDataSource._getRequestOptions('q', true, 'r', { ...base, useCompression: true, compressionType: 'gzip' });
    expect(opts.headers!['Accept-Encoding']).toBe('gzip');
    expect(opts.url).toContain('enable_http_compression=1');
  });

  it('appends /xHeaderKey for Yandex auth without SSL cert', () => {
    const opts = CHDataSource._getRequestOptions('q', true, 'r', {
      ...base,
      useYandexCloudAuthorization: true,
      xHeaderUser: 'user1',
    });
    expect(opts.headers!['X-ClickHouse-User']).toBe('user1');
    expect(opts.url).toBe('http://localhost:8123/xHeaderKey');
  });

  it('appends /xClickHouseSSLCertificateAuth with SSL cert auth', () => {
    const opts = CHDataSource._getRequestOptions('q', true, 'r', {
      ...base,
      useYandexCloudAuthorization: true,
      xClickHouseSSLCertificateAuth: true,
      xHeaderUser: 'user1',
    });
    expect(opts.headers!['X-ClickHouse-SSL-Certificate-Auth']).toBe('on');
    expect(opts.url).toBe('http://localhost:8123/xClickHouseSSLCertificateAuth');
  });

  it.each([
    [true, 'http://localhost:8123/xClickHouseSSLCertificateAuth/?foo=1'],
    [false, 'http://localhost:8123/xHeaderKey/?foo=1'],
  ])('inserts the auth route before /? when the url already contains it (ssl=%s)', (ssl, expected) => {
    const opts = CHDataSource._getRequestOptions('q', true, 'r', {
      url: 'http://localhost:8123/?foo=1',
      useYandexCloudAuthorization: true,
      xClickHouseSSLCertificateAuth: ssl,
    });
    expect(opts.url).toBe(expected);
  });

  it('adds the CORS param', () => {
    const opts = CHDataSource._getRequestOptions('q', true, 'r', { ...base, addCorsHeader: true });
    expect(opts.url).toContain('add_http_cors_header=1');
  });

  it('joins params with & when the url already has a query string', () => {
    const opts = CHDataSource._getRequestOptions('q', true, 'r', { url: 'http://localhost:8123/?a=1', addCorsHeader: true });
    expect(opts.url).toBe('http://localhost:8123/?a=1&add_http_cors_header=1');
  });
});
