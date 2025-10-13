import { DataLink } from '@grafana/data';
import { BaseLinkBuilder } from '../BaseLinkBuilder';
import { DataLinksConfig, LogsLinkContext } from '../types';

/**
 * Link builder for logs format
 * Generates links for log entries to traces or metrics
 */
export class LogsLinkBuilder extends BaseLinkBuilder<LogsLinkContext> {
  constructor(config: DataLinksConfig) {
    super(config, 'logs');
  }

  /**
   * Build links for a log entry
   */
  public buildLinks(context: LogsLinkContext): DataLink[] {
    if (!this.isEnabled()) {
      return [];
    }

    const links: DataLink[] = [];
    const templates = this.getQueryTemplates();

    if (templates.length > 0) {
      // Use configured query templates
      templates.forEach((template) => {
        // Only include trace links if trace_id exists
        if (template.name.toLowerCase().includes('trace') && !context.traceId) {
          return;
        }

        const link = this.buildDataLink(template, context);
        links.push(link);
      });
    } else {
      // Build default links based on available data
      if (context.traceId) {
        links.push(this.buildTraceLink(context));
      }

      // Always add metrics link if we have labels
      if (Object.keys(context.labels).length > 0) {
        links.push(this.buildDefaultLink(context, 'time_series'));
      }
    }

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
