import { DataLinksConfig, LinkBuilder, LinkContext } from './types';
import { TimeSeriesLinkBuilder } from './formats/TimeSeriesLinkBuilder';
import { LogsLinkBuilder } from './formats/LogsLinkBuilder';
import { TracesLinkBuilder } from './formats/TracesLinkBuilder';
import { FlamegraphLinkBuilder } from './formats/FlamegraphLinkBuilder';
import { TableLinkBuilder } from './formats/TableLinkBuilder';
import { validateConfig } from './utils';

/**
 * Format types supported by the link builder system
 */
export type SupportedFormat = 'time_series' | 'logs' | 'traces' | 'flamegraph' | 'table';

/**
 * Factory for creating format-specific link builders
 * Provides a clean API for instantiating the correct builder
 */
export class LinkBuilderFactory {
  private static builders: Map<SupportedFormat, LinkBuilder<any>> = new Map();

  /**
   * Get or create a link builder for a specific format
   *
   * @param format - The format type (time_series, logs, traces, etc.)
   * @param config - Data links configuration
   * @returns Link builder instance or null if disabled/invalid
   */
  public static getBuilder<TContext extends LinkContext = LinkContext>(
    format: SupportedFormat,
    config: DataLinksConfig
  ): LinkBuilder<TContext> | null {
    // Validate configuration
    if (!validateConfig(config)) {
      return null;
    }

    // Check if format is explicitly disabled
    if (config.formats?.[format]?.enabled === false) {
      return null;
    }

    // Create cache key
    const cacheKey = `${format}-${config.targetDatasourceUid}`;

    // Return cached builder if exists
    if (this.builders.has(cacheKey as any)) {
      return this.builders.get(cacheKey as any) as LinkBuilder<TContext>;
    }

    // Create new builder based on format
    let builder: LinkBuilder<any> | null = null;

    switch (format) {
      case 'time_series':
        builder = new TimeSeriesLinkBuilder(config);
        break;

      case 'logs':
        builder = new LogsLinkBuilder(config);
        break;

      case 'traces':
        builder = new TracesLinkBuilder(config);
        break;

      case 'flamegraph':
        builder = new FlamegraphLinkBuilder(config);
        break;

      case 'table':
        builder = new TableLinkBuilder(config);
        break;

      default:
        console.warn(`Unsupported format: ${format}`);
        return null;
    }

    // Cache the builder
    if (builder && builder.isEnabled()) {
      this.builders.set(cacheKey as any, builder);
    }

    return builder as LinkBuilder<TContext>;
  }

  /**
   * Clear cached builders (useful for testing or config changes)
   */
  public static clearCache(): void {
    this.builders.clear();
  }

  /**
   * Check if a format is supported
   */
  public static isFormatSupported(format: string): format is SupportedFormat {
    return ['time_series', 'logs', 'traces', 'flamegraph', 'table'].includes(format);
  }

  /**
   * Get all supported formats
   */
  public static getSupportedFormats(): SupportedFormat[] {
    return ['time_series', 'logs', 'traces', 'flamegraph', 'table'];
  }
}
