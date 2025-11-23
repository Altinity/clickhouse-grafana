import { DataLink } from '@grafana/data';
import { BaseLinkBuilder } from '../BaseLinkBuilder';
import { DataLinksConfig, TimeSeriesLinkContext } from '../types';
import { extractLabelsFromSeriesName } from '../utils';

/**
 * Link builder for time_series format
 * Generates links for time series data points
 */
export class TimeSeriesLinkBuilder extends BaseLinkBuilder<TimeSeriesLinkContext> {
  constructor(config: DataLinksConfig, sourceQuery?: any) {
    super(config, 'time_series', sourceQuery);
  }

  /**
   * Build links for a time series data point
   */
  public buildLinks(context: TimeSeriesLinkContext): DataLink[] {
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
      // Build default link
      const defaultLink = this.buildDefaultLink(context, 'logs');
      links.push(defaultLink);
    }

    return links;
  }

  /**
   * Build default query for time series
   */
  protected buildDefaultQuery(whereClause: string, context: TimeSeriesLinkContext): string {
    const timeFilter = '$__timeFilter(timestamp)';

    return `
SELECT * FROM logs
WHERE ${whereClause}
  AND ${timeFilter}
ORDER BY timestamp DESC
LIMIT 100
    `.trim();
  }

  /**
   * Get default link title
   */
  protected getDefaultLinkTitle(context: TimeSeriesLinkContext): string {
    const labels = Object.keys(context.labels);

    if (labels.length > 0) {
      return `View Logs (${labels.slice(0, 2).join(', ')})`;
    }

    return 'View Related Logs';
  }

  /**
   * Create link context from series data
   */
  public static createContext(
    seriesName: string,
    timestamp: number,
    value: number,
    groupByKeys?: Record<string, string>
  ): TimeSeriesLinkContext {
    // Extract labels from series name if present
    const extractedLabels = extractLabelsFromSeriesName(seriesName);

    // Merge with GROUP BY keys
    const labels = {
      ...extractedLabels,
      ...groupByKeys,
    };

    return {
      seriesName,
      timestamp,
      value,
      labels,
      values: {
        value,
      },
      metadata: {
        seriesName,
      },
    };
  }
}
