import {Field} from "./sql_series";

interface TraceData {
  fields: Field[];
  length: number;
}

interface Trace {
  traceID: string;
  spanID: string;
  parentSpanID?: string | null;
  serviceName: string;
  startTime: number;
  duration: number;
  operationName: string;
  tags: object[];
  serviceTags: object[];
}

export const toTraces = (series: Trace[]): TraceData[] => {
  function transformTraceData(inputData: Trace[]): TraceData[] {
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
      fields.traceID.values.push(span.traceID);
      fields.spanID.values.push(span.spanID);
      fields.operationName.values.push(span.operationName);
      fields.parentSpanID.values.push(span.parentSpanID || null); // Assuming null if undefined
      fields.serviceName.values.push(span.serviceName);
      fields.startTime.values.push(parseInt(span.startTime.toString(), 10));
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
}
