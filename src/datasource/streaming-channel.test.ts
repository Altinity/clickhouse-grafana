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

import { getGrafanaLiveSrv, getTemplateSrv } from '@grafana/runtime';
import { CHDataSource } from './datasource';

const UID = 'P7B13B9DF4C1A1690';
const QUERY = "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter AND host = '$host' GROUP BY t";

let capturedPaths: string[] = [];

beforeEach(() => {
  capturedPaths = [];
  (getTemplateSrv as jest.Mock).mockReturnValue({
    replace: (target: string, scopedVars?: any) =>
      (target || '').replace(/\$(\w+)/g, (match: string, name: string) => scopedVars?.[name]?.value ?? match),
  });
  (getGrafanaLiveSrv as jest.Mock).mockReturnValue({
    getDataStream: (opts: any) => {
      capturedPaths.push(opts.addr.path);
      return { subscribe: jest.fn() };
    },
  });
});

const makeDatasource = () =>
  new CHDataSource({ uid: UID, url: 'http://localhost:8123', meta: { id: 'x' }, jsonData: {} } as any);

const channelPath = (target: any = {}, options: any = {}): string => {
  capturedPaths = [];
  makeDatasource().query({
    interval: '30s',
    maxDataPoints: 800,
    scopedVars: {},
    range: {
      from: { toISOString: () => '2026-08-03T10:00:00.000Z' },
      to: { toISOString: () => '2026-08-03T11:00:00.000Z' },
    },
    ...options,
    targets: [{ refId: 'A', streaming: true, query: QUERY, ...target }],
  } as any);
  return capturedPaths[0];
};

describe('streaming Live channel path', () => {
  it('gives repeated panels their own channel when a variable interpolates differently', () => {
    const web1 = channelPath({}, { scopedVars: { host: { value: 'web-1' } } });
    const web2 = channelPath({}, { scopedVars: { host: { value: 'web-2' } } });

    expect(web1).not.toBe(web2);
  });

  it.each([
    ['format', { format: 'time_series' }, { format: 'table' }],
    ['database', { database: 'default' }, { database: 'analytics' }],
    ['table', { table: 'a' }, { table: 'b' }],
    ['streaming mode', { streamingMode: 'delta' }, { streamingMode: 'full' }],
    ['streaming interval', { streamingInterval: 5000 }, { streamingInterval: 10000 }],
    ['streaming lookback', { streamingLookback: 1 }, { streamingLookback: 5 }],
    ['dateTimeColDataType', { dateTimeColDataType: 'event_time' }, { dateTimeColDataType: 'created_at' }],
  ])('gives queries differing in %s their own channel', (_name, left, right) => {
    expect(channelPath(left)).not.toBe(channelPath(right));
  });

  it('gives queries differing in $interval their own channel', () => {
    expect(channelPath({}, { interval: '30s' })).not.toBe(channelPath({}, { interval: '1m' }));
  });

  it('gives queries differing only in the time range end their own channel', () => {
    const path = channelPath({}, {
      range: {
        from: { toISOString: () => '2026-08-03T10:00:00.000Z' },
        to: { toISOString: () => '2026-08-03T12:00:00.000Z' },
      },
    });

    expect(path).not.toBe(channelPath());
  });

  it('keeps identical queries on one shared channel', () => {
    expect(channelPath()).toBe(channelPath());
  });

  it('ignores maxDataPoints so panel resizing does not resubscribe', () => {
    expect(channelPath({}, { maxDataPoints: 800 })).toBe(channelPath({}, { maxDataPoints: 1600 }));
  });

  it('stays within the channel id length and charset Grafana Live allows', () => {
    const path = channelPath();

    expect(path).toMatch(/^stream\/A\/[0-9a-z]+$/);
    expect(`ds/${UID}/${path}`.length).toBeLessThan(160);
  });
});
