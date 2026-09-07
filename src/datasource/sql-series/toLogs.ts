import {createDataFrame, DataFrame, DataFrameType, FieldType} from '@grafana/data';
import {each, find} from 'lodash';
import {convertTimezonedDateToUTC} from './sql_series';
import { resolveFieldModes, transformObject, renderFieldByMode, pathStyleForType } from './logsFieldModes';

// Re-export transformObject so existing imports from './toLogs' keep working
export { transformObject } from './logsFieldModes';

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

  const fieldModes = resolveFieldModes(self.meta || [], self.logsFieldConfig);

  const chTypeByName: Record<string, string> = {};
  (self.meta || []).forEach((c: any) => { chTypeByName[c.name] = c.type; });

  each(self.meta, function (col: any, index: number) {
    let type = _toFieldType(col.type, index);
    const mode = fieldModes[col.name];

    const isLabelCandidate =
      (type === FieldType.number || type === FieldType.string) &&
      col.name !== messageField &&
      !reservedFields.includes(col.name);

    if (isLabelCandidate && mode !== 'hide' && mode !== 'raw') {
      labelFields.push(col.name);
    }

    types[col.name] = type;
  });

  const rawFields = (self.meta || [])
    .map((c: any) => c.name)
    .filter((name: string) => fieldModes[name] === 'raw' && name !== messageField);

  const dataObjectValues = Object.entries(self.series[0]).reduce((acc, [key, value]) => {
    acc[key] = {
      type: types[key],
      values: [],
      name: key,
    };

    return acc;
  },{});

  each(self.series, function (ser: any) {
    const labels: any = {};
    for (const key of labelFields) {
      const mode = fieldModes[key];
      if (mode) {
        const depth = self.logsFieldConfig?.[key]?.depth;
        Object.assign(labels, renderFieldByMode(key, ser[key], mode, depth, pathStyleForType(chTypeByName[key] || '')).labels);
      } else {
        labels[key] = ser[key];
      }
    }

    // Push one labels object per row whenever label fields exist — even if this row's
    // rendered labels are empty (e.g. an expand-mode Map value of {}). Skipping empty
    // rows would desynchronize the labels field from timestamp/body rows.
    if (labelFields.length > 0) {
      labelFieldsList.push(transformObject(labels));
    }

    const timestampObject = Object.entries(types)?.find(object => object[1] === 'time')
    timestampKey = timestampObject? timestampObject[0] : null;

    let rawSuffix = '';
    for (const rawName of rawFields) {
      const r = renderFieldByMode(rawName, ser[rawName], 'raw');
      rawSuffix += ` ${r.bodyAppend}`;
    }

    Object.entries(ser).forEach(([key, value]) => {
      let outValue: any = value;
      if (key === messageField && rawSuffix) {
        outValue = `${value}${rawSuffix}`;
      }
      if (
        types[key] &&
        types[key] instanceof Object &&
        'fieldType' in types[key] &&
        types[key].fieldType === FieldType.time
      ) {
        timestampKey = key;
        dataObjectValues[key].values.push(convertTimezonedDateToUTC(value, types[key].timezone));
      } else {
        // With output_format_json_quote_64bit_integers=1 (enabled for logs queries),
        // UInt64/Int64 values arrive as strings; coerce all-digit strings for time-typed
        // columns back to numbers so the timestamp field stays valid (epoch ms < 2^53).
        if (types[key] === FieldType.time && typeof outValue === 'string' && /^\d+$/.test(outValue)) {
          outValue = Number(outValue);
        }
        dataObjectValues[key].values.push(outValue);
      }
    });
  });

  const result = createDataFrame({
    fields: [
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
    ].filter(Boolean),
    meta: {
      type: DataFrameType.LogLines,
      preferredVisualisationType: 'logs'
    },
    refId: self.refId,
  });

  return [result]
};
