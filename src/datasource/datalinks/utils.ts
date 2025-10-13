import { TimeRange, dateTime } from '@grafana/data';
import { FieldMapping, LinkContext } from './types';

/**
 * Parse time shift string (e.g., '-5m', '1h', '30s') to milliseconds
 */
export function parseTimeShift(shift: string): number {
  if (!shift) {
    return 0;
  }

  const match = shift.match(/^([+-]?\d+)([smhd])$/);
  if (!match) {
    console.warn(`Invalid time shift format: ${shift}`);
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
 * Calculate time range with shifts from a timestamp
 */
export function calculateTimeRange(
  timestamp: number,
  startShift = '-5m',
  endShift = '5m'
): TimeRange {
  const startMs = parseTimeShift(startShift);
  const endMs = parseTimeShift(endShift);

  const from = dateTime(timestamp + startMs);
  const to = dateTime(timestamp + endMs);

  return {
    from,
    to,
    raw: { from, to },
  };
}

/**
 * Build WHERE clause from field mappings and context
 */
export function buildWhereClause(
  fieldMappings: FieldMapping[],
  context: LinkContext
): string {
  const conditions: string[] = [];

  fieldMappings
    .filter((mapping) => mapping.useInQuery !== false)
    .forEach((mapping) => {
      const sourceValue = extractFieldValue(context, mapping.sourceField);

      if (sourceValue !== undefined && sourceValue !== null) {
        const targetField = mapping.targetField || mapping.sourceField;
        const formattedValue = formatValueForQuery(sourceValue);
        conditions.push(`${targetField} = ${formattedValue}`);
      }
    });

  return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
}

/**
 * Extract field value from context
 */
export function extractFieldValue(context: LinkContext, fieldName: string): any {
  // Check labels first
  if (context.labels && fieldName in context.labels) {
    return context.labels[fieldName];
  }

  // Check values
  if (context.values && fieldName in context.values) {
    return context.values[fieldName];
  }

  // Check metadata
  if (context.metadata && fieldName in context.metadata) {
    return context.metadata[fieldName];
  }

  // Check direct properties
  if (fieldName in context) {
    return (context as any)[fieldName];
  }

  return undefined;
}

/**
 * Format value for SQL query
 */
export function formatValueForQuery(value: any): string {
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  if (value === null) {
    return 'NULL';
  }

  // For objects/arrays, stringify
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

/**
 * Interpolate query template with context values
 */
export function interpolateQuery(template: string, context: LinkContext, fieldMappings: FieldMapping[]): string {
  let query = template;

  // Replace field mapping placeholders: ${fieldName}
  fieldMappings.forEach((mapping) => {
    const sourceValue = extractFieldValue(context, mapping.sourceField);
    const targetField = mapping.targetField || mapping.sourceField;

    if (sourceValue !== undefined) {
      const formattedValue = formatValueForQuery(sourceValue);
      // Replace both ${targetField} and ${sourceField} patterns
      query = query.replace(new RegExp(`\\$\\{${targetField}\\}`, 'g'), formattedValue);
      query = query.replace(new RegExp(`\\$\\{${mapping.sourceField}\\}`, 'g'), formattedValue);
    }
  });

  // Replace $__timeFilter macro if timestamp exists
  if (context.timestamp) {
    const timeFilterPattern = /\$__timeFilter\((\w+)\)/g;
    query = query.replace(timeFilterPattern, (match, columnName) => {
      // This will be handled by Grafana's macro expansion
      return match;
    });
  }

  // Replace ${__timestamp} placeholder
  if (context.timestamp) {
    query = query.replace(/\$\{__timestamp\}/g, String(context.timestamp));
  }

  return query;
}

/**
 * Build query parameters object for external links
 */
export function buildQueryParams(
  fieldMappings: FieldMapping[],
  context: LinkContext
): Record<string, string> {
  const params: Record<string, string> = {};

  fieldMappings.forEach((mapping) => {
    const sourceValue = extractFieldValue(context, mapping.sourceField);
    const targetField = mapping.targetField || mapping.sourceField;

    if (sourceValue !== undefined) {
      params[targetField] = String(sourceValue);
    }
  });

  return params;
}

/**
 * Merge two configurations, with override taking precedence
 */
export function mergeConfig<T extends Record<string, any>>(base: T, override?: Partial<T>): T {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
  };
}

/**
 * Extract labels from time series name
 * Example: "requests{service='api',cluster='prod'}" → { service: 'api', cluster: 'prod' }
 */
export function extractLabelsFromSeriesName(seriesName: string): Record<string, string> {
  const labels: Record<string, string> = {};

  // Match label pattern: {key='value',key2='value2'}
  const labelMatch = seriesName.match(/\{([^}]+)\}/);
  if (!labelMatch) {
    return labels;
  }

  const labelString = labelMatch[1];
  const labelPairs = labelString.split(',');

  labelPairs.forEach((pair) => {
    const [key, value] = pair.split('=').map((s) => s.trim());
    if (key && value) {
      // Remove quotes
      labels[key] = value.replace(/['"]/g, '');
    }
  });

  return labels;
}

/**
 * Validate DataLinksConfig
 */
export function validateConfig(config: any): boolean {
  if (!config) {
    return false;
  }

  if (!config.enabled) {
    return false;
  }

  if (!config.targetDatasourceUid) {
    console.warn('DataLinksConfig: targetDatasourceUid is required');
    return false;
  }

  return true;
}
