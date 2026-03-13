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

function createEmptyFields(): { [key: string]: Field } {
  return {
    traceID: { name: 'traceID', type: 'string', values: [], config: {} },
    spanID: { name: 'spanID', type: 'string', values: [], config: {} },
    operationName: { name: 'operationName', type: 'string', values: [], config: {} },
    parentSpanID: { name: 'parentSpanID', type: 'string', values: [], config: {} },
    serviceName: { name: 'serviceName', type: 'string', values: [], config: {} },
    startTime: { name: 'startTime', type: 'number', values: [], config: {} },
    duration: { name: 'duration', type: 'number', values: [], config: {} },
    tags: { name: 'tags', type: 'other', values: [], config: {} },
    serviceTags: { name: 'serviceTags', type: 'other', values: [], config: {} },
  };
}

export const toTraces = (series: Trace[], meta: any): TraceData[] => {
  let timeCol = meta.find((item: any) => item.name === 'startTime');
  let timeColType = _toFieldType(timeCol.type || '');
  const isTimeWithTimezone = timeColType?.fieldType === FieldType.time;

  // Group spans by traceID so each trace gets its own DataFrame.
  // Grafana traces panel (>=10.2) computes critical paths per trace
  // and crashes if multiple traces are mixed in a single DataFrame.
  const grouped = new Map<string, Trace[]>();
  for (const span of series) {
    const tid = String(span.traceID);
    let group = grouped.get(tid);
    if (!group) {
      group = [];
      grouped.set(tid, group);
    }
    group.push(span);
  }

  // Sort groups by span count descending so the largest trace is first.
  // Grafana traces panel renders only the first DataFrame (series[0]).
  const sortedGroups = [...grouped.values()].sort((a, b) => b.length - a.length);

  const results: TraceData[] = [];
  for (const spans of sortedGroups) {
    const fields = createEmptyFields();

    for (const span of spans) {
      let startTimeProcessed;
      if (isTimeWithTimezone) {
        startTimeProcessed = convertTimezonedDateToUnixTimestamp(span.startTime, timeColType.timezone);
      }

      fields.traceID.values.push(String(span.traceID));
      // Convert spanID/parentSpanID to strings — ClickHouse UInt64 values
      // exceed Number.MAX_SAFE_INTEGER and must be represented as strings
      // for Grafana traces panel to build the span tree correctly.
      fields.spanID.values.push(String(span.spanID));
      fields.operationName.values.push(span.operationName);
      fields.parentSpanID.values.push(span.parentSpanID ? String(span.parentSpanID) : null);
      fields.serviceName.values.push(span.serviceName);
      fields.startTime.values.push(isTimeWithTimezone ? startTimeProcessed : parseInt(span.startTime.toString(), 10));
      fields.duration.values.push(parseInt(span.duration.toString(), 10));
      fields.tags.values.push(Object.entries(span.tags).map(([key, value]) => ({ key: key, value: value })));
      fields.serviceTags.values.push(
        Object.entries(span.serviceTags).map(([key, value]) => ({ key: key, value: value }))
      );
    }

    results.push({
      fields: Object.values(fields),
      length: spans.length,
    });
  }

  return results;
};
