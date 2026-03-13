import { each } from 'lodash';
import { is64BitIntegerType, isSafeInteger } from './bigIntUtils';

/**
 * Maps ClickHouse types to JavaScript types for table display.
 * Returns 'number' for numeric types, 'string' for everything else.
 *
 * For 64-bit integer types (UInt64/Int64/Decimal64/Decimal128), the type
 * is determined per-value: if all values fit within JS safe integer range,
 * the column is typed as 'number'; otherwise as 'string'.
 */
const _toJSTypeInTable = (type: any): string => {
  switch (type) {
    case 'UInt8':
    case 'UInt16':
    case 'UInt32':
    case 'Int8':
    case 'Int16':
    case 'Int32':
    case 'Float32':
    case 'Float64':
    case 'Decimal':
    case 'Decimal32':
    case 'Nullable(UInt8)':
    case 'Nullable(UInt16)':
    case 'Nullable(UInt32)':
    case 'Nullable(Int8)':
    case 'Nullable(Int16)':
    case 'Nullable(Int32)':
    case 'Nullable(Float32)':
    case 'Nullable(Float64)':
    case 'Nullable(Decimal)':
    case 'Nullable(Decimal32)':
      return 'number';
    default:
      return 'string';
  }
};

const _formatValue = (value: any, type: string) => {
  if (value === null) {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (type === 'number') {
    const numeric = Number(value);
    return isNaN(numeric) ? value : numeric;
  }

  // For string types (including 64-bit integers), return as-is
  return value;
};

/**
 * Check if all values in a column are safe integers.
 * Used to decide whether a 64-bit integer column can be typed as 'number'.
 */
const _allValuesSafe = (series: any[], columnName: string): boolean => {
  for (const row of series) {
    const value = row[columnName];
    if (value === null || value === undefined) {
      continue;
    }
    if (!isSafeInteger(value)) {
      return false;
    }
  }
  return true;
};

export const toTable = (self): any => {
  let data: Array<{ columns: any[]; rows: any[]; type: string }> = [];
  if (self.series.length === 0) {
    return data;
  }

  let columns: any[] = [];
  each(self.meta, function (col) {
    let jsType = _toJSTypeInTable(col.type);
    // For 64-bit integer types, check actual values to determine if they fit in JS Number
    // See: https://github.com/Altinity/clickhouse-grafana/issues/832
    if (jsType === 'string' && is64BitIntegerType(col.type)) {
      if (_allValuesSafe(self.series, col.name)) {
        jsType = 'number';
      }
    }
    columns.push({ text: col.name, type: jsType });
  });

  let rows: any[] = [];
  each(self.series, function (ser) {
    let r: any[] = [];
    each(columns, function (col) {
      r.push(_formatValue(ser[col.text], col.type));
    });
    rows.push(r);
  });

  data.push({
    columns: columns,
    rows: rows,
    type: 'table',
  });

  return data;
};
