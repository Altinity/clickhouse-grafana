import { renderHook, waitFor } from '@testing-library/react';
import { useFormattedData } from './useFormattedData';

jest.mock('./useSystemDatabases', () => ({ useSystemDatabases: jest.fn().mockReturnValue(null) }));
jest.mock('./useAutocompletionData', () => ({
  useAutocompleteData: jest.fn().mockReturnValue({ data: null, hasPermissionError: false }),
}));

const query = { query: 'SELECT $x' } as any;

const makeDatasource = (overrides: any = {}) =>
  ({
    name: 'ds',
    templateSrv: {},
    options: { range: { from: 1, to: 2 } },
    replace: jest.fn().mockResolvedValue({ stmt: 'SELECT replaced' }),
    ...overrides,
  } as any);

describe('useFormattedData', () => {
  it('replaces the query when range and templateSrv are available', async () => {
    const ds = makeDatasource();
    const { result } = renderHook(() => useFormattedData(query, ds));
    await waitFor(() => expect(result.current[0]).toBe('SELECT replaced'));
    expect(result.current[1]).toBeNull();
    expect(ds.replace).toHaveBeenCalledWith(ds.options, query);
  });

  it('falls back to the raw query with the error text on structured replace failure', async () => {
    const ds = makeDatasource({ replace: jest.fn().mockRejectedValue({ data: { error: 'x' } }) });
    const { result } = renderHook(() => useFormattedData(query, ds));
    await waitFor(() => expect(result.current[1]).toBe('x'));
    expect(result.current[0]).toBe('SELECT $x');
  });

  it('stringifies plain errors from replace', async () => {
    const ds = makeDatasource({ replace: jest.fn().mockRejectedValue(new Error('bad')) });
    const { result } = renderHook(() => useFormattedData(query, ds));
    await waitFor(() => expect(result.current[1]).toBe('Error: bad'));
  });

  it('passes the query through without error when there is no execution context', async () => {
    const ds = makeDatasource({ options: undefined });
    const { result } = renderHook(() => useFormattedData(query, ds));
    await waitFor(() => expect(result.current[0]).toBe('SELECT $x'));
    expect(result.current[1]).toBeNull();
    expect(ds.replace).not.toHaveBeenCalled();
  });

  it('reports a critical error when templateSrv is missing', async () => {
    const ds = makeDatasource({ templateSrv: undefined });
    const { result } = renderHook(() => useFormattedData(query, ds));
    await waitFor(() =>
      expect(result.current[1]).toBe('Grafana template service unavailable. Please refresh the page.')
    );
    expect(result.current[0]).toBe('SELECT $x');
  });

  it('takes the range from the options argument when the datasource has none', async () => {
    const ds = makeDatasource({ options: undefined });
    const options = { range: { from: 1, to: 2 } };
    const { result } = renderHook(() => useFormattedData(query, ds, options));
    await waitFor(() => expect(result.current[0]).toBe('SELECT replaced'));
    expect(ds.replace).toHaveBeenCalledWith(options, query);
  });
});
