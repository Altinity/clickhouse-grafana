import { isPermissionError, getPermissionErrorMessage, PermissionErrorContext } from './clickhouseErrorHandling';

describe('isPermissionError residual branches', () => {
  it('returns false for null/undefined errors', () => {
    expect(isPermissionError(null)).toBe(false);
    expect(isPermissionError(undefined)).toBe(false);
  });

  it('classifies a top-level permission status code', () => {
    expect(isPermissionError({ status: 497 })).toBe(true);
  });

  it('classifies a nested data.status code and falls back to error.message', () => {
    expect(isPermissionError({ data: { status: 291 } })).toBe(true);
    expect(isPermissionError({ message: 'Not enough privileges' })).toBe(true);
    expect(isPermissionError({ message: 'Code: 516.' })).toBe(true);
    expect(isPermissionError({ status: 500, data: {} })).toBe(false);
  });
});

describe('getPermissionErrorMessage', () => {
  it('omits the datasource suffix when no datasourceId is given', () => {
    const msg = getPermissionErrorMessage(PermissionErrorContext.TABLES);
    expect(msg).toBe('ClickHouse system table access denied for TABLES query - returning empty result');
    expect(msg).not.toContain('datasource:');
  });
});
