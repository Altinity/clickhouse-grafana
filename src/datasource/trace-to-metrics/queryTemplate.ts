import { ProcessedTag } from './types';
import { TraceToMetricsQuery } from '../../types/types';

/**
 * Process query templates and replace $__tags placeholder
 */
export class QueryTemplateEngine {
  private static readonly TAG_PLACEHOLDER = '$__tags';

  /**
   * Process a query template with tag interpolation
   */
  static processTemplate(template: string, tags: ProcessedTag[]): string {
    const whereClause = this.buildWhereClause(tags);
    return template.replace(this.TAG_PLACEHOLDER, whereClause);
  }

  /**
   * Build WHERE clause from tags
   */
  private static buildWhereClause(tags: ProcessedTag[]): string {
    if (tags.length === 0) {
      return '1=1';
    }

    const conditions = tags.map(tag => {
      // Escape single quotes in values for SQL
      const escapedValue = tag.value.replace(/'/g, "''");
      return `${tag.key} = '${escapedValue}'`;
    });

    return conditions.join(' AND ');
  }

  /**
   * Get default query templates if none are configured
   */
  static getDefaultQueries(): TraceToMetricsQuery[] {
    return [
      {
        name: 'Request Rate',
        query: 'SELECT $__timeInterval(timestamp) as time, count() as requests FROM metrics WHERE $__timeFilter(timestamp) AND $__tags GROUP BY time ORDER BY time',
      },
      {
        name: 'Error Rate',
        query: 'SELECT $__timeInterval(timestamp) as time, countIf(status_code >= 400) / count() * 100 as error_rate FROM metrics WHERE $__timeFilter(timestamp) AND $__tags GROUP BY time ORDER BY time',
      },
      {
        name: 'Latency P95',
        query: 'SELECT $__timeInterval(timestamp) as time, quantile(0.95)(duration) as p95_latency FROM metrics WHERE $__timeFilter(timestamp) AND $__tags GROUP BY time ORDER BY time',
      },
      {
        name: 'Request Count by Status',
        query: 'SELECT status_code, count() as count FROM metrics WHERE $__timeFilter(timestamp) AND $__tags GROUP BY status_code ORDER BY count DESC',
      },
    ];
  }

  /**
   * Build explore URL for a specific query
   */
  static buildExploreUrl(
    datasourceUid: string,
    query: string,
    fromTime: number,
    toTime: number
  ): string {
    const exploreState = {
      datasource: datasourceUid,
      queries: [
        {
          refId: 'A',
          query: query,
          format: 'time_series',
        },
      ],
      range: {
        from: new Date(fromTime).toISOString(),
        to: new Date(toTime).toISOString(),
      },
    };

    const stateParam = encodeURIComponent(JSON.stringify(exploreState));
    return `/explore?left=${stateParam}`;
  }
}
