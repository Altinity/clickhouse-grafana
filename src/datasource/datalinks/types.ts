import { DataLink } from '@grafana/data';

/**
 * Central configuration for data links across all formats
 */
export interface DataLinksConfig {
  /** Enable/disable data links */
  enabled: boolean;

  /** Target datasource UID for links */
  targetDatasourceUid: string;

  /** Target datasource name (display) */
  targetDatasourceName?: string;

  /** Time range shifts */
  timeShift?: {
    /** Time to subtract from start (e.g., '-5m', '-1h') */
    start: string;
    /** Time to add to end (e.g., '5m', '1h') */
    end: string;
  };

  /** Field mappings: source field → target query field */
  fieldMappings?: FieldMapping[];

  /** Query templates with placeholders */
  queryTemplates?: QueryTemplate[];

  /** Format-specific configuration overrides */
  formats?: {
    time_series?: FormatConfig;
    logs?: FormatConfig;
    traces?: FormatConfig;
    flamegraph?: FormatConfig;
    table?: FormatConfig;
  };
}

/**
 * Field mapping from source data to target query
 */
export interface FieldMapping {
  /** Source field name (e.g., 'service_name', 'cluster') */
  sourceField: string;

  /** Target field name in query (defaults to sourceField if not specified) */
  targetField?: string;

  /** Include this field in query WHERE clause */
  useInQuery?: boolean;
}

/**
 * Query template with placeholders
 */
export interface QueryTemplate {
  /** Display name for the link */
  name: string;

  /** SQL query with placeholders: ${field}, $__timeFilter, etc. */
  query: string;

  /** Target format (time_series, logs, table, etc.) */
  format?: string;
}

/**
 * Format-specific configuration
 */
export interface FormatConfig {
  /** Enable links for this format */
  enabled?: boolean;

  /** Which fields should have links */
  linkFields?: string[];

  /** Override field mappings for this format */
  fieldMappings?: FieldMapping[];

  /** Override query templates for this format */
  queryTemplates?: QueryTemplate[];

  /** Override time shifts for this format */
  timeShift?: {
    start: string;
    end: string;
  };
}

/**
 * Generic link context - each format extends this
 */
export interface LinkContext {
  /** Timestamp (milliseconds) */
  timestamp?: number;

  /** Key-value labels/tags */
  labels?: Record<string, any>;

  /** Raw field values */
  values?: Record<string, any>;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Time series-specific context
 */
export interface TimeSeriesLinkContext extends LinkContext {
  /** Series name */
  seriesName: string;

  /** Data point value */
  value: number;

  /** Series labels from GROUP BY */
  labels: Record<string, string>;

  /** Timestamp in milliseconds */
  timestamp: number;
}

/**
 * Logs-specific context
 */
export interface LogsLinkContext extends LinkContext {
  /** Log timestamp */
  timestamp: number;

  /** Log labels */
  labels: Record<string, string>;

  /** Log body/message */
  body: string;

  /** Severity level */
  severity?: string;

  /** Trace ID (if available) */
  traceId?: string;

  /** Span ID (if available) */
  spanId?: string;
}

/**
 * Traces-specific context (from existing implementation)
 */
export interface TracesLinkContext extends LinkContext {
  traceID: string;
  spanID: string;
  serviceName: string;
  operationName: string;
  startTime: number;
  duration: number;
  tags: Record<string, any>;
  serviceTags: Record<string, any>;
}

/**
 * Flamegraph-specific context
 */
export interface FlamegraphLinkContext extends LinkContext {
  /** Function/span label */
  label: string;

  /** Stack depth level */
  level: number;

  /** Duration or count */
  value: number;

  /** Self time */
  self: number;
}

/**
 * Table-specific context
 */
export interface TableLinkContext extends LinkContext {
  /** Entire row data */
  row: Record<string, any>;

  /** Column name */
  columnName: string;

  /** Column value */
  columnValue: any;

  /** Row index */
  rowIndex: number;
}

/**
 * Result from link building
 */
export interface LinkBuildResult {
  /** Generated data links */
  links: DataLink[];

  /** Field name to attach links to */
  fieldName?: string;

  /** Whether links are per-value (array of arrays) or per-field (single array) */
  mode: 'per-value' | 'per-field';
}

/**
 * Base interface for all link builders
 */
export interface LinkBuilder<TContext extends LinkContext = LinkContext> {
  /** Build links from context */
  buildLinks(context: TContext): DataLink[];

  /** Check if builder is enabled */
  isEnabled(): boolean;
}
