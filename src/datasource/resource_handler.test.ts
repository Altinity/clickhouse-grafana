jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(),
}));

import { getBackendSrv } from '@grafana/runtime';
import { ClickHouseResourceClient } from './resource_handler';

let fetchMock: jest.Mock;

const respondWith = (data: any) => {
  fetchMock.mockReturnValue({ subscribe: (next: any) => next({ data }) });
};

const getClient = (uid = 'UID') => {
  const client = ClickHouseResourceClient.getInstance();
  client.setDatasourceUid(uid);
  return client;
};

beforeEach(() => {
  fetchMock = jest.fn();
  (getBackendSrv as jest.Mock).mockReturnValue({ fetch: fetchMock });
  // singleton captures backendSrv at construction; reset after the mock is in place
  (ClickHouseResourceClient as any).instance = undefined;
});

describe('ClickHouseResourceClient', () => {
  it('returns the same singleton instance', () => {
    expect(ClickHouseResourceClient.getInstance()).toBe(ClickHouseResourceClient.getInstance());
  });

  it('rejects when the datasource uid is not set', async () => {
    await expect(ClickHouseResourceClient.getInstance().createQuery({})).rejects.toThrow('Datasource UID not set');
  });

  it('POSTs to the datasource resource URL and resolves response.data', async () => {
    respondWith({ ok: true });
    await expect(getClient().createQuery({ q: 1 })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith({
      url: '/api/datasources/uid/UID/resources/createQuery',
      method: 'POST',
      data: { q: 1 },
    });
  });

  it('rejects on transport errors', async () => {
    fetchMock.mockReturnValue({ subscribe: (_next: any, err: any) => err(new Error('down')) });
    await expect(getClient().createQuery({})).rejects.toThrow('down');
  });

  it('applyAdhocFilters unwraps response.query', async () => {
    respondWith({ query: 'SELECT filtered' });
    await expect(getClient().applyAdhocFilters('SELECT 1', [{ key: 'k' }], { refId: 'A' })).resolves.toBe(
      'SELECT filtered'
    );
    expect(fetchMock.mock.calls[0][0].data).toEqual({
      query: 'SELECT 1',
      adhocFilters: [{ key: 'k' }],
      target: { refId: 'A' },
    });
  });

  it('getAstProperty forwards the property name', async () => {
    respondWith({ properties: ['host'] });
    await expect(getClient().getAstProperty('SELECT 1', 'group by')).resolves.toEqual({ properties: ['host'] });
    expect(fetchMock.mock.calls[0][0].data).toEqual({ query: 'SELECT 1', propertyName: 'group by' });
  });

  it('replaceTimeFilters sends the range as ISO strings and unwraps response.sql', async () => {
    respondWith({ sql: 'SELECT tf' });
    const range = { from: new Date('2024-01-01T00:00:00Z'), to: new Date('2024-01-01T01:00:00Z') };
    await expect(getClient().replaceTimeFilters('SELECT 1', range, 'DATETIME')).resolves.toBe('SELECT tf');
    expect(fetchMock.mock.calls[0][0].data).toEqual({
      query: 'SELECT 1',
      timeRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-01T01:00:00.000Z' },
      dateTimeType: 'DATETIME',
    });
  });

  it('createQueryWithAdhoc defaults null adhoc filters to []', async () => {
    respondWith({ sql: 'SELECT 1' });
    await getClient().createQueryWithAdhoc({ query: 'SELECT 1' }, null as any);
    expect(fetchMock.mock.calls[0][0].data).toEqual({ query: 'SELECT 1', adhocFilters: [] });
  });

  it('processQueryBatch defaults filters and extract properties to []', async () => {
    respondWith({ sql: 'SELECT 1', keys: [], properties: {} });
    const client = getClient();
    await client.processQueryBatch({ query: 'SELECT 1' }, null as any, null as any);
    await client.processQueryBatch({ query: 'SELECT 1' }, null as any);
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toMatchObject({
        url: '/api/datasources/uid/UID/resources/processQueryBatch',
        data: { query: 'SELECT 1', adhocFilters: [], extractProperties: [] },
      });
    }
  });

  it('getMultipleAstProperties sends the property list', async () => {
    respondWith({ properties: { select: [], where: [] } });
    await expect(getClient().getMultipleAstProperties('SELECT 1', ['select', 'where'])).resolves.toEqual({
      properties: { select: [], where: [] },
    });
    expect(fetchMock.mock.calls[0][0].data).toEqual({ query: 'SELECT 1', properties: ['select', 'where'] });
  });
});
