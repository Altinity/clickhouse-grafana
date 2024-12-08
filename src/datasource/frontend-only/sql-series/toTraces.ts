import { _toFieldType, convertTimezonedDateToUnixTimestamp, Field } from './sql_series';
import { FieldType } from '@grafana/data';

interface TraceData {
  fields: Field[];
  length: number;
}

interface Trace {
  traceID: string;
  spanID: string;
  parentSpanID?: string | null;
  serviceName: string;
  startTime: number | string;
  duration: number;
  operationName: string;
  tags: object[];
  serviceTags: object[];
}

export const toTraces = (series: Trace[], meta: any): TraceData[] => {
  function transformTraceData(inputData: Trace[]): TraceData[] {
    let timeCol = meta.find((item) => item.name === 'startTime');
    let timeColType = _toFieldType(timeCol.type || '');

    const fields: { [key: string]: Field } = {
      traceID: { name: 'traceID', type: 'string', values: [], config: {} },
      spanID: { name: 'spanID', type: 'string', values: [], config: {} },
      operationName: { name: 'operationName', type: 'string', values: [], config: {} },
      parentSpanID: { name: 'parentSpanID', type: 'string', values: [], config: {} },
      serviceName: { name: 'serviceName', type: 'string', values: [], config: {} },
      startTime: { name: 'startTime', type: 'number', values: [], config: {} },
      duration: { name: 'duration', type: 'number', values: [], config: {} },
      tags: { name: 'tags', type: 'number', values: [], config: {} },
      serviceTags: { name: 'serviceTags', type: 'number', values: [], config: {} },
    };

    inputData.forEach((span) => {
      const isTimeWithTimezone = timeColType?.fieldType === FieldType.time;

      let startTimeProcessed;
      if (isTimeWithTimezone) {
        startTimeProcessed = convertTimezonedDateToUnixTimestamp(span.startTime, timeColType.timezone);
      }

      fields.traceID.values.push(span.traceID);
      fields.spanID.values.push(span.spanID);
      fields.operationName.values.push(span.operationName);
      fields.parentSpanID.values.push(span.parentSpanID || null); // Assuming null if undefined
      fields.serviceName.values.push(span.serviceName);
      fields.startTime.values.push(isTimeWithTimezone ? startTimeProcessed : parseInt(span.startTime.toString(), 10));
      fields.duration.values.push(parseInt(span.duration.toString(), 10));
      fields.tags.values.push(Object.entries(span.tags).map(([key, value]) => ({ key: key, value: value })));
      fields.serviceTags.values.push(
        Object.entries(span.serviceTags).map(([key, value]) => ({ key: key, value: value }))
      );
      // Handle other fields if required
    });

    return [
      {
        fields: Object.values(fields),
        length: inputData.length,
      },
    ];
  }

  return transformTraceData(series);
};
