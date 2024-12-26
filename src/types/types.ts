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

export enum TimestampFormat {
  DateTime = 'DATETIME',
  DateTime64 = 'DATETIME64',
  TimeStamp = 'TIMESTAMP',
  TimeStamp64_3 = 'TIMESTAMP64_3',
  TimeStamp64_6 = 'TIMESTAMP64_6',
  TimeStamp64_9 = 'TIMESTAMP64_9',
  Float = 'FLOAT',
}

export interface CHQuery extends DataQuery {
  query: string;
  format: string;
  extrapolate: boolean;
  rawQuery: string;
  editorMode?: EditorMode;
  database?: string;
  table?: string;
  initialized?: boolean;
  adHocFilters: any[];

  dateTimeType?: string;
  dateColDataType?: string;
  dateTimeColDataType?: string;

  skip_comments?: boolean;
  add_metadata?: boolean;

  round?: string;
  intervalFactor?: number;
  interval?: string;
  formattedQuery?: string;
  contextWindowSize?: string;
  adHocValuesQuery?: string;
  useWindowFuncForMacros?: boolean;
}

/**
 * These are options configured for each DataSource instance
 */
export interface CHDataSourceOptions extends DataSourceJsonData {
  useYandexCloudAuthorization?: boolean;
  xHeaderUser?: string;
  xClickHouseSSLCertificateAuth?: boolean;
  addCorsHeader?: boolean;
  usePOST?: boolean;
  defaultDatabase?: string;
  useCompression?: boolean;
  compressionType?: string;
  // @todo remove workaround after merge https://github.com/grafana/grafana/pull/80858, also remove from src/plugin.json
  dataSourceUrl?: string;
  useDefaultConfiguration?: boolean;
  defaultDateTime64?: string;
  defaultDateTime?: string;
  defaultUint32?: string;
  defaultDateDate32?: string;
  defaultDateTimeType?: string;
  defaultFloat?: string;
  defaultTimeStamp64_3?: string;
  defaultTimeStamp64_6?: string;
  defaultTimeStamp64_9?: string;
  adHocValuesQuery?: string;
  adHocHideTableNames?: boolean;
  contextWindowSize?: string;
  useWindowFuncForMacros?: boolean;
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
  adHocFilters: [],
};
