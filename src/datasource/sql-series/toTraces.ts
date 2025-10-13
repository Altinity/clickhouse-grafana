import { _toFieldType, convertTimezonedDateToUnixTimestamp, Field } from './sql_series';
import { FieldType, DataLink } from '@grafana/data';
import { TraceToMetricsOptions, DataLinksConfig } from '../../types/types';
import { TraceToMetricsLinkBuilder } from '../trace-to-metrics/linkBuilder';
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
  tracesToMetrics?: TraceToMetricsOptions,
  dataLinksConfig?: DataLinksConfig
): TraceData[] => {
  function transformTraceData(inputData: Trace[]): TraceData[] {
    let timeCol = meta.find((item) => item.name === 'startTime');
    let timeColType = _toFieldType(timeCol.type || '');

    // Initialize link builder - prefer new system, fall back to old
    let linkBuilder: TraceToMetricsLinkBuilder | any = undefined;
    let useNewSystem = false;

    if (dataLinksConfig) {
      // Use new centralized system
      const newBuilder = LinkBuilderFactory.getBuilder<TracesLinkContext>('traces', dataLinksConfig);
      if (newBuilder) {
        linkBuilder = newBuilder;
        useNewSystem = true;
      }
    } else if (tracesToMetrics?.enabled && tracesToMetrics?.datasourceUid) {
      // Fall back to old trace-to-metrics system for backward compatibility
      linkBuilder = new TraceToMetricsLinkBuilder(tracesToMetrics);
      useNewSystem = false;
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

    // Generate DataLinks for each span
    if (linkBuilder) {
      const spanLinks: DataLink[][] = [];

      spanDataList.forEach((spanData) => {
        // If using new system, create proper context
        if (useNewSystem) {
          const context = TracesLinkBuilder.createContext(spanData);
          const links = linkBuilder.buildLinks(context);
          spanLinks.push(links);
        } else {
          // Old system (backward compatibility)
          const links = linkBuilder.buildLinks(spanData);
          spanLinks.push(links);
        }
      });

      // Attach links to the spanID field
      if (spanLinks.length > 0 && spanLinks.some(links => links.length > 0)) {
        // Store links per span value
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
