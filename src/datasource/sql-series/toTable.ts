import { each } from 'lodash';

/**
 * Maps ClickHouse types to JavaScript types for table display.
 * Returns 'number' for numeric types, 'string' for everything else.
 */
const _toJSTypeInTable = (type: any): string => {
  switch (type) {
    // Safe numeric types (fit within JS Number precision)
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
    // 64-bit types that can exceed JS safe integer range are now strings from Go backend
    // See: https://github.com/Altinity/clickhouse-grafana/issues/832
    case 'UInt64':
    case 'Int64':
    case 'Decimal64':
    case 'Decimal128':
    case 'Nullable(UInt64)':
    case 'Nullable(Int64)':
    case 'Nullable(Decimal64)':
    case 'Nullable(Decimal128)':
      return 'string';
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

export const toTable = (self): any => {
  let data: Array<{ columns: any[]; rows: any[]; type: string }> = [];
  if (self.series.length === 0) {
    return data;
  }

  let columns: any[] = [];
  each(self.meta, function (col) {
    columns.push({ text: col.name, type: _toJSTypeInTable(col.type) });
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
