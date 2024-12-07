import { CHQuery, EditorMode, TimestampFormat } from '../../../types/types';
import { DEFAULT_FORMAT, DEFAULT_INTERVAL_FACTOR, DEFAULT_ROUND, defaultQuery } from '../../constants';

export const initializeQueryDefaults = (
  query: CHQuery,
  isAnnotationView: boolean,
  datasource: any,
  onChange: any
): CHQuery => {
  const initializedQuery = {
    ...query,
    format: query.format || DEFAULT_FORMAT,
    extrapolate: query.extrapolate ?? true,
    skip_comments: query.skip_comments ?? true,
    add_metadata: query.add_metadata ?? true,
    useWindowFuncForMacros: query.useWindowFuncForMacros ?? true,
    dateTimeType: query.dateTimeType,
    round: query.round || DEFAULT_ROUND,
    intervalFactor: query.intervalFactor || DEFAULT_INTERVAL_FACTOR,
    interval: query.interval || '',
    adHocFilters: query.adHocFilters || [],
    query: query.query || defaultQuery,
    formattedQuery: query.formattedQuery || query.query,
    editorMode: query.database && query.table ? EditorMode.SQL : EditorMode.Builder,
    contextWindowSize: query.contextWindowSize || '10',
    adHocValuesQuery: query.adHocValuesQuery || '',
  };

  if (datasource.defaultValues && !query.initialized) {
    if (datasource.defaultValues.defaultDateTimeType && !initializedQuery.dateTimeType) {
      initializedQuery.dateTimeType = datasource.defaultValues.defaultDateTimeType;
    }

    if (
      datasource.defaultValues.dateTime.defaultDateTime &&
      initializedQuery.dateTimeType === TimestampFormat.DateTime &&
      !initializedQuery.dateTimeColDataType
    ) {
      initializedQuery.dateTimeColDataType = datasource.defaultValues.dateTime.defaultDateTime;
    }

    if (
      datasource.defaultValues.dateTime.defaultDateTime64 &&
      initializedQuery.dateTimeType === TimestampFormat.DateTime64 &&
      !initializedQuery.dateTimeColDataType
    ) {
      initializedQuery.dateTimeColDataType = datasource.defaultValues.dateTime.defaultDateTime64;
    }

    if (datasource.defaultValues.dateTime.defaultDateDate32 && !initializedQuery.dateColDataType) {
      initializedQuery.dateColDataType = datasource.defaultValues.dateTime.defaultDateDate32;
    }

    if (
      datasource.defaultValues.dateTime.defaultUint32 &&
      initializedQuery.dateTimeType === TimestampFormat.TimeStamp &&
      !initializedQuery.dateTimeColDataType
    ) {
      initializedQuery.dateTimeColDataType = datasource.defaultValues.dateTime.defaultUint32;
    }

    if (
      datasource.defaultValues.dateTime.defaultFloat &&
      initializedQuery.dateTimeType === TimestampFormat.Float &&
      !initializedQuery.dateTimeColDataType
    ) {
      initializedQuery.dateTimeColDataType = datasource.defaultValues.dateTime.defaultFloat;
    }

    if (
      datasource.defaultValues.dateTime.defaultTimeStamp64_3 &&
      initializedQuery.dateTimeType === TimestampFormat.TimeStamp64_3 &&
      !initializedQuery.dateTimeColDataType
    ) {
      initializedQuery.dateTimeColDataType = datasource.defaultValues.dateTime.defaultTimeStamp64_3;
    }

    if (
      datasource.defaultValues.dateTime.defaultTimeStamp64_6 &&
      initializedQuery.dateTimeType === TimestampFormat.TimeStamp64_6 &&
      !initializedQuery.dateTimeColDataType
    ) {
      initializedQuery.dateTimeColDataType = datasource.defaultValues.dateTime.defaultTimeStamp64_6;
    }

    if (
      datasource.defaultValues.dateTime.defaultTimeStamp64_9 &&
      initializedQuery.dateTimeType === TimestampFormat.TimeStamp64_9 &&
      !initializedQuery.dateTimeColDataType
    ) {
      initializedQuery.dateTimeColDataType = datasource.defaultValues.dateTime.defaultTimeStamp64_9;
    }

    if (datasource.defaultValues.contextWindowSize && !query.contextWindowSize) {
      initializedQuery.contextWindowSize = datasource.defaultValues.contextWindowSize;
    }

    onChange({ ...query, ...initializedQuery, initialized: true });
  }

  if (isAnnotationView) {
    initializedQuery.format = 'ANNOTATION';
  }

  return initializedQuery;
};
