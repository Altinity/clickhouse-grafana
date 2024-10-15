import {DataFrame, FieldType, MutableDataFrame} from "@grafana/data";
import {each, find, omitBy, pickBy} from "lodash";

const _toFieldType = (type: string, index?: number): FieldType => {
  if (type.startsWith('Nullable(')) {
    type = type.slice('Nullable('.length);
    type = type.slice(0, -')'.length);
  }
  if (type.startsWith('Date')) {
    return FieldType.time;
  }
  // Assuming that fist column is time
  // That's special case for 'Column:TimeStamp'
  if (index === 0 && type.startsWith('UInt')) {
    return FieldType.time;
  }

  if (type.startsWith('UInt') || type.startsWith('Int') || type.startsWith('Float') || type.startsWith('Decimal')) {
    return FieldType.number;
  }
  if (type.startsWith('IPv')) {
    return FieldType.other;
  }
  return FieldType.string;
}

export const toLogs = (self: any): DataFrame[] => {
  const dataFrame: DataFrame[] = [];
  const reservedFields = ['level', 'id'];

  if (self.series.length === 0) {
    return dataFrame;
  }

  let types: { [key: string]: any } = {};
  let labelFields: any[] = [];
  // Trying to find message field
  // If we have a "content" field - take it
  let messageField = find(self.meta, ['name', 'content'])?.name;
  // If not - take the first string field
  if (messageField === undefined) {
    messageField = find(self.meta, (o: any) => _toFieldType(o.type) === FieldType.string)?.name;
  }
  // If no string fields - this query is unusable for logs, because Grafana requires at least one text field
  if (messageField === undefined) {
    return dataFrame;
  }

  each(self.meta, function (col: any, index: number) {
    let type = _toFieldType(col.type, index);

    if (type === FieldType.string && col.name !== messageField && !reservedFields.includes(col.name)) {
      labelFields.push(col.name);
    }

    types[col.name] = type;
  });

  each(self.series, function (ser: any) {
    const frame = new MutableDataFrame({
      refId: self.refId,
      meta: {
        preferredVisualisationType: 'logs',
      },
      fields: [],
    });
    const labels = pickBy(ser, (_value: any, key: string) => labelFields.includes(key));

    each(ser, function (_value: any, key: string) {
      // Skip unknown keys for in case
      if (!(key in types)) {
        return;
      }
      if (key === messageField) {
        frame.addField({ name: key, type: types[key], labels: labels });
      } else if (!labelFields.includes(key)) {
        frame.addField({ name: key, type: types[key] });
      }
    });

    frame.add(omitBy(ser, (_value: any, key: string) => labelFields.includes(key)));
    dataFrame.push(frame);
  });

  return dataFrame;
}
