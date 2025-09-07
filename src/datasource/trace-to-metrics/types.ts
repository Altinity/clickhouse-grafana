import { TraceToMetricsOptions } from '../../types/types';

export interface SpanAttributes {
  [key: string]: any;
}

export interface TraceSpan {
  traceID: string;
  spanID: string;
  parentSpanID?: string | null;
  serviceName: string;
  operationName: string;
  startTime: number | string;
  duration: number;
  tags: SpanAttributes;
  serviceTags: SpanAttributes;
}

export interface ProcessedTag {
  key: string;
  value: string;
}

export interface LinkBuilderOptions {
  tracesToMetrics: TraceToMetricsOptions;
  datasourceUid: string;
  span: TraceSpan;
}