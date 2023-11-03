import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface CHQuery extends DataQuery {
  query: string;
  format: string;
  extrapolate: boolean;
}

export const DEFAULT_QUERY: CHQuery = {
  refId: "",
  query: "SELECT 1",
  format: "time_series",
  extrapolate: false
};

/**
 * These are options configured for each DataSource instance
 */
export interface CHDataSourceOptions extends DataSourceJsonData {
  useYandexCloudAuthorization?: boolean;
  xHeaderUser?: string;
  addCorsHeader?: boolean;
  usePOST?: boolean;
  defaultDatabase?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface CHSecureJsonData {
  password?: string;
  xHeaderKey?: string;
}
