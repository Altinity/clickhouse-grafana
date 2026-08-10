import { renderHook, waitFor } from '@testing-library/react';
import { useSystemDatabases } from './useSystemDatabases';
import { IndexedDBManager } from '../../../utils/indexedDBManager';

jest.mock('../../../utils/indexedDBManager', () => ({
  IndexedDBManager: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    cleanupExpiredByPrefix: jest.fn().mockResolvedValue(undefined),
  },
}));

const mocked = IndexedDBManager as jest.Mocked<typeof IndexedDBManager>;

describe('useSystemDatabases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.getItem.mockResolvedValue(null);
    mocked.setItem.mockResolvedValue(undefined);
    mocked.cleanupExpiredByPrefix.mockResolvedValue(undefined as any);
  });

  it('returns cached data without querying the datasource', async () => {
    mocked.getItem.mockResolvedValue(['a', 'b']);
    const datasource = { uid: 'uid1', metricFindQuery: jest.fn() };
    const { result } = renderHook(() => useSystemDatabases(datasource));
    await waitFor(() => expect(result.current).toEqual(['a', 'b']));
    expect(datasource.metricFindQuery).not.toHaveBeenCalled();
  });

  it('queries on cache miss, maps to text and caches with a 10 minute TTL', async () => {
    const datasource = {
      uid: 'uid1',
      metricFindQuery: jest.fn().mockResolvedValue([{ text: 'functions' }, { text: 'tables' }]),
    };
    const { result } = renderHook(() => useSystemDatabases(datasource));
    await waitFor(() => expect(result.current).toEqual(['functions', 'tables']));
    expect(mocked.setItem).toHaveBeenCalledWith('altinity_systemDatabases_uid1', ['functions', 'tables'], 10);
  });

  it('caches an empty result on permission error and logs via console.info', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const datasource = {
      uid: 'uid1',
      metricFindQuery: jest.fn().mockRejectedValue({ status: 497, message: 'ACCESS_DENIED' }),
    };
    const { result } = renderHook(() => useSystemDatabases(datasource));
    await waitFor(() => expect(result.current).toEqual([]));
    expect(mocked.setItem).toHaveBeenCalledWith('altinity_systemDatabases_uid1', [], 10);
    expect(info).toHaveBeenCalledWith(expect.stringContaining('uid1'));
    info.mockRestore();
  });

  it('returns [] on generic errors without caching', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const datasource = { uid: 'uid1', metricFindQuery: jest.fn().mockRejectedValue(new Error('boom')) };
    const { result } = renderHook(() => useSystemDatabases(datasource));
    await waitFor(() => expect(result.current).toEqual([]));
    expect(mocked.setItem).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('Failed to fetch system databases:', expect.any(Error));
    error.mockRestore();
  });

  it('swallows cleanup failures and still fetches', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.cleanupExpiredByPrefix.mockRejectedValue(new Error('cleanup failed'));
    const datasource = { uid: 'uid1', metricFindQuery: jest.fn().mockResolvedValue([{ text: 'db' }]) };
    const { result } = renderHook(() => useSystemDatabases(datasource));
    await waitFor(() => expect(result.current).toEqual(['db']));
    expect(error).toHaveBeenCalledWith('Failed to cleanup expired system databases data:', expect.any(Error));
    error.mockRestore();
  });
});
