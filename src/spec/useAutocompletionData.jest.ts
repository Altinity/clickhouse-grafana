import { renderHook, waitFor } from '@testing-library/react';
import { useAutocompleteData } from '../views/QueryEditor/hooks/useAutocompletionData';

jest.mock('../utils/indexedDBManager', () => ({
  IndexedDBManager: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    cleanupExpiredByPrefix: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('useAutocompleteData permission error detection (issue #816)', () => {
  it('sets hasPermissionError when the error carries the ClickHouse exception text', async () => {
    // Grafana >= 12.5 keeps the text/plain error body, so the first error is classifiable
    const datasource = {
      uid: 'clickhouse-limited',
      metricFindQuery: jest.fn().mockRejectedValue({
        status: 500,
        data: 'Code: 497. DB::Exception: grafana_limited: Not enough privileges. (ACCESS_DENIED)',
        message:
          'Code: 497. DB::Exception: grafana_limited: Not enough privileges. (ACCESS_DENIED)',
      }),
    };

    const { result } = renderHook(() => useAutocompleteData(datasource));

    await waitFor(() => expect(result.current.hasPermissionError).toBe(true));
    expect(datasource.metricFindQuery).toHaveBeenCalledTimes(1);
  });

  it('retries with http_write_exception_in_output_format when the error body was lost (Grafana <= 12.4)', async () => {
    // Grafana <= 12.4 fails to parse the text/plain ClickHouse error as JSON and
    // delivers { status: 500, data: {} } - nothing to classify. The hook must retry
    // once with SETTINGS http_write_exception_in_output_format=1 so ClickHouse
    // returns the exception as a JSON field the classifier understands.
    const metricFindQuery = jest
      .fn()
      .mockRejectedValueOnce({ status: 500, statusText: 'Internal Server Error', data: {} })
      .mockRejectedValueOnce({
        status: 500,
        data: {
          exception:
            'Code: 497. DB::Exception: grafana_limited: Not enough privileges. To execute this query, ' +
            "it's necessary to have the grant SELECT ON system.merge_tree_settings. (ACCESS_DENIED)",
        },
      });
    const datasource = { uid: 'clickhouse-limited', metricFindQuery };

    const { result } = renderHook(() => useAutocompleteData(datasource));

    await waitFor(() => expect(result.current.hasPermissionError).toBe(true));
    expect(metricFindQuery).toHaveBeenCalledTimes(2);
    expect(metricFindQuery.mock.calls[1][0]).toContain('http_write_exception_in_output_format=1');
  });

  it('recovers autocomplete data when the retry succeeds', async () => {
    // Transient failure: the retry may simply succeed - use its data.
    const metricFindQuery = jest
      .fn()
      .mockRejectedValueOnce({ status: 500, data: {} })
      .mockResolvedValueOnce([{ completion: 'count', color: 'identifier' }]);
    const datasource = { uid: 'clickhouse-limited', metricFindQuery };

    const { result } = renderHook(() => useAutocompleteData(datasource));

    await waitFor(() => expect(result.current.data).toEqual({ identifier: ['count'] }));
    expect(result.current.hasPermissionError).toBe(false);
  });

  it('keeps the generic-error behavior when the retry error is not permission-related', async () => {
    // Old ClickHouse without http_write_exception_in_output_format: the retry fails
    // with an unknown-setting error - autocomplete stays silently disabled, no badge.
    const metricFindQuery = jest
      .fn()
      .mockRejectedValueOnce({ status: 500, data: {} })
      .mockRejectedValueOnce({
        status: 500,
        data: { exception: "Code: 115. DB::Exception: Unknown setting 'http_write_exception_in_output_format'" },
      });
    const datasource = { uid: 'clickhouse-limited', metricFindQuery };

    const { result } = renderHook(() => useAutocompleteData(datasource));

    await waitFor(() => expect(result.current.data).toEqual({}));
    expect(result.current.hasPermissionError).toBe(false);
  });
});
