import { TraceToMetricsTag } from '../../types/types';
import { SpanAttributes, ProcessedTag } from './types';

/**
 * Process span attributes (tags) and convert them to metric labels
 * Handles tag remapping based on configuration
 */
export class TagProcessor {
  private tagMappings: Map<string, string>;

  constructor(tags?: TraceToMetricsTag[]) {
    this.tagMappings = new Map();
    
    // If no tags specified, use default common tags
    const defaultTags: TraceToMetricsTag[] = tags && tags.length > 0 ? tags : [
      { key: 'service.name' },
      { key: 'cluster' },
      { key: 'hostname' },
      { key: 'namespace' },
      { key: 'pod' },
      { key: 'service.namespace' },
      { key: 'http.method' },
      { key: 'http.status_code' },
      { key: 'http.route' },
      { key: 'operation' },
    ];

    // Build mapping from span attribute to metric label
    defaultTags.forEach(tag => {
      const metricLabel = tag.value || this.sanitizeLabel(tag.key);
      this.tagMappings.set(tag.key, metricLabel);
    });
  }

  /**
   * Sanitize label name for ClickHouse compatibility
   * Replaces dots with underscores for valid column names
   */
  private sanitizeLabel(label: string): string {
    return label.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Extract and process tags from span attributes
   */
  processTags(spanTags: SpanAttributes, serviceTags: SpanAttributes): ProcessedTag[] {
    const processedTags: ProcessedTag[] = [];
    const allTags = { ...serviceTags, ...spanTags }; // Span tags override service tags

    // Process configured tags
    this.tagMappings.forEach((metricLabel, spanAttribute) => {
      if (allTags[spanAttribute] !== undefined && allTags[spanAttribute] !== null) {
        processedTags.push({
          key: metricLabel,
          value: String(allTags[spanAttribute]),
        });
      }
    });

    // Add service name if not already included
    if (!processedTags.find(tag => tag.key === 'service_name' || tag.key === 'serviceName')) {
      const serviceName = spanTags['service.name'] || serviceTags['service.name'];
      if (serviceName) {
        processedTags.push({
          key: 'service_name',
          value: String(serviceName),
        });
      }
    }

    return processedTags;
  }

  /**
   * Build a ClickHouse WHERE clause from processed tags
   */
  buildWhereClause(tags: ProcessedTag[]): string {
    if (tags.length === 0) {
      return '1=1';
    }

    const conditions = tags.map(tag => {
      // Escape single quotes in values
      const escapedValue = tag.value.replace(/'/g, "''");
      return `${tag.key} = '${escapedValue}'`;
    });

    return conditions.join(' AND ');
  }

  /**
   * Build query parameters for URL
   */
  buildQueryParams(tags: ProcessedTag[]): Record<string, string> {
    const params: Record<string, string> = {};
    tags.forEach(tag => {
      params[`var-${tag.key}`] = tag.value;
    });
    return params;
  }
}
