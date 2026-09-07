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

import { getBackendSrv, getGrafanaLiveSrv, getTemplateSrv } from '@grafana/runtime';
import { firstValueFrom } from 'rxjs';
import { CHDataSource } from './datasource';

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
