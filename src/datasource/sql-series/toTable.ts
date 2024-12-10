import { each } from 'lodash';

const _toJSTypeInTable = (type: any): string => {
  switch (type) {
    case 'UInt8':
    case 'UInt16':
    case 'UInt32':
    case 'UInt64':
    case 'Int8':
    case 'Int16':
    case 'Int32':
    case 'Int64':
    case 'Float32':
    case 'Float64':
    case 'Decimal':
    case 'Decimal32':
    case 'Decimal64':
    case 'Decimal128':
    case 'Nullable(UInt8)':
    case 'Nullable(UInt16)':
    case 'Nullable(UInt32)':
    case 'Nullable(UInt64)':
    case 'Nullable(Int8)':
    case 'Nullable(Int16)':
    case 'Nullable(Int32)':
    case 'Nullable(Int64)':
    case 'Nullable(Float32)':
    case 'Nullable(Float64)':
    case 'Nullable(Decimal)':
    case 'Nullable(Decimal32)':
    case 'Nullable(Decimal64)':
    case 'Nullable(Decimal128)':
      return 'number';
    default:
      return 'string';
  }
};

const _formatValueByType = (value: any, t: string) => {
  if (value === null) {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  let numeric = Number(value);
  if (isNaN(numeric) || t !== 'number') {
    return value;
  } else {
    return numeric;
  }
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
    each(columns, function (col, index) {
      r.push(_formatValueByType(ser[col.text], _toJSTypeInTable(self.meta[index].type)));
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
