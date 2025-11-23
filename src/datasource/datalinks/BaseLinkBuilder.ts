import { DataLink } from '@grafana/data';
import {
  DataLinksConfig,
  FormatConfig,
  LinkBuilder,
  LinkContext,
  FieldMapping,
  QueryTemplate,
} from './types';
import {
  calculateTimeRange,
  buildWhereClause,
  interpolateQuery,
  validateConfig,
} from './utils';

/**
 * Abstract base class for all link builders
 * Provides common functionality for building DataLinks
 *
 * @template TContext - The specific link context type for this format
 */
export abstract class BaseLinkBuilder<TContext extends LinkContext = LinkContext>
  implements LinkBuilder<TContext>
{
  protected config: DataLinksConfig;
  protected formatConfig?: FormatConfig;
  protected formatName: string;
  protected sourceQuery?: any; // Original CHQuery to copy fields from

  constructor(config: DataLinksConfig, formatName: string, sourceQuery?: any) {
    this.config = config;
    this.formatName = formatName;
    this.sourceQuery = sourceQuery;

    // Get format-specific config if it exists
    if (config.formats && config.formats[formatName as keyof typeof config.formats]) {
      this.formatConfig = config.formats[formatName as keyof typeof config.formats];
    }
  }

  /**
   * Check if link builder is enabled
   */
  public isEnabled(): boolean {
    if (!validateConfig(this.config)) {
      return false;
    }

    // Check format-specific enabled flag
    if (this.formatConfig && this.formatConfig.enabled === false) {
      return false;
    }

    return true;
  }

  /**
   * Build data links from context (implemented by subclasses)
   */
  public abstract buildLinks(context: TContext): DataLink[];

  /**
   * Get effective field mappings (format-specific overrides global)
   */
  protected getFieldMappings(): FieldMapping[] {
    if (this.formatConfig?.fieldMappings) {
      return this.formatConfig.fieldMappings;
    }

    return this.config.fieldMappings || [];
  }

  /**
   * Get effective query templates (format-specific overrides global)
   */
  protected getQueryTemplates(): QueryTemplate[] {
    if (this.formatConfig?.queryTemplates) {
      return this.formatConfig.queryTemplates;
    }

    return this.config.queryTemplates || [];
  }

  /**
   * Get effective time shift configuration
   */
  protected getTimeShift(): { start: string; end: string } {
    if (this.formatConfig?.timeShift) {
      return this.formatConfig.timeShift;
    }

    return this.config.timeShift || { start: '-5m', end: '5m' };
  }

  /**
   * Build DataLink from query template and context
   */
  protected buildDataLink(template: QueryTemplate, context: TContext): DataLink {
    const fieldMappings = this.getFieldMappings();

    // Interpolate query with context values
    const interpolatedQuery = interpolateQuery(template.query, context, fieldMappings);

    // Calculate time range if timestamp exists
    const timeRange = context.timestamp
      ? calculateTimeRange(context.timestamp, this.getTimeShift().start, this.getTimeShift().end)
      : undefined;

    // Copy fields from source query if available
    const copiedFields = this.sourceQuery ? {
      database: this.sourceQuery.database,
      table: this.sourceQuery.table,
      dateTimeType: this.sourceQuery.dateTimeType,
      dateColDataType: this.sourceQuery.dateColDataType,
      dateTimeColDataType: this.sourceQuery.dateTimeColDataType,
      round: this.sourceQuery.round,
      skip_comments: this.sourceQuery.skip_comments,
    } : {};

    return {
      title: template.name || '',
      url: '', // Empty for internal links
      internal: {
        query: {
          refId: 'A',
          query: interpolatedQuery || '',
          format: template.format || 'table',
          datasource: {
            uid: this.config.targetDatasourceUid || '',
            type: 'vertamedia-clickhouse-datasource',
          },
          // ClickHouse-specific fields required for proper query execution in Explore
          datasourceMode: 'Datasource',
          extrapolate: true,
          adHocFilters: [],
          rawQuery: interpolatedQuery || '',
          editorMode: 'sql',
          // Copy fields from source query
          ...copiedFields,
        },
        datasourceUid: this.config.targetDatasourceUid || '',
        datasourceName: this.config.targetDatasourceName || 'ClickHouse',
        ...(timeRange && { range: timeRange }),
      },
    };
  }

  /**
   * Build default data link if no templates configured
   */
  protected buildDefaultLink(context: TContext, targetFormat = 'table'): DataLink {
    const fieldMappings = this.getFieldMappings();
    const whereClause = buildWhereClause(fieldMappings, context);

    // Calculate time range if timestamp exists
    const timeRange = context.timestamp
      ? calculateTimeRange(context.timestamp, this.getTimeShift().start, this.getTimeShift().end)
      : undefined;

    // Build default query based on format
    const query = this.buildDefaultQuery(whereClause, context);

    return {
      title: this.getDefaultLinkTitle(context),
      url: '',
      internal: {
        query: {
          refId: 'A',
          query,
          format: targetFormat,
          datasource: {
            uid: this.config.targetDatasourceUid,
            type: 'vertamedia-clickhouse-datasource',
          },
        },
        datasourceUid: this.config.targetDatasourceUid,
        datasourceName: this.config.targetDatasourceName || 'ClickHouse',
        ...(timeRange && { range: timeRange }),
      },
    };
  }

  /**
   * Build default query (can be overridden by subclasses)
   */
  protected buildDefaultQuery(whereClause: string, context: TContext): string {
    if (context.timestamp) {
      return `SELECT * FROM data WHERE ${whereClause} AND $__timeFilter(timestamp) LIMIT 100`;
    }

    return `SELECT * FROM data WHERE ${whereClause} LIMIT 100`;
  }

  /**
   * Get default link title (can be overridden by subclasses)
   */
  protected getDefaultLinkTitle(context: TContext): string {
    return `View in ${this.config.targetDatasourceName || 'ClickHouse'}`;
  }

  /**
   * Check if a specific field should have links
   */
  protected isFieldLinkable(fieldName: string): boolean {
    if (!this.formatConfig?.linkFields) {
      return true; // All fields linkable by default
    }

    return this.formatConfig.linkFields.includes(fieldName);
  }

  /**
   * Extract timestamp from context (handles various timestamp formats)
   */
  protected extractTimestamp(context: TContext): number | undefined {
    if (context.timestamp) {
      return context.timestamp;
    }

    // Check common timestamp field names
    const timestampFields = ['time', 'timestamp', 'startTime', 'start_time', '@timestamp'];

    for (const field of timestampFields) {
      const value = context.labels?.[field] || context.values?.[field] || (context as any)[field];

      if (value !== undefined) {
        // Handle various timestamp formats
        if (typeof value === 'number') {
          // If too large, assume microseconds or nanoseconds
          return value > 1e12 ? Math.floor(value / 1000) : value;
        }

        if (typeof value === 'string') {
          const parsed = new Date(value).getTime();
          if (!isNaN(parsed)) {
            return parsed;
          }
        }
      }
    }

    return undefined;
  }
}
