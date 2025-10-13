/**
 * Centralized Data Links System
 *
 * This module provides a clean, extensible system for creating data links
 * across all ClickHouse datasource formats (time_series, logs, traces, flamegraph, table).
 *
 * @example
 * // In a format converter:
 * import { LinkBuilderFactory, TimeSeriesLinkContext } from './datalinks';
 *
 * const builder = LinkBuilderFactory.getBuilder<TimeSeriesLinkContext>(
 *   'time_series',
 *   config
 * );
 *
 * if (builder) {
 *   const context = { seriesName: 'requests', timestamp: Date.now(), value: 100, labels: {...} };
 *   const links = builder.buildLinks(context);
 *   field.config.links = links;
 * }
 */

// Core types and interfaces
export * from './types';

// Utility functions
export * from './utils';

// Base link builder
export { BaseLinkBuilder } from './BaseLinkBuilder';

// Format-specific builders
export { TimeSeriesLinkBuilder } from './formats/TimeSeriesLinkBuilder';
export { LogsLinkBuilder } from './formats/LogsLinkBuilder';
export { TracesLinkBuilder } from './formats/TracesLinkBuilder';
export { FlamegraphLinkBuilder } from './formats/FlamegraphLinkBuilder';
export { TableLinkBuilder } from './formats/TableLinkBuilder';

// Factory (main API)
export { LinkBuilderFactory } from './LinkBuilderFactory';
export type { SupportedFormat } from './LinkBuilderFactory';
