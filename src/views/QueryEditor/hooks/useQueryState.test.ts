import { renderHook, waitFor } from '@testing-library/react';
import { useQueryState } from './useQueryState';
import { IndexedDBManager } from '../../../utils/indexedDBManager';
import { DEFAULT_FORMAT, defaultQuery } from '../../constants';

jest.mock('../../../utils/indexedDBManager', () => ({
  IndexedDBManager: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    limitQueryStatesPerDatasource: jest.fn().mockResolvedValue(0),
  },
}));

const mocked = IndexedDBManager as jest.Mocked<typeof IndexedDBManager>;
const datasource = { name: 'ds', uid: 'uid1' };
const accessKey = 'dataStorage_ds_uid1_A';
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('useQueryState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.getItem.mockResolvedValue(null);
    mocked.setItem.mockResolvedValue(undefined);
    mocked.limitQueryStatesPerDatasource.mockResolvedValue(0);
  });

  const render = (query: any = { refId: 'A', query: 'SELECT 1' }, onChange = jest.fn()) => ({
    onChange,
    ...renderHook(() => useQueryState(query, onChange, datasource)),
  });

  it('does not call onChange when nothing is stored, but still limits query states', async () => {
    const { onChange } = render();
    await waitFor(() => expect(mocked.limitQueryStatesPerDatasource).toHaveBeenCalledWith('uid1'));
    expect(mocked.getItem).toHaveBeenCalledWith(accessKey);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('resets the query when a fresh record from another panel is found', async () => {
    mocked.getItem.mockResolvedValue({ name: 'dataStorage_other', timestamp: Date.now() });
    const { onChange } = render({ refId: 'A', query: 'SELECT 1', database: 'db', table: 't' });
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const reset = onChange.mock.calls[0][0];
    expect(reset.format).toBe(DEFAULT_FORMAT);
    expect(reset.query).toBe(defaultQuery);
    expect(reset.formattedQuery).toBe('SELECT 1');
    expect(reset.database).toBeUndefined();
    expect(reset.table).toBeUndefined();
    expect(reset.dateColDataType).toBeUndefined();
    expect(reset.dateTimeColDataType).toBeUndefined();
  });

  it('does not reset when the stored name matches the own access key', async () => {
    mocked.getItem.mockResolvedValue({ name: accessKey, timestamp: Date.now() });
    const { onChange } = render();
    await waitFor(() => expect(mocked.limitQueryStatesPerDatasource).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not reset when the stored record is older than 5 seconds', async () => {
    mocked.getItem.mockResolvedValue({ name: 'dataStorage_other', timestamp: Date.now() - 6000 });
    const { onChange } = render();
    await waitFor(() => expect(mocked.limitQueryStatesPerDatasource).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stores its state and re-limits on unmount, swallowing rejections', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render();
    await waitFor(() => expect(mocked.limitQueryStatesPerDatasource).toHaveBeenCalledTimes(1));

    mocked.setItem.mockRejectedValue(new Error('quota'));
    mocked.limitQueryStatesPerDatasource.mockRejectedValue(new Error('limit'));
    unmount();

    expect(mocked.setItem).toHaveBeenCalledWith(accessKey, { name: accessKey, timestamp: expect.any(Number) }, 60);
    expect(mocked.limitQueryStatesPerDatasource).toHaveBeenCalledTimes(2);
    await flush();
    expect(error).toHaveBeenCalledWith('Failed to store query state on unmount:', expect.any(Error));
    expect(error).toHaveBeenCalledWith('Failed to limit query states on unmount:', expect.any(Error));
    error.mockRestore();
  });

  it('logs and survives a getItem failure', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.getItem.mockRejectedValue(new Error('idb down'));
    const { onChange } = render();
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Failed to initialize query state:', expect.any(Error))
    );
    expect(onChange).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
