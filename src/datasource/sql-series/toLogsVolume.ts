import { createDataFrame, DataFrame, FieldType } from '@grafana/data';
import { each } from 'lodash';

import { _toFieldType } from './sql_series';

// Aggregate column name (lowercased) → Grafana canonical LogLevel value.
// Grafana derives one level per frame from the numeric field's `labels.level`
// (defaultExtractLevel), so each level must be emitted as its own frame.
const LEVEL_BY_COLUMN: { [column: string]: string } = {
  critical: 'critical',
  crit: 'critical',
  fatal: 'critical',
  error: 'error',
  err: 'error',
  warning: 'warning',
  warn: 'warning',
  info: 'info',
  informational: 'info',
  notice: 'info',
  debug: 'debug',
  dbug: 'debug',
  trace: 'trace',
  unknown: 'unknown',
};

const isTimeType = (type: string, index: number): boolean => {
  const fieldType = _toFieldType(type || '', index);
  return fieldType === FieldType.time || (fieldType instanceof Object && fieldType.fieldType === FieldType.time);
};

export const toLogsVolume = (self: any): DataFrame[] => {
  if (!self.series || self.series.length === 0) {
    return [];
  }

  let timeColumn: string | undefined;
  each(self.meta, (col: any, index: number) => {
    if (timeColumn === undefined && isTimeType(col.type, index)) {
      timeColumn = col.name;
    }
  });
  if (timeColumn === undefined) {
    timeColumn = self.meta?.[0]?.name;
  }

  const timeValues = self.series.map((row: any) => Number(row[timeColumn!]));

  const frames: DataFrame[] = [];
  each(self.meta, (col: any) => {
    const level = col.name === timeColumn ? undefined : LEVEL_BY_COLUMN[String(col.name).toLowerCase()];
    if (!level) {
      return;
    }

    // shared zero-filled time grid: every frame gets a value for every bucket row
    const counts = self.series.map((row: any) => {
      const value = Number(row[col.name]);
      return Number.isFinite(value) ? value : 0;
    });

    // skip levels absent from the range to keep the histogram legend to actual levels
    if (!counts.some((value: number) => value !== 0)) {
      return;
    }

    frames.push(
      createDataFrame({
        refId: self.refId,
        fields: [
          { name: 'time', type: FieldType.time, values: timeValues },
          { name: 'value', type: FieldType.number, values: counts, labels: { level } },
        ],
        meta: { preferredVisualisationType: 'graph' },
      })
    );
  });

  return frames;
};
