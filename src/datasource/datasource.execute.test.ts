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

import { SupplementaryQueryType } from '@grafana/data';
import { getBackendSrv, getGrafanaLiveSrv, getTemplateSrv } from '@grafana/runtime';
import { firstValueFrom } from 'rxjs';
import { CHDataSource } from './datasource';
import { LOGS_VOLUME_FORMAT } from '../types/types';

// fetch mock in the subscribe style _request expects: next receives {data: <json string>}
const fetchResponding = (body: any) => jest.fn(() => ({ subscribe: (next: any) => next(body) }));
const fetchFailing = (error: any) => jest.fn(() => ({ subscribe: (_next: any, err: any) => err(error) }));

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = fetchResponding({ data: '{"rows":0,"meta":[],"data":[]}' });
  (getBackendSrv as jest.Mock).mockImplementation(() => ({ fetch: (...args: any[]) => fetchMock(...args) }));
  (getTemplateSrv as jest.Mock).mockReturnValue({
    replace: (q: string) => q,
    getVariables: () => [],
  });
});

const makeDatasource = () =>
  new CHDataSource({ uid: 'UID', url: 'http://localhost:8123', meta: { id: 'x' }, jsonData: {} } as any);

const range = {
  from: { toISOString: () => '2024-01-01T00:00:00.000Z', valueOf: () => 1704067200000 },
  to: { toISOString: () => '2024-01-01T01:00:00.000Z', valueOf: () => 1704070800000 },
};

describe('_request', () => {
  it('parses the body losslessly, preserving >2^53 integers', async () => {
    fetchMock = fetchResponding({ data: '{"data":[{"v":11189782786942380395}]}' });
    const result: any = await makeDatasource()._request('SELECT v');
    expect(result.data[0].v).toBe('11189782786942380395');
  });

  it('resolves null for an empty body', async () => {
    fetchMock = fetchResponding({ data: '' });
    await expect(makeDatasource()._request('SELECT 1')).resolves.toBeNull();
  });

  it('rejects with context when the body is unparseable', async () => {
    fetchMock = fetchResponding({ data: '<html>error</html>' });
    await expect(makeDatasource()._request('SELECT 1', 'rid')).rejects.toMatchObject({
      query: 'SELECT 1',
      requestId: 'rid',
      originalError: expect.any(Error),
    });
  });

  it('rejects transport errors with the string body parsed back to an object', async () => {
    fetchMock = fetchFailing({ status: 403, data: '{"exception":"ACCESS_DENIED"}' });
    await expect(makeDatasource()._request('SELECT 1')).rejects.toMatchObject({
      status: 403,
      data: { exception: 'ACCESS_DENIED' },
      query: 'SELECT 1',
    });
  });
});

describe('seriesQuery', () => {
  it('appends FORMAT JSON', async () => {
    const ds = makeDatasource();
    const requestSpy = jest.spyOn(ds, '_request').mockResolvedValue(null);
    await (ds as any).seriesQuery('SELECT 1', 'rid');
    expect(requestSpy).toHaveBeenCalledWith('SELECT 1 FORMAT JSON', 'rid', undefined);
  });
});

describe('executeQueries', () => {
  const setup = () => {
    const ds = makeDatasource();
    ds.options = { range, panelId: 1, scopedVars: {} };
    jest.spyOn(ds, 'createQuery').mockResolvedValue({ keys: [], requestId: 'r', stmt: 'SELECT 1' });
    return ds;
  };

  it('returns empty data for no targets', async () => {
    await expect(makeDatasource().executeQueries([], {})).resolves.toEqual({ data: [] });
  });

  it('feeds responses into processQueryResponse', async () => {
    const ds = setup();
    jest.spyOn(ds as any, 'seriesQuery').mockResolvedValue({ rows: 1 });
    const processSpy = jest.spyOn(ds, 'processQueryResponse').mockReturnValue({ data: ['done'] });
    const options = { targets: [{ refId: 'A' }] };
    await expect(ds.executeQueries([{ refId: 'A' }], options)).resolves.toEqual({ data: ['done'] });
    expect(processSpy).toHaveBeenCalledWith([{ rows: 1 }], options, [{ keys: [], requestId: 'r', stmt: 'SELECT 1' }], [
      { refId: 'A' },
    ]);
  });

  it.each([
    [{ data: { exception: 'DB::Exception' } }, 'Query execution failed: DB::Exception'],
    [{ data: { message: 'bad query' } }, 'Query execution failed: bad query'],
    [{ status: 500, statusText: 'ISE', data: 'body text' }, 'Query execution failed: HTTP 500 ISE: body text'],
    [{ status: 502, statusText: 'BG', data: { k: 1 } }, 'Query execution failed: HTTP 502 BG: {"k":1}'],
  ])('maps error %j to a descriptive message', async (error, message) => {
    const ds = setup();
    jest.spyOn(ds as any, 'seriesQuery').mockRejectedValue(error);
    await expect(ds.executeQueries([{ refId: 'A' }], {})).rejects.toThrow(message);
  });

  it('rethrows errors without recognizable shape', async () => {
    const ds = setup();
    const bare = new Error('plain');
    jest.spyOn(ds as any, 'seriesQuery').mockRejectedValue(bare);
    await expect(ds.executeQueries([{ refId: 'A' }], {})).rejects.toBe(bare);
  });
});

