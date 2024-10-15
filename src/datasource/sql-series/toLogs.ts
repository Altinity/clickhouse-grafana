import {DataFrame, FieldType, MutableDataFrame} from "@grafana/data";
import {each, find, omitBy, pickBy} from "lodash";
import { DateTime } from 'luxon';



const convertTimezonedDateToUTC = (localDateTime, timeZone) => {
  // Parse the datetime string in the specified timezone
  const dt = DateTime.fromFormat(localDateTime, "yyyy-MM-dd HH:mm:ss.SSS", { zone: timeZone });

  // Convert to UTC
  const utcDateTime = dt.toUTC().toISO();

  return utcDateTime;
}


const _toFieldType = (type: string, index?: number): FieldType | Object => {
  if (type.startsWith('Nullable(')) {
    type = type.slice('Nullable('.length);
    type = type.slice(0, -')'.length);
  }

  // Regex to match DateTime64 with timezone
  const dateTime64WithTZRegex = /^DateTime64\(\d+,\s*'([^']+)'\)$/i;
  const dateTime64WithTZMatch = type.match(dateTime64WithTZRegex);
  if (dateTime64WithTZMatch) {
    const timezone = dateTime64WithTZMatch[1];
    return { fieldType: FieldType.time, timezone };
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
      } else if (!labelFields.includes(key) && types[key].fieldType === FieldType.time) {
        frame.addField({ name: key, type: FieldType.time });
      } else if (!labelFields.includes(key)) {
        frame.addField({ name: key, type: types[key] });
      }
    });

    const data = omitBy(ser, (_value: any, key: string) => {
      labelFields.includes(key)
    });

    const frameData = Object.entries(data).reduce((acc, [key, value]) => {
      if (types[key].fieldType === FieldType.time) {
        acc[key] = convertTimezonedDateToUTC(value, types[key].timezone);
      } else {
        acc[key] = value;
      }

      return acc
    }, {});

    frame.add(frameData);
    dataFrame.push(frame);
  });

  return dataFrame;
}
