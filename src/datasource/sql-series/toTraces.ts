import { _toFieldType, convertTimezonedDateToUnixTimestamp, Field } from './sql_series';
import { FieldType } from '@grafana/data';
import { DataLinksConfig } from '../../types/types';
import { LinkBuilderFactory, TracesLinkBuilder, TracesLinkContext } from '../datalinks';

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

export const toTraces = (
  series: Trace[],
  meta: any,
  dataLinksConfig?: DataLinksConfig,
  sourceQuery?: any
): TraceData[] => {
  function transformTraceData(inputData: Trace[]): TraceData[] {
    let timeCol = meta.find((item) => item.name === 'startTime');
    let timeColType = _toFieldType(timeCol.type || '');

    // Initialize link builder if dataLinksConfig is provided
    let linkBuilder: any = undefined;

    if (dataLinksConfig) {
      linkBuilder = LinkBuilderFactory.getBuilder<TracesLinkContext>('traces', dataLinksConfig, sourceQuery);
    }

    const fields: { [key: string]: Field } = {
      traceID: { name: 'traceID', type: 'string', values: [], config: {} },
      spanID: { name: 'spanID', type: 'string', values: [], config: { links: [] } },
      operationName: { name: 'operationName', type: 'string', values: [], config: {} },
      parentSpanID: { name: 'parentSpanID', type: 'string', values: [], config: {} },
      serviceName: { name: 'serviceName', type: 'string', values: [], config: {} },
      startTime: { name: 'startTime', type: 'number', values: [], config: {} },
      duration: { name: 'duration', type: 'number', values: [], config: {} },
      tags: { name: 'tags', type: 'number', values: [], config: {} },
      serviceTags: { name: 'serviceTags', type: 'number', values: [], config: {} },
    };

    // Store all span data for link generation
    const spanDataList: any[] = [];

    inputData.forEach((span, index) => {
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
      
      // Convert tags to the expected format
      const tagsObj = Object.entries(span.tags).map(([key, value]) => ({ key: key, value: value }));
      const serviceTagsObj = Object.entries(span.serviceTags).map(([key, value]) => ({ key: key, value: value }));
      
      fields.tags.values.push(tagsObj);
      fields.serviceTags.values.push(serviceTagsObj);
      
      // Store span data for link generation
      spanDataList.push({
        traceID: span.traceID,
        spanID: span.spanID,
        parentSpanID: span.parentSpanID,
        serviceName: span.serviceName,
        operationName: span.operationName,
        startTime: isTimeWithTimezone ? startTimeProcessed : parseInt(span.startTime.toString(), 10),
        duration: parseInt(span.duration.toString(), 10),
        tags: span.tags,
        serviceTags: span.serviceTags,
      });
    });

    // Generate DataLinks template from first span
    // Similar to time series, we create template links once and Grafana interpolates per-span
    if (linkBuilder && spanDataList.length > 0) {
      const sampleSpan = spanDataList[0];
      const context = TracesLinkBuilder.createContext(sampleSpan);
      const spanLinks = linkBuilder.buildLinks(context);

      // Attach template links to the spanID field
      if (spanLinks.length > 0) {
        fields.spanID.config.links = spanLinks;
      }
    }

    return [
      {
        fields: Object.values(fields),
        length: inputData.length,
      },
    ];
  }

  return transformTraceData(series);
};