describe('query', () => {
  it('filters hidden and empty targets before executing', async () => {
    const ds = makeDatasource();
    const executeSpy = jest.spyOn(ds, 'executeQueries').mockResolvedValue({ data: [] });
    const options: any = { targets: [{ hide: true, query: 'SELECT 1' }, { query: '   ' }, {}], range };
    await firstValueFrom(ds.query(options));
    expect(executeSpy).toHaveBeenCalledWith([], options);
  });

  it('emits executeQueries result for regular targets', async () => {
    const ds = makeDatasource();
    jest.spyOn(ds, 'executeQueries').mockResolvedValue({ data: ['R'] });
    const options: any = { targets: [{ refId: 'A', query: 'SELECT 1' }], range };
    await expect(firstValueFrom(ds.query(options))).resolves.toEqual({ data: ['R'] });
  });

  it('propagates executeQueries failures', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const ds = makeDatasource();
    jest.spyOn(ds, 'executeQueries').mockRejectedValue(new Error('boom'));
    const options: any = { targets: [{ refId: 'A', query: 'SELECT 1' }], range };
    await expect(firstValueFrom(ds.query(options))).rejects.toThrow('boom');
  });

  describe('streaming', () => {
    let observer: any;
    let unsubscribed: boolean;

    beforeEach(() => {
      observer = null;
      unsubscribed = false;
      (getGrafanaLiveSrv as jest.Mock).mockReturnValue({
        getDataStream: () => ({
          subscribe: (obs: any) => {
            observer = obs;
            return { unsubscribe: () => (unsubscribed = true) };
          },
        }),
      });
    });

    const streamingOptions: any = {
      targets: [{ refId: 'A', query: 'SELECT 1', streaming: true }],
      range,
      scopedVars: {},
      interval: '30s',
    };

    it('forwards next, complete and unsubscribes the live stream', () => {
      const ds = makeDatasource();
      const received: any[] = [];
      let completed = false;
      const sub = ds.query(streamingOptions).subscribe({
        next: (v: any) => received.push(v),
        complete: () => (completed = true),
      });
      observer.next({ data: ['frame'] });
      observer.complete();
      sub.unsubscribe();
      expect(received).toEqual([{ data: ['frame'] }]);
      expect(completed).toBe(true);
      expect(unsubscribed).toBe(true);
    });

    it('forwards stream errors', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const ds = makeDatasource();
      let seen: any = null;
      ds.query(streamingOptions).subscribe({ error: (e: any) => (seen = e) });
      observer.error(new Error('live failed'));
      expect(seen).toEqual(new Error('live failed'));
    });

    it('merges streaming and regular targets into one observable', (done) => {
      const ds = makeDatasource();
      jest.spyOn(ds, 'executeQueries').mockResolvedValue({ data: ['regular'] });
      const options: any = {
        ...streamingOptions,
        targets: [...streamingOptions.targets, { refId: 'B', query: 'SELECT 2' }],
      };
      const received: any[] = [];
      ds.query(options).subscribe({
        next: (v: any) => {
          received.push(v);
          if (received.length === 2) {
            expect(received).toContainEqual({ data: ['stream'] });
            expect(received).toContainEqual({ data: ['regular'] });
            done();
          }
        },
      });
      observer.next({ data: ['stream'] });
    });
  });
});

