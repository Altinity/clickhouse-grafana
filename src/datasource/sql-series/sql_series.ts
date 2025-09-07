import { toAnnotation } from './toAnnotation';
import { toFlamegraph } from './toFlamegraph';
import { toLogs } from './toLogs';
import { toTable } from './toTable';
import { toTimeSeries } from './toTimeSeries';
import { toTraces } from './toTraces';
import { DateTime } from 'luxon';
import { FieldType } from '@grafana/data';

export interface Field {
  name: string;
  type: string;
  values: Array<string | number | null | object>;
  config: Record<string, unknown>;
}

export const convertTimezonedDateToUTC = (localDateTime, timeZone) => {
  // Define supported datetime formats
  const formats = [
    'yyyy-MM-dd HH:mm:ss.SSS',
    'yyyy-MM-dd HH:mm:ss.SSSSSS',
    'yyyy-MM-dd HH:mm:ss.SSSSSSSSS',
    'yyyy-MM-dd HH:mm:ss',
    'MM/dd/yyyy HH:mm',
    'dd-MM-yyyy HH:mm:ss',
    'yyyy/MM/dd HH:mm:ss',
    'MMM dd, yyyy HH:mm:ss',
    // Add more formats as needed
  ];

  // Attempt to parse using the supported formats
  const parsedDateTime =
    formats.map((format) => DateTime.fromFormat(localDateTime, format, { zone: timeZone })).find((dt) => dt.isValid) ||
    DateTime.fromISO(localDateTime, { zone: timeZone });

  // Validate the parsing result
  if (!parsedDateTime.isValid) {
    throw new Error(`Invalid datetime format: "${localDateTime}"`);
  }

  // Parse the datetime string in the specified timezone
  return parsedDateTime.toUTC().toISO();
};

export const convertTimezonedDateToUnixTimestamp = (localDateTime, timeZone) => {
  // Define supported datetime formats
  const formats = [
    'yyyy-MM-dd HH:mm:ss.SSS',
    'yyyy-MM-dd HH:mm:ss.SSSSSS',
    'yyyy-MM-dd HH:mm:ss.SSSSSSSSS',
    'yyyy-MM-dd HH:mm:ss',
    'MM/dd/yyyy HH:mm',
    'dd-MM-yyyy HH:mm:ss',
    'yyyy/MM/dd HH:mm:ss',
    'MMM dd, yyyy HH:mm:ss',
    // Add more formats as needed
  ];

  // Attempt to parse using the supported formats
  const parsedDateTime =
    formats.map((format) => DateTime.fromFormat(localDateTime, format, { zone: timeZone })).find((dt) => dt.isValid) ||
    DateTime.fromISO(localDateTime, { zone: timeZone });

  // Validate the parsing result
  if (!parsedDateTime.isValid) {
    throw new Error(`Invalid datetime format: "${localDateTime}"`);
  }

  // Parse the datetime string in the specified timezone
  return parsedDateTime.toUTC().toMillis();
};

export const _toFieldType = (type: string, index?: number): FieldType | any => {
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

export default class SqlSeries {
  refId: string;
  series: any;
  keys: any;
  meta: any[];
  tillNow: any;
  from: any;
  to: any;

  /** @ngInject */
  constructor(options: any) {
    this.refId = options.refId;
    this.series = options.series;
    this.meta = options.meta;
    this.tillNow = options.tillNow;
    this.from = options.from;
    this.to = options.to;
    this.keys = options.keys || [];
  }

  toAnnotation = (input: any, meta: any): any[] => {
    return toAnnotation(input, meta);
  };

  toFlamegraph = (): any => {
    return toFlamegraph(this.series);
  };

  toLogs = (): any => {
    const self = this;
    return toLogs(self);
  };

  toTable = (): any => {
    let self = this;
    return toTable(self);
  };

  toTimeSeries = (extrapolate = true, nullifySparse = false): any => {
    let self = this;
    return toTimeSeries(extrapolate, nullifySparse, self);
  };

  toTraces = (tracesToMetrics?: any): any => {
    return toTraces(this.series, this.meta, tracesToMetrics);
  };
}
