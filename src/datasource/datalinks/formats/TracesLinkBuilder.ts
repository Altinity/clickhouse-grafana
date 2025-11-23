import { DataLink } from '@grafana/data';
import { BaseLinkBuilder } from '../BaseLinkBuilder';
import { DataLinksConfig, TracesLinkContext, QueryTemplate } from '../types';
import { convertToGrafanaFieldPlaceholders } from '../utils';

/**
 * Link builder for traces format (trace-to-metrics)
 * Migrated from existing trace-to-metrics implementation
 */
export class TracesLinkBuilder extends BaseLinkBuilder<TracesLinkContext> {
  constructor(config: DataLinksConfig, sourceQuery?: any) {
    super(config, 'traces', sourceQuery);
  }

  /**
   * Build links for a trace span
   */
  public buildLinks(context: TracesLinkContext): DataLink[] {
    if (!this.isEnabled()) {
      return [];
    }

    const links: DataLink[] = [];
    const templates = this.getQueryTemplates();

    if (templates.length > 0) {
      // Use configured query templates
      templates.forEach((template) => {
        const link = this.buildDataLink(template, context);
        links.push(link);
      });
    } else {
      // Build default metrics link
      links.push(this.buildDefaultLink(context, 'time_series'));
    }

    return links;
  }

  /**
   * Build default query for traces (trace-to-metrics)
   */
  protected buildDefaultQuery(whereClause: string, context: TracesLinkContext): string {
    const timeFilter = '$__timeFilter(timestamp)';

    return `
SELECT
  toStartOfMinute(timestamp) as time,
  count() as requests
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
  protected getDefaultLinkTitle(context: TracesLinkContext): string {
    const service = context.serviceName;
    return service ? `View Metrics for ${service}` : 'View Related Metrics';
  }

  /**
   * Build DataLink for traces with Grafana field interpolation
   *
   * For traces, we use Grafana's field interpolation system similar to logs.
   * This allows Grafana to fill in span-specific values at render time.
   */
  protected buildDataLink(template: QueryTemplate, context: TracesLinkContext): DataLink {
    const fieldMappings = this.getFieldMappings();

    console.log('[TracesLinkBuilder] buildDataLink template:', template);
    console.log('[TracesLinkBuilder] config:', this.config);
    console.log('[TracesLinkBuilder] fieldMappings:', fieldMappings);

    // Convert user placeholders to Grafana field interpolation format
    const queryWithFieldPlaceholders = convertToGrafanaFieldPlaceholders(template.query, fieldMappings);

    console.log('[TracesLinkBuilder] queryWithFieldPlaceholders:', queryWithFieldPlaceholders);

    const link = {
      title: template.name || '',
      url: '', // Empty for internal links
      internal: {
        query: {
          refId: 'A',
          query: queryWithFieldPlaceholders || '',
          format: template.format || 'table',
          datasource: {
            uid: this.config.targetDatasourceUid || '',
            type: 'vertamedia-clickhouse-datasource',
          },
          // ClickHouse-specific fields required for proper query execution in Explore
          datasourceMode: 'Datasource',
          extrapolate: true,
          adHocFilters: [],
          rawQuery: queryWithFieldPlaceholders || '',
          editorMode: 'sql',
        },
        datasourceUid: this.config.targetDatasourceUid || '',
        datasourceName: this.config.targetDatasourceName || 'ClickHouse',
      },
    };

    console.log('[TracesLinkBuilder] created link:', link);
    return link;
  }

  /**
   * Create link context from span data
   */
  public static createContext(span: any): TracesLinkContext {
    // Merge tags and serviceTags into labels
    const labels: Record<string, any> = {
      ...span.serviceTags,
      ...span.tags,
      service_name: span.serviceName || span.service_name,
      operation_name: span.operationName || span.operation_name,
    };

    return {
      traceID: span.traceID || span.trace_id,
      spanID: span.spanID || span.span_id,
      serviceName: span.serviceName || span.service_name,
      operationName: span.operationName || span.operation_name,
      startTime: span.startTime || span.start_time,
      duration: span.duration,
      tags: span.tags || {},
      serviceTags: span.serviceTags || span.service_tags || {},
      timestamp: span.startTime || span.start_time,
      labels,
      values: {
        duration: span.duration,
        service_name: span.serviceName || span.service_name,
        operation_name: span.operationName || span.operation_name,
      },
      metadata: {
        traceID: span.traceID || span.trace_id,
        spanID: span.spanID || span.span_id,
      },
    };
  }
}