describe('executeQueries', () => {
  it('builds queries from the options it receives, not from the datasource-wide this.options', async () => {
    const ds: any = makeDatasource();
    const createQuery = jest.spyOn(ds, 'createQuery').mockResolvedValue({ stmt: 'SELECT 1', requestId: 'rid', keys: [] });
    jest.spyOn(ds, 'seriesQuery').mockResolvedValue({ rows: 0, meta: [], data: [] });

    const passed: any = { range, targets: [], interval: '10s', scopedVars: {} };
    // simulate an overlapping request (e.g. Explore's logs-volume request) that replaced this.options meanwhile
    ds.options = { range, targets: [], interval: '1s', scopedVars: {} };

    await ds.executeQueries([{ refId: 'A', query: 'SELECT 1', format: 'table' }], passed);

    expect(createQuery).toHaveBeenCalledTimes(1);
    expect(createQuery.mock.calls[0][0]).toBe(passed);
  });
});

describe('supplementary queries (issue #782)', () => {
  const logsTarget: any = {
    refId: 'A',
    format: 'logs',
    query: 'SELECT ts, level, msg FROM $table WHERE $timeFilter LIMIT 10',
    dateTimeColDataType: 'ts',
  };
  const makeRequest = (targets: any[]): any => ({ requestId: 'explore_1', range, targets });

  it('advertises logs volume support when asked without a request', () => {
    expect(makeDatasource().getSupportedSupplementaryQueryTypes()).toEqual([SupplementaryQueryType.LogsVolume]);
  });

  it('advertises logs volume support for a request with a usable logs target', () => {
    expect(makeDatasource().getSupportedSupplementaryQueryTypes(makeRequest([logsTarget]))).toEqual([
      SupplementaryQueryType.LogsVolume,
    ]);
  });

  it('reports no support for a request without logs targets, so Explore keeps its own histogram', () => {
    expect(
      makeDatasource().getSupportedSupplementaryQueryTypes(makeRequest([{ ...logsTarget, format: 'table' }]))
    ).toEqual([]);
  });

  it('reports no support for a logs target without a timestamp column', () => {
    expect(
      makeDatasource().getSupportedSupplementaryQueryTypes(makeRequest([{ ...logsTarget, dateTimeColDataType: '' }]))
    ).toEqual([]);
  });

  it('rewrites a logs_volume target into the aggregate before createQuery', async () => {
    const ds: any = makeDatasource();
    ds.resourceClient = {
      getMultipleAstProperties: jest
        .fn()
        .mockResolvedValue({ properties: { with: [], from: ['$table'], where: ['$timeFilter'] } }),
    };
    const createQuery = jest
      .spyOn(ds, 'createQuery')
      .mockResolvedValue({ stmt: 'x', requestId: 'r', keys: [] });
    jest.spyOn(ds, 'seriesQuery').mockResolvedValue({ rows: 0, meta: [], data: [] });

    const options: any = { range, targets: [], scopedVars: {} };
    await ds.executeQueries(
      [{ ...logsTarget, format: LOGS_VOLUME_FORMAT, _levelColumn: 'level' }],
      options
    );

    const rewritten: any = createQuery.mock.calls[0][1];
    expect(rewritten.query).toMatch(/^SELECT \$timeSeries AS t, sum\(multiSearchAny/);
    expect(rewritten.query).not.toMatch(/LIMIT/i);
  });

  it('routes a logs_volume response through toLogsVolume', () => {
    const target: any = { refId: 'A', format: LOGS_VOLUME_FORMAT };
    const result: any = makeDatasource().processQueryResponse(
      [
        {
          rows: 2,
          meta: [
            { name: 't', type: 'UInt64' },
            { name: 'error', type: 'UInt64' },
            { name: 'info', type: 'UInt64' },
          ],
          data: [
            { t: '1704067200000', error: 1, info: 5 },
            { t: '1704067260000', error: 0, info: 7 },
          ],
        },
      ],
      { targets: [target], range, rangeRaw: {} },
      [{ keys: [] }],
      [target]
    );

    expect(result.data).toHaveLength(2);
    expect(result.data.map((frame: any) => frame.fields[1].labels.level)).toEqual(['error', 'info']);
    result.data.forEach((frame: any) => {
      expect([...frame.fields[0].values]).toEqual([1704067200000, 1704067260000]);
    });
  });
});
