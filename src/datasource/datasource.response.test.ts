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
import { firstValueFrom } from 'rxjs';
import { CHDataSource } from './datasource';
import { DatasourceMode } from '../types/types';

beforeEach(() => {
  (getTemplateSrv as jest.Mock).mockReturnValue({
    replace: (q: string) => q,
    getVariables: () => [],
  });
});

const makeDatasource = () =>
  new CHDataSource({ uid: 'UID', url: 'http://localhost:8123', meta: { id: 'x' }, jsonData: {} } as any);

const range = { from: new Date('2024-01-01T00:00:00Z'), to: new Date('2024-01-01T01:00:00Z') };

const makeOptions = (target: any) => ({ targets: [target], range, rangeRaw: { to: 'now' } });

const tsResponse = {
  rows: 2,
  meta: [
    { name: 't', type: 'UInt64' },
    { name: 'good', type: 'UInt64' },
  ],
  data: [
    { t: 1704067200000, good: 1 },
    { t: 1704067260000, good: 3 },
  ],
};

describe('processQueryResponse', () => {
  it('skips null and rows-less responses', () => {
    const ds = makeDatasource();
    const options = { targets: [{ refId: 'A' }, { refId: 'B' }], range, rangeRaw: {} };
    const result = ds.processQueryResponse([null, { data: [], meta: [] }], options, [{ keys: [] }, { keys: [] }]);
    expect(result).toEqual({ data: [] });
  });

  it('renders table format via toTable', () => {
    const ds = makeDatasource();
    const result = ds.processQueryResponse([tsResponse], makeOptions({ refId: 'A', format: 'table' }), [{ keys: [] }]);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].columns.map((c: any) => c.text)).toEqual(['t', 'good']);
    expect(result.data[0].type).toBe('table');
  });

  it('renders logs format via toLogs', () => {
    const ds = makeDatasource();
    const response = {
      rows: 1,
      meta: [
        { name: 'event_time', type: 'DateTime' },
        { name: 'content', type: 'String' },
      ],
      data: [{ event_time: '2024-01-01 00:00:00', content: 'hello' }],
    };
    const result = ds.processQueryResponse([response], makeOptions({ refId: 'A', format: 'logs' }), [{ keys: [] }]);
    expect(result.data).toHaveLength(1);
    const body = result.data[0].fields.find((f: any) => f.name === 'body');
    expect(body.values[0] ?? body.values.get(0)).toBe('hello');
  });

  it('renders annotations for refId Anno', () => {
    const ds = makeDatasource();
    const response = {
      rows: 1,
      meta: [{ name: 'time', type: 'UInt64' }],
      data: [{ time: '1704067200000', title: 'T', text: 'txt', tags: 'a,b' }],
    };
    const result = ds.processQueryResponse([response], makeOptions({ refId: 'Anno' }), [{ keys: [] }]);
    const fields = result.data[0].fields;
    expect(fields.find((f: any) => f.name === 'time').values).toEqual([1704067200000]);
    expect(fields.find((f: any) => f.name === 'tags').values).toEqual([['a', 'b']]);
  });

  it('renders traces format via toTraces', () => {
    const ds = makeDatasource();
    const response = {
      rows: 1,
      meta: [{ name: 'startTime', type: 'UInt64' }],
      data: [
        {
          traceID: 't1',
          spanID: 's1',
          parentSpanID: null,
          serviceName: 'svc',
          startTime: '1704067200000',
          duration: 5,
          operationName: 'op',
          tags: {},
          serviceTags: {},
        },
      ],
    };
    const result = ds.processQueryResponse([response], makeOptions({ refId: 'A', format: 'traces' }), [{ keys: [] }]);
    expect(result.data[0].fields.find((f: any) => f.name === 'traceID').values).toEqual(['t1']);
  });

  it('renders flamegraph format via toFlamegraph', () => {
    const ds = makeDatasource();
    const response = {
      rows: 1,
      meta: [],
      data: [{ label: 'fn', level: 1, value: '10', self: 10 }],
    };
    const result = ds.processQueryResponse([response], makeOptions({ refId: 'A', format: 'flamegraph' }), [
      { keys: [] },
    ]);
    expect(result.data[0].fields.find((f: any) => f.name === 'label').values).toEqual(['all', 'fn']);
  });

  it('renders time series by default', () => {
    const ds = makeDatasource();
    const result = ds.processQueryResponse([tsResponse], makeOptions({ refId: 'A' }), [{ keys: [] }]);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].fields[0].values).toEqual([1704067200000, 1704067260000]);
    expect(result.data[0].fields[1].values).toEqual([1, 3]);
  });

  describe('DatasourceMode.Variable branch', () => {
    const variableTarget = { refId: 'A', datasourceMode: DatasourceMode.Variable };
    const run = (meta: any[], data: any[]) =>
      makeDatasource().processQueryResponse([{ rows: data.length || 1, meta, data }], makeOptions(variableTarget), [
        { keys: [] },
      ]);

    it('maps text and value columns to two stringified fields', () => {
      const result = run(
        [
          { name: 'my_text', type: 'String' },
          { name: 'my_value', type: 'UInt64' },
        ],
        [{ my_text: 'a', my_value: 1 }]
      );
      expect(result.data[0].fields).toEqual([
        { name: 'text', type: 'string', values: ['a'] },
        { name: 'value', type: 'string', values: ['1'] },
      ]);
    });

    it('maps a lone text column', () => {
      const result = run([{ name: 'text', type: 'String' }], [{ text: 'a' }]);
      expect(result.data[0].fields).toEqual([{ name: 'text', type: 'string', values: ['a'] }]);
    });

    it('falls back to the first String column', () => {
      const result = run(
        [
          { name: 'num', type: 'UInt64' },
          { name: 'label', type: 'String' },
        ],
        [{ num: 1, label: 'x' }]
      );
      expect(result.data[0].fields).toEqual([{ name: 'text', type: 'string', values: ['x'] }]);
    });

    it('falls back to the first meta column when no String column exists', () => {
      const result = run([{ name: 'num', type: 'UInt64' }], [{ num: 7 }]);
      expect(result.data[0].fields).toEqual([{ name: 'text', type: 'string', values: [7] }]);
    });

    it('yields an empty field list for empty meta', () => {
      const result = run([], []);
      expect(result.data[0].fields).toEqual([{ name: 'text', type: 'string', values: [] }]);
    });
  });
});

