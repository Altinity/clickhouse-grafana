import { DataLink } from '@grafana/data';
import { BaseLinkBuilder } from '../BaseLinkBuilder';
import { DataLinksConfig, FlamegraphLinkContext } from '../types';

/**
 * Link builder for flamegraph format
 * Generates links for flame graph nodes
 */
export class FlamegraphLinkBuilder extends BaseLinkBuilder<FlamegraphLinkContext> {
  constructor(config: DataLinksConfig, sourceQuery?: any) {
    super(config, 'flamegraph', sourceQuery);
  }

  /**
   * Build links for a flame graph node
   */
  public buildLinks(context: FlamegraphLinkContext): DataLink[] {
    if (!this.isEnabled()) {
      return [];
    }

    // Skip root node
    if (context.level === 0 || context.label === 'all') {
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
      // Build default link to traces
      links.push(this.buildDefaultLink(context, 'traces'));
    }

    return links;
  }

  /**
   * Build default query for flamegraph
   */
  protected buildDefaultQuery(whereClause: string, context: FlamegraphLinkContext): string {
    return `
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
WHERE operationName = '${context.label.replace(/'/g, "''")}'
ORDER BY startTime DESC
LIMIT 100
    `.trim();
  }

  /**
   * Get default link title
   */
  protected getDefaultLinkTitle(context: FlamegraphLinkContext): string {
    return `View Traces for ${context.label}`;
  }

  /**
   * Create link context from flamegraph node
   */
  public static createContext(node: any): FlamegraphLinkContext {
    return {
      label: node.label,
      level: node.level,
      value: node.value,
      self: node.self,
      metadata: {
        label: node.label,
        level: node.level,
      },
    };
  }
}
