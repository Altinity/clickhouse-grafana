import { DataLink } from '@grafana/data';
import { BaseLinkBuilder } from '../BaseLinkBuilder';
import { DataLinksConfig, LogsLinkContext } from '../types';

/**
 * Link builder for logs format
 * Generates links for log entries to traces or metrics
 */
export class LogsLinkBuilder extends BaseLinkBuilder<LogsLinkContext> {
  constructor(config: DataLinksConfig, sourceQuery?: any) {
    super(config, 'logs', sourceQuery);
  }

  /**
   * Build links for a log entry
   */
  public buildLinks(context: LogsLinkContext): DataLink[] {
    if (!this.isEnabled()) {
      console.log('[LogsLinkBuilder] buildLinks: disabled');
      return [];
    }

    const links: DataLink[] = [];
    const templates = this.getQueryTemplates();

    console.log('[LogsLinkBuilder] buildLinks: templates count =', templates.length);

    if (templates.length > 0) {
      // Use configured query templates
      templates.forEach((template, index) => {
        console.log(`[LogsLinkBuilder] Processing template ${index}: ${template.name}`);

        // Only include trace links if trace_id exists
        if (template.name.toLowerCase().includes('trace') && !context.traceId) {
          console.log(`[LogsLinkBuilder] Skipping trace link (no traceId): ${template.name}`);
          return;
        }

        const link = this.buildDataLink(template, context);
        console.log(`[LogsLinkBuilder] Created link ${index}: ${template.name}`, link);

        if (link) {
          links.push(link);
          console.log(`[LogsLinkBuilder] Added link to array, current length: ${links.length}`);
        } else {
          console.error(`[LogsLinkBuilder] link is null/undefined!`);
        }
      });
    } else {
      console.log('[LogsLinkBuilder] No templates, using defaults');
      // Build default links based on available data
      if (context.traceId) {
        links.push(this.buildTraceLink(context));
      }

      // Always add metrics link if we have labels
      if (Object.keys(context.labels).length > 0) {
        links.push(this.buildDefaultLink(context, 'time_series'));
      }
    }

    console.log('[LogsLinkBuilder] buildLinks: returning', links.length,links, 'links');
    return links;
  }

  /**
   * Build link to traces using trace_id
   */
  private buildTraceLink(context: LogsLinkContext): DataLink {
    const query = `
SELECT
  trace_id as traceID,
  span_id as spanID,
  parent_span_id as parentSpanID,
  service_name as serviceName,
  operation_name as operationName,
  start_time as startTime,
  duration_ns as duration,
  tags,
  service_tags as serviceTags
FROM traces
WHERE traceID = '${context.traceId}'
ORDER BY startTime
    `.trim();

    return {
      title: 'View Trace',
      url: '',
      internal: {
        query: {
          refId: 'A',
          query,
          format: 'traces',
          datasource: {
            uid: this.config.targetDatasourceUid,
            type: 'vertamedia-clickhouse-datasource',
          },
          // ClickHouse-specific fields
          datasourceMode: 'Datasource',
          extrapolate: true,
          adHocFilters: [],
          rawQuery: query,
          editorMode: 'sql',
        },
        datasourceUid: this.config.targetDatasourceUid,
        datasourceName: this.config.targetDatasourceName || 'ClickHouse',
      },
    };
  }

  /**
   * Build default query for logs
   */
  protected buildDefaultQuery(whereClause: string, context: LogsLinkContext): string {
    const timeFilter = '$__timeFilter(timestamp)';

    return `
SELECT
  toStartOfMinute(timestamp) as time,
  count() as count
FROM metrics
WHERE ${whereClause}
  AND ${timeFilter}
GROUP BY time
ORDER BY time
    `.trim();
  }

  /**
   * Get default link title
   */
  protected getDefaultLinkTitle(context: LogsLinkContext): string {
    const service = context.labels.service || context.labels.service_name;

    if (service) {
      return `View Metrics for ${service}`;
    }

    return 'View Related Metrics';
  }

  // Note: We use the base buildDataLink from BaseLinkBuilder
  // which interpolates actual values from the context
  // This is correct for logs because Grafana's internal data links
  // don't support ${__data.fields.*} placeholders for per-row interpolation

  /**
   * Create link context from log entry
   */
  public static createContext(logEntry: any, labels: Record<string, string>): LogsLinkContext {
    return {
      timestamp: logEntry.timestamp,
      labels,
      body: logEntry.content || logEntry.message || logEntry.body || '',
      severity: logEntry.level || logEntry.severity,
      traceId: logEntry.trace_id || labels.trace_id,
      spanId: logEntry.span_id || labels.span_id,
      values: {
        body: logEntry.content || logEntry.message || logEntry.body,
        severity: logEntry.level || logEntry.severity,
      },
    };
  }
}
