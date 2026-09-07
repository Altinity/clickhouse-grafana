/**
 * Focused unit tests for buildRequestOptions (the pure core of
 * CHDataSource._getRequestOptions).
 *
 * Verifies that output_format_json_quote_64bit_integers=1 is injected ONLY
 * when options.quoteBigInts === true (logs-format path), and is absent for all
 * other calls (timeseries / table / traces / flamegraph — avoiding issue #832).
 *
 * The function lives in a zero-dependency module so no @grafana/* mocking is
 * needed and no ESM transformation headaches arise.
 */
import { buildRequestOptions } from '../datasource/request-options';

describe('buildRequestOptions – quoteBigInts flag', () => {
  const baseOptions = {
    url: 'http://clickhouse:8123',
  };

  describe('quoteBigInts: true (logs path)', () => {
    it('includes output_format_json_quote_64bit_integers=1 in the URL params (GET)', () => {
      const result = buildRequestOptions('SELECT 1', false, 'rid', {
        ...baseOptions,
        quoteBigInts: true,
      });
      expect(result.url).toContain('output_format_json_quote_64bit_integers=1');
    });

    it('includes output_format_json_quote_64bit_integers=1 when usePOST is true (param in URL, query in body)', () => {
      const result = buildRequestOptions('SELECT 1', true, 'rid', {
        ...baseOptions,
        quoteBigInts: true,
      });
      expect(result.url).toContain('output_format_json_quote_64bit_integers=1');
      expect(result.data).toBe('SELECT 1');
      expect(result.method).toBe('POST');
    });
  });

  describe('quoteBigInts absent or false (timeseries / table / traces / flamegraph paths)', () => {
    it('does NOT include the param when quoteBigInts is absent — prevents #832 regression', () => {
      const result = buildRequestOptions('SELECT 1', false, 'rid', baseOptions);
      expect(result.url).not.toContain('output_format_json_quote_64bit_integers');
    });

    it('does NOT include the param when quoteBigInts is explicitly false', () => {
      const result = buildRequestOptions('SELECT 1', false, 'rid', {
        ...baseOptions,
        quoteBigInts: false,
      });
      expect(result.url).not.toContain('output_format_json_quote_64bit_integers');
    });

    it('does NOT include the param when quoteBigInts is undefined', () => {
      const result = buildRequestOptions('SELECT 1', false, 'rid', {
        ...baseOptions,
        quoteBigInts: undefined,
      });
      expect(result.url).not.toContain('output_format_json_quote_64bit_integers');
    });
  });

  describe('existing params unaffected by the flag', () => {
    it('still appends database param alongside quoteBigInts', () => {
      const result = buildRequestOptions('SELECT 1', false, 'rid', {
        ...baseOptions,
        defaultDatabase: 'mydb',
        quoteBigInts: true,
      });
      expect(result.url).toContain('output_format_json_quote_64bit_integers=1');
      expect(result.url).toContain('database=mydb');
    });

    it('database param present even without quoteBigInts', () => {
      const result = buildRequestOptions('SELECT 1', false, 'rid', {
        ...baseOptions,
        defaultDatabase: 'mydb',
      });
      expect(result.url).not.toContain('output_format_json_quote_64bit_integers');
      expect(result.url).toContain('database=mydb');
    });

    it('compression params unaffected', () => {
      const result = buildRequestOptions('SELECT 1', false, 'rid', {
        ...baseOptions,
        useCompression: true,
        compressionType: 'gzip',
        quoteBigInts: true,
      });
      expect(result.url).toContain('output_format_json_quote_64bit_integers=1');
      expect(result.url).toContain('enable_http_compression=1');
      expect((result.headers as any)['Accept-Encoding']).toBe('gzip');
    });
  });

  describe('CHDataSource._getRequestOptions delegation (smoke)', () => {
    // Verify the static method still works the same way (thin delegate)
    // by testing the underlying function's return shape.
    it('returns an object with url, method, and requestId', () => {
      const result = buildRequestOptions('SELECT 1', false, 'test-id', baseOptions);
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('method', 'GET');
      expect(result).toHaveProperty('requestId', 'test-id');
    });
  });
});
