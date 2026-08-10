import { act, renderHook, waitFor } from '@testing-library/react';
import { useConnectionData } from './useConnectionData';
import { TimestampFormat } from '../../../../../types/types';

const DATABASES_QUERY = 'SELECT name FROM system.databases ORDER BY name';

const makeDatasource = (rows: any[] = [{ text: 'db1' }, { text: 'db2' }]) => ({
  metricFindQuery: jest.fn().mockResolvedValue(rows),
});

const calls = (ds: any): string[] => ds.metricFindQuery.mock.calls.map((c: any[]) => c[0]);

describe('useConnectionData', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches databases on mount and maps {text} to {label, value}', async () => {
    const ds = makeDatasource();
    const { result } = renderHook(() => useConnectionData({}, ds));
    await waitFor(() =>
      expect(result.current[0]).toEqual([
        { label: 'db1', value: 'db1' },
        { label: 'db2', value: 'db2' },
      ])
    );
    expect(ds.metricFindQuery).toHaveBeenCalledWith(DATABASES_QUERY);
  });

  it('queries tables only after a database is selected', async () => {
    const ds = makeDatasource([{ text: 't1' }]);
    const { result } = renderHook(() => useConnectionData({}, ds));
    await waitFor(() => expect(ds.metricFindQuery).toHaveBeenCalled());
    expect(calls(ds).some((q) => q.includes('system.tables'))).toBe(false);

    act(() => result.current[6]('mydb'));
    await waitFor(() => expect(calls(ds).some((q) => q.includes("system.tables WHERE database = 'mydb'"))).toBe(true));
    await waitFor(() => expect(result.current[1]).toEqual([{ label: 't1', value: 't1' }]));
  });

  it('fetches date columns when database and table are set', async () => {
    const ds = makeDatasource([{ text: 'd' }]);
    renderHook(() => useConnectionData({ database: 'db', table: 'tbl' }, ds));
    await waitFor(() => {
      const dateQuery = calls(ds).find((q) => q.includes("'Date','Date32'"));
      expect(dateQuery).toContain("database = 'db'");
      expect(dateQuery).toContain("table = 'tbl'");
      expect(dateQuery).toContain("UNION ALL SELECT ' ' AS name");
    });
  });

  it.each([
    [TimestampFormat.DateTime, ["substring(type,1,8) = 'DateTime'", "substring(type,1,10) != 'DateTime64'"]],
    [TimestampFormat.DateTime64, ["substring(type,1,10) = 'DateTime64'"]],
    [TimestampFormat.TimeStamp, ["type = 'UInt32'"]],
    [TimestampFormat.TimeStamp64_3, ["type LIKE '%UInt64%'"]],
    [TimestampFormat.TimeStamp64_6, ["type LIKE '%UInt64%'"]],
    [TimestampFormat.TimeStamp64_9, ["type LIKE '%UInt64%'"]],
    [TimestampFormat.Float, ["type LIKE '%Float%'", "type LIKE '%Decimal%'"]],
  ])('builds the timestamp column query for %s', async (type, fragments) => {
    const ds = makeDatasource([{ text: 'c' }]);
    const { result } = renderHook(() => useConnectionData({ database: 'db', table: 'tbl' }, ds));
    act(() => result.current[10](type));
    await waitFor(() => {
      const q = calls(ds).find((c) => fragments.every((f: string) => c.includes(f)));
      expect(q).toBeDefined();
      expect(q).toContain("database = 'db'");
    });
    await waitFor(() => expect(result.current[3]).toEqual([{ label: 'c', value: 'c' }]));
  });

  it('returns [] for an unknown timestamp type without issuing a query', async () => {
    const ds = makeDatasource([{ text: 'c' }]);
    const { result } = renderHook(() => useConnectionData({ database: 'db', table: 'tbl' }, ds));
    act(() => result.current[10]('BOGUS'));
    // date-columns query still runs; the unknown type must not
    await waitFor(() => expect(calls(ds).some((q) => q.includes("'Date','Date32'"))).toBe(true));
    expect(ds.metricFindQuery).not.toHaveBeenCalledWith(undefined);
    expect(result.current[3]).toEqual([]);
  });

  it('handles permission errors on DATABASES with an empty list and console.info', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const ds = { metricFindQuery: jest.fn().mockRejectedValue({ status: 497 }) };
    const { result } = renderHook(() => useConnectionData({}, ds));
    await waitFor(() => expect(info).toHaveBeenCalledWith(expect.stringContaining('DATABASES')));
    expect(result.current[0]).toEqual([]);
    info.mockRestore();
  });

  it('handles permission errors on TABLES with an empty list and console.info', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const ds = {
      metricFindQuery: jest.fn((q: string) =>
        q.includes('system.tables') ? Promise.reject({ status: 497 }) : Promise.resolve([{ text: 'db1' }])
      ),
    };
    const { result } = renderHook(() => useConnectionData({ database: 'db' }, ds));
    await waitFor(() => expect(info).toHaveBeenCalledWith(expect.stringContaining('TABLES')));
    expect(result.current[1]).toEqual([]);
    info.mockRestore();
  });

  it('handles generic errors with an empty list and console.error', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const ds = { metricFindQuery: jest.fn().mockRejectedValue(new Error('boom')) };
    const { result } = renderHook(() => useConnectionData({}, ds));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Failed to fetch databases:', expect.any(Error)));
    expect(result.current[0]).toEqual([]);
    error.mockRestore();
  });

  it('seeds selection state from the query', async () => {
    const ds = makeDatasource();
    const query = {
      database: 'db',
      table: 'tbl',
      dateTimeColDataType: 'ts_col',
      dateColDataType: 'date_col',
      dateTimeType: TimestampFormat.DateTime64,
    };
    const { result } = renderHook(() => useConnectionData(query, ds));
    expect(result.current[4]).toBe('ts_col');
    expect(result.current[5]).toBe('date_col');
    expect(result.current[11]).toBe('tbl');
    expect(result.current[12]).toBe('db');
    expect(result.current[13]).toBe(TimestampFormat.DateTime64);
    await waitFor(() => expect(ds.metricFindQuery).toHaveBeenCalled());
  });
});
