import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

/*
 * Value that is used in QueryEditor to switch between builder and SQL modes
 */
export enum EditorMode {
  SQL = 'sql',
  Builder = 'builder',
}

export enum DateTimeColumnSelectorType {
  DateTime = 'datetime',
  Date = 'date',
}

export interface CHQuery extends DataQuery {
  query: string;
  format: string;
  extrapolate: boolean;
  rawQuery: string;
  editorMode?: EditorMode;
  database?: string;
  table?: string;

  dateTimeType?: string;
  dateColDataType?: string;
  dateTimeColDataType?: string;

  skip_comments?: boolean;

  round?: string;
  intervalFactor?: number;
  formattedQuery?: string;
}

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

export const DEFAULT_QUERY: CHQuery = {
  refId: '',
  query: 'SELECT 1',
  format: 'time_series',
  extrapolate: false,
  rawQuery: '',
  editorMode: EditorMode.SQL,
};