describe('queryVariables', () => {
  const setup = (response: any) => {
    const ds = makeDatasource();
    const createQuery = jest
      .spyOn(ds, 'createQuery')
      .mockImplementation(async (_o: any, target: any) => ({ keys: [], requestId: 'r', stmt: target.query }));
    jest.spyOn(ds as any, 'seriesQuery').mockResolvedValue(response);
    return { ds, createQuery };
  };

  const baseOptions: any = { range, rangeRaw: {}, scopedVars: {} };

  it('returns empty data for hidden or empty targets', async () => {
    const { ds } = setup(null);
    const inner: any = await firstValueFrom(ds.queryVariables({ ...baseOptions, targets: [{ hide: true, query: 'q' }, { query: '  ' }] }));
    // empty-target path wraps its result in a nested observable
    expect(await firstValueFrom(inner)).toEqual({ data: [] });
  });

  it('coerces a bare string target into a Variable-mode query', async () => {
    const { ds, createQuery } = setup({
      rows: 1,
      meta: [{ name: 'text', type: 'String' }],
      data: [{ text: 'v' }],
    });
    const result: any = await firstValueFrom(ds.queryVariables({ ...baseOptions, targets: ['SELECT x'] } as any));
    expect(createQuery).toHaveBeenCalledWith(expect.anything(), {
      query: 'SELECT x',
      datasourceMode: DatasourceMode.Variable,
    });
    expect(result.data[0].fields).toEqual([{ name: 'text', type: 'string', values: ['v'] }]);
  });

  it('maps text and value columns end-to-end', async () => {
    const { ds } = setup({
      rows: 1,
      meta: [
        { name: '__text', type: 'String' },
        { name: '__value', type: 'UInt64' },
      ],
      data: [{ __text: 'a', __value: 5 }],
    });
    const result: any = await firstValueFrom(ds.queryVariables({ ...baseOptions, targets: [{ refId: 'A', query: 'SELECT x' }] }));
    expect(result.data[0].fields).toEqual([
      { name: 'text', type: 'string', values: ['a'] },
      { name: 'value', type: 'string', values: ['5'] },
    ]);
  });

  it('falls back to the first meta column when nothing matches', async () => {
    const { ds } = setup({
      rows: 1,
      meta: [{ name: 'num', type: 'UInt64' }],
      data: [{ num: 9 }],
    });
    const result: any = await firstValueFrom(ds.queryVariables({ ...baseOptions, targets: [{ refId: 'A', query: 'SELECT x' }] }));
    expect(result.data[0].fields).toEqual([{ name: 'text', type: 'string', values: [9] }]);
  });

  it('falls back to the first String column', async () => {
    const { ds } = setup({
      rows: 1,
      meta: [
        { name: 'num', type: 'UInt64' },
        { name: 'label', type: 'String' },
      ],
      data: [{ num: 1, label: 'x' }],
    });
    const result: any = await firstValueFrom(ds.queryVariables({ ...baseOptions, targets: [{ refId: 'A', query: 'SELECT x' }] }));
    expect(result.data[0].fields).toEqual([{ name: 'text', type: 'string', values: ['x'] }]);
  });

  it('handles rows with empty meta', async () => {
    const { ds } = setup({ rows: 1, meta: [], data: [] });
    const result: any = await firstValueFrom(ds.queryVariables({ ...baseOptions, targets: [{ refId: 'A', query: 'SELECT x' }] }));
    expect(result.data[0].fields).toEqual([{ name: 'text', type: 'string', values: [] }]);
  });

  it('skips responses without rows', async () => {
    const { ds } = setup({ meta: [], data: [] });
    const result: any = await firstValueFrom(ds.queryVariables({ ...baseOptions, targets: [{ refId: 'A', query: 'SELECT x' }] }));
    expect(result).toEqual({ data: [] });
  });
});
