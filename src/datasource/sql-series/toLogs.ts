import { DataFrame, FieldType, MutableDataFrame } from '@grafana/data';
import { each, find, omitBy, pickBy } from 'lodash';
import { convertTimezonedDateToUTC } from './sql_series';

const _toFieldType = (type: string, index?: number): FieldType | Object => {
  if (type.startsWith('Nullable(')) {
    type = type.slice('Nullable('.length);
    type = type.slice(0, -')'.length);
  }

  // Regex patterns
  const dateTimeCombinedRegexTrimmed = /^\s*DateTime(?:64)?\s*\(\s*(?:\d+\s*,\s*)?['"]([^'"]+)['"]\s*\)\s*$/i;

  const dateTimeWithTZMatch = type.match(dateTimeCombinedRegexTrimmed);

  let timezone;
  if (dateTimeWithTZMatch) {
    timezone = dateTimeWithTZMatch[1];
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
};

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
        const transformObject = (obj) => {
          // Check if the input is an object and not null
          if (obj && typeof obj === 'object') {
            // Create a new object to store the transformed properties
            const result = Array.isArray(obj) ? [] : {};

            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];

                // If the value is an object (and not null), convert it to a string
                if (value && typeof value === 'object') {
                  result[key] = JSON.stringify(value);
                } else {
                  // Otherwise, keep the primitive value as it is
                  result[key] = value;
                }
              }
            }

            return result;
          }
          // Return the original value if it's not an object
          return obj;
        }

        frame.addField({ name: key, type: types[key], labels: transformObject(labels), config: { filterable: false } });
      } else if (!labelFields.includes(key) && types[key].fieldType === FieldType.time) {
        frame.addField({ name: key, type: FieldType.time });
      } else if (!labelFields.includes(key)) {
        frame.addField({ name: key, type: types[key] });
      }
    });

    const data = omitBy(ser, (_value: any, key: string) => {
      labelFields.includes(key);
    });
    const frameData = Object.entries(data).reduce((acc, [key, value]) => {
      if (
        types[key] &&
        types[key] instanceof Object &&
        'fieldType' in types[key] &&
        types[key].fieldType === FieldType.time
      ) {
        acc[key] = convertTimezonedDateToUTC(value, types[key].timezone);
      } else {
        acc[key] = value;
      }

      return acc;
    }, {});

    frame.add(frameData);
    dataFrame.push(frame);
  });

  return dataFrame;
};
