import {createDataFrame, DataFrame, DataFrameType, FieldType} from '@grafana/data';
import {each, find, omitBy, pickBy} from 'lodash';
import {convertTimezonedDateToUTC} from './sql_series';
import { applyDataLinks } from '../datalinks';

export const transformObject = (obj) => {
  // Check if the input is an object and not null
  if (obj && typeof obj === 'object') {
    // Create a new object to store the transformed properties
    const result = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        // If the value is an object (and not null), extract first level properties
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            // For arrays, we still stringify
            result[key] = JSON.stringify(value);
          } else {
            // For objects, extract first level properties
            for (const nestedKey in value) {
              if (Object.prototype.hasOwnProperty.call(value, nestedKey)) {
                const nestedValue = value[nestedKey];
                // Create a new key in the format `key[nestedKey]`
                const newKey = `${key}['${nestedKey}']`;
                
                // If nested value is still an object, stringify it
                if (nestedValue && typeof nestedValue === 'object') {
                  result[newKey] = JSON.stringify(nestedValue);
                } else {
                  // Otherwise, keep the primitive value as is
                  result[newKey] = nestedValue;
                }
              }
            }
          }
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
  const reservedFields = ['severity', 'level', 'id'];

  if (self.series.length === 0) {
    return [];
  }

  // Columns referenced by data-link configs are promoted to top-level fields
  // below (instead of being folded into the `labels` map). Exclude them from
  // `labelFields` so the value isn't duplicated in both places.
  const promotedColumns = new Set<string>(
    ((self.dataLinks ?? []) as Array<{ fieldName?: string }>)
      .map((c) => c.fieldName)
      .filter((n): n is string => !!n)
  );

  let types: { [key: string]: any } = {};
  let labelFields: any[] = [];
  const labelFieldsList: any[] = []
  let timestampKey;
  // Trying to find message field, If we have a "content" field - take it, If not - take the first string field
  let messageField = find(self.meta, ['name', 'content'])?.name;
  if (messageField === undefined) {
    messageField = find(self.meta, (o: any) => _toFieldType(o.type) === FieldType.string)?.name;
  }

  // If no string fields - this query is unusable for logs, because Grafana requires at least one text field
  if (messageField === undefined) {
    return [];
  }

  each(self.meta, function (col: any, index: number) {
    let type = _toFieldType(col.type, index);

    if (
      (type === FieldType.number || type === FieldType.string) &&
      col.name !== messageField &&
      !reservedFields.includes(col.name) &&
      !promotedColumns.has(col.name)
    ) {
      labelFields.push(col.name);
    }

    types[col.name] = type;
  });

  const dataObjectValues = Object.entries(self.series[0]).reduce((acc, [key, value]) => {
    acc[key] = {
      type: types[key],
      values: [],
      name: key,
    };

    return acc;
  },{});

  each(self.series, function (ser: any) {
    const labels = pickBy(ser, (_value: any, key: string) => labelFields.includes(key));

    if (Object.keys(labels).length > 0) {
      labelFieldsList.push(transformObject(labels))
    }

    const data = omitBy(ser, (_value: any, key: string) => {
      labelFields.includes(key);
    });

    const timestampObject = Object.entries(types)?.find(object => object[1] === 'time')
    timestampKey = timestampObject? timestampObject[0] : null;

    Object.entries(data)?.forEach(([key, value]) => {
      if (
        types[key] &&
        types[key] instanceof Object &&
        'fieldType' in types[key] &&
        types[key].fieldType === FieldType.time
      ) {
        timestampKey = key;
        dataObjectValues[key].values.push(convertTimezonedDateToUTC(value, types[key].timezone));
      } else {
        dataObjectValues[key].values.push(value);
      }

    });
  });

  const baseFields = [
    dataObjectValues[timestampKey]?.values.length && {
      name: 'timestamp',
      type: FieldType.time,
      values: dataObjectValues[timestampKey]?.values,
    },
    (dataObjectValues['level']?.values?.length || dataObjectValues['severity']?.values?.length) && {
      name: 'severity',
      type: (dataObjectValues['level'] || dataObjectValues['severity'])?.type,
      values: (dataObjectValues['level'] || dataObjectValues['severity'])?.values,
    },
    dataObjectValues[messageField] && {
      name: 'body',
      type: dataObjectValues[messageField].type,
      values: dataObjectValues[messageField].values,
      config: { filterable: false }
    },
    labelFieldsList.length && {
      name: 'labels',
      values: labelFieldsList,
      type: FieldType.other,
    },
    dataObjectValues['id']?.values?.length &&
    {
      name: 'id',
      type: (dataObjectValues['id'])?.type,
      values: (dataObjectValues['id'])?.values,
    },
  ].filter(Boolean);

  // Promote dataLink-referenced source columns as top-level fields when they
  // are not already represented by the standard fields above. This lets users
  // attach a link directly to e.g. `trace_id` even though the logs converter
  // would otherwise fold it into the `labels` field.
  const existingFieldNames = new Set(baseFields.map((f: any) => f.name));
  const extraFields = Array.from(promotedColumns)
    .filter((name) => !existingFieldNames.has(name) && dataObjectValues[name]?.values?.length)
    .map((name) => {
      const col: any = dataObjectValues[name];
      let fieldType: any = col.type;
      if (fieldType && typeof fieldType === 'object' && 'fieldType' in fieldType) {
        fieldType = fieldType.fieldType;
      }
      return { name, type: fieldType, values: col.values, config: {} };
    });

  const result = createDataFrame({
    fields: [...baseFields, ...extraFields],
    meta: {
      type: DataFrameType.LogLines,
      preferredVisualisationType: 'logs'
    },
    refId: self.refId,
  });

  applyDataLinks(result.fields as any, self.dataLinks, { app: self.app });

  return [result]
};
