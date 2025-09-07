import { DataLink, TimeRange, dateTime } from '@grafana/data';
import { TraceToMetricsOptions } from '../../types/types';
import { TraceSpan } from './types';
import { TagProcessor } from './tagProcessor';
import { QueryTemplateEngine } from './queryTemplate';

/**
 * Builds DataLinks for trace spans to navigate to metrics
 */
export class TraceToMetricsLinkBuilder {
  private tagProcessor: TagProcessor;
  private tracesToMetrics: TraceToMetricsOptions;

  constructor(tracesToMetrics: TraceToMetricsOptions) {
    this.tracesToMetrics = tracesToMetrics;
    this.tagProcessor = new TagProcessor(tracesToMetrics.tags);
  }

  /**
   * Build DataLinks for a trace span
   */
  buildLinks(span: TraceSpan): DataLink[] {
    if (!this.tracesToMetrics.enabled || !this.tracesToMetrics.datasourceUid) {
      return [];
    }

    const links: DataLink[] = [];
    
    // Process tags from span
    const processedTags = this.tagProcessor.processTags(
      span.tags || {},
      span.serviceTags || {}
    );

    // Calculate time range with shifts
    const timeRange = this.calculateTimeRange(span);

    // Get queries (use defaults if none configured)
    const queries = this.tracesToMetrics.queries && this.tracesToMetrics.queries.length > 0
      ? this.tracesToMetrics.queries
      : QueryTemplateEngine.getDefaultQueries();

    // Create a link for each query template
    queries.forEach(queryTemplate => {
      const processedQuery = QueryTemplateEngine.processTemplate(
        queryTemplate.query,
        processedTags
      );

      const link: DataLink = {
        title: queryTemplate.name || 'View in Metrics',
        url: '',
        internal: {
          query: {
            query: processedQuery,
            refId: 'A',
            format: 'time_series',
            datasource: {
              uid: this.tracesToMetrics.datasourceUid,
              type: 'vertamedia-clickhouse-datasource',
            },
          },
          datasourceUid: this.tracesToMetrics.datasourceUid || '',
          datasourceName: 'ClickHouse Metrics',
          range: timeRange,
        },
        targetBlank: false,
      };

      links.push(link);
    });

    // If no queries configured, add a basic link
    if (links.length === 0 && processedTags.length > 0) {
      const whereClause = this.tagProcessor.buildWhereClause(processedTags);
      const basicQuery = `SELECT * FROM metrics WHERE ${whereClause} LIMIT 100`;

      links.push({
        title: 'View in Metrics',
        url: '',
        internal: {
          query: {
            query: basicQuery,
            refId: 'A',
            format: 'table',
            datasource: {
              uid: this.tracesToMetrics.datasourceUid,
              type: 'vertamedia-clickhouse-datasource',
            },
          },
          datasourceUid: this.tracesToMetrics.datasourceUid || '',
          datasourceName: 'ClickHouse Metrics',
          range: timeRange,
        },
        targetBlank: false,
      });
    }

    return links;
  }

  /**
   * Calculate time range for metrics query based on span timing
   */
  private calculateTimeRange(span: TraceSpan): TimeRange {
    // Parse start time (handle both timestamp formats)
    let startMs: number;
    if (typeof span.startTime === 'string') {
      startMs = new Date(span.startTime).getTime();
    } else {
      // Assume microseconds if number is too large for milliseconds
      startMs = span.startTime > 1e12 ? span.startTime / 1000 : span.startTime;
    }

    // Duration is typically in microseconds
    const durationMs = span.duration > 1e6 ? span.duration / 1000 : span.duration;
    const endMs = startMs + durationMs;

    // Apply time shifts
    const startShift = this.parseTimeShift(this.tracesToMetrics.spanStartTimeShift || '-5m');
    const endShift = this.parseTimeShift(this.tracesToMetrics.spanEndTimeShift || '5m');

    const from = dateTime(startMs + startShift);
    const to = dateTime(endMs + endShift);

    return {
      from,
      to,
      raw: { from, to },
    };
  }

  /**
   * Parse time shift string (e.g., '-5m', '1h') to milliseconds
   */
  private parseTimeShift(shift: string): number {
    if (!shift) {
      return 0;
    }

    const match = shift.match(/^([+-]?\d+)([smhd])$/);
    if (!match) {
      return 0;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  /**
   * Create a simple external URL link (fallback)
   */
  buildExternalLink(span: TraceSpan): string {
    const processedTags = this.tagProcessor.processTags(
      span.tags || {},
      span.serviceTags || {}
    );

    const params = this.tagProcessor.buildQueryParams(processedTags);
    const queryParams = new URLSearchParams(params).toString();

    return `/explore?orgId=1&left={"datasource":"${this.tracesToMetrics.datasourceUid}"}&${queryParams}`;
  }
}
