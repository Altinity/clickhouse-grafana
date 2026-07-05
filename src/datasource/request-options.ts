/**
 * Pure utility for building ClickHouse HTTP request options.
 *
 * Kept in a standalone module (no @grafana/* imports) so that it can be unit-
 * tested directly without triggering the heavy ESM chain that @grafana/runtime
 * brings in through @grafana/ui → react-calendar → get-user-locale → memoize.
 */

export interface RequestOptions {
  url: string;
  requestId?: string;
  method?: string;
  data?: string;
  withCredentials?: boolean;
  headers?: Record<string, string>;
}

export interface RequestOptionsInput {
  url: string;
  defaultDatabase?: string;
  basicAuth?: string;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  useCompression?: boolean;
  compressionType?: string;
  useYandexCloudAuthorization?: boolean;
  xHeaderUser?: string;
  xClickHouseSSLCertificateAuth?: boolean;
  addCorsHeader?: boolean;
  /** When true, adds output_format_json_quote_64bit_integers=1 to the request.
   *  Only set for logs-format queries to preserve UInt64/Int64 precision.
   *  MUST NOT be set for time_series / table / traces / flamegraph queries —
   *  doing so would regress issue #832 (numeric values become strings). */
  quoteBigInts?: boolean;
}

/**
 * Build HTTP request options for a ClickHouse query.
 *
 * @param query     - SQL query string (no FORMAT suffix yet)
 * @param usePOST   - Send query as POST body instead of GET query param
 * @param requestId - Grafana request ID for deduplication / cancellation
 * @param options   - Datasource settings and per-call flags (e.g. quoteBigInts)
 */
export function buildRequestOptions(
  query: string,
  usePOST: boolean | undefined,
  requestId: string | undefined,
  options: RequestOptionsInput
): RequestOptions {
  const requestOptions: RequestOptions = {
    url: options.url,
    requestId,
  };
  const params: string[] = [];

  if (usePOST) {
    requestOptions.method = 'POST';
    requestOptions.data = query;
  } else {
    requestOptions.method = 'GET';
    params.push('query=' + encodeURIComponent(query));
  }

  // https://github.com/Altinity/clickhouse-grafana/issues/832
  // Enable 64-bit integer quoting ONLY for logs queries so that large UInt64/Int64
  // label values survive JSON.parse without precision loss. For all other formats
  // (time_series, table, traces, flamegraph) this must remain off — enabling it
  // globally caused numeric series values to become strings (#832).
  if (options.quoteBigInts) {
    params.push('output_format_json_quote_64bit_integers=1');
  }

  if (options.defaultDatabase) {
    params.push('database=' + options.defaultDatabase);
  }

  if (options.basicAuth || options.withCredentials) {
    requestOptions.withCredentials = true;
  }

  requestOptions.headers = options.headers || {};
  if (options.basicAuth) {
    (requestOptions.headers as Record<string, string>).Authorization = options.basicAuth;
  }

  if (options.useCompression) {
    (requestOptions.headers as Record<string, string>)['Accept-Encoding'] = options.compressionType || '';
    params.push('enable_http_compression=1');
  }

  if (options.useYandexCloudAuthorization) {
    (requestOptions.headers as Record<string, string>)['X-ClickHouse-User'] = options.xHeaderUser || '';
    // look to routes in plugin.json
    if (options.xClickHouseSSLCertificateAuth) {
      (requestOptions.headers as Record<string, string>)['X-ClickHouse-SSL-Certificate-Auth'] = 'on';
      if (requestOptions.url.indexOf('/?') === -1) {
        requestOptions.url += '/xClickHouseSSLCertificateAuth';
      } else {
        requestOptions.url = requestOptions.url.replace('/?', '/xClickHouseSSLCertificateAuth/?');
      }
    } else {
      if (requestOptions.url.indexOf('/?') === -1) {
        requestOptions.url += '/xHeaderKey';
      } else {
        requestOptions.url = requestOptions.url.replace('/?', '/xHeaderKey/?');
      }
    }
  }

  if (options.addCorsHeader) {
    params.push('add_http_cors_header=1');
  }

  if (params.length) {
    requestOptions.url += (requestOptions.url.indexOf('?') !== -1 ? '&' : '/?') + params.join('&');
  }

  return requestOptions;
}
