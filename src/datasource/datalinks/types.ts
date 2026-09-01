export type CHFormat = 'table' | 'logs' | 'traces' | 'time_series' | 'flamegraph';

export interface DataLinkConfig {
  fieldName: string;
  title: string;
  /**
   * If set, the link is treated as an external URL and the internal-link
   * fields (`targetDatasourceUid`, `query`, `format`) are ignored. Grafana
   * variables (`${__value.raw}`, etc.) are interpolated at click time.
   */
  url?: string;
  targetDatasourceUid: string;
  query: string;
  format?: CHFormat;
}
