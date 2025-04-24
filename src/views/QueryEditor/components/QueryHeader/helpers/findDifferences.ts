import { CHQuery, TimestampFormat } from '../../../../../types/types';
import { CHDataSource } from '../../../../../datasource/datasource';

export function findDifferences(query: CHQuery, datasource: CHDataSource) {
  const { defaultValues } = datasource;

  const differences: any[] = [];

  function checkValue(value) {
    if (value === undefined || value.trim() === '') {
      return 'EMPTY';
    } else {
      return value.trim();
    }
  }

  if (defaultValues) {
    if (query.dateTimeType !== defaultValues.defaultDateTimeType) {
      differences.push({
        key: 'Timestamp type Column',
        original: checkValue(query.dateTimeType),
        updated: defaultValues.defaultDateTimeType,
        fieldName: 'dateTimeType',
      });
    }

    if (
      defaultValues.defaultDateTimeType === 'TIMESTAMP' &&
      defaultValues.dateTime.defaultUint32 &&
      query.dateTimeColDataType !== defaultValues.dateTime.defaultUint32
    ) {
      differences.push({
        key: 'Timestamp Column',
        original: checkValue(query.dateTimeColDataType),
        updated: defaultValues.dateTime.defaultUint32,
        fieldName: 'dateTimeColDataType',
      });
    }

    if (
      defaultValues.defaultDateTimeType === TimestampFormat.DateTime64 &&
      defaultValues.dateTime.defaultDateTime64 &&
      query.dateTimeColDataType !== defaultValues.dateTime.defaultDateTime64
    ) {
      differences.push({
        key: 'Timestamp Column',
        original: checkValue(query.dateTimeColDataType),
        updated: defaultValues.dateTime.defaultDateTime64,
        fieldName: 'dateTimeColDataType',
      });
    }

    if (
      defaultValues.defaultDateTimeType === TimestampFormat.DateTime &&
      defaultValues.dateTime.defaultDateTime &&
      query.dateTimeColDataType !== defaultValues.dateTime.defaultDateTime
    ) {
      differences.push({
        key: 'Timestamp Column',
        original: checkValue(query.dateTimeColDataType),
        updated: defaultValues.dateTime.defaultDateTime,
        fieldName: 'dateTimeColDataType',
      });
    }

    if (
      defaultValues.dateTime.defaultDateDate32 &&
      query.dateColDataType !== defaultValues.dateTime.defaultDateDate32
    ) {
      differences.push({
        key: 'Date column',
        original: checkValue(query.dateColDataType),
        updated: defaultValues.dateTime.defaultDateDate32,
        fieldName: 'dateColDataType',
      });
    }

    if (query.contextWindowSize !== defaultValues.contextWindowSize) {
      differences.push({
        key: 'Logs context window size',
        original: checkValue(query.contextWindowSize),
        updated: defaultValues.contextWindowSize,
        fieldName: 'contextWindowSize',
      });
    }
    if (query.useWindowFuncForMacros !== defaultValues.useWindowFuncForMacros) {
      differences.push({
        key: 'Use window functions for macros',
        original: query.useWindowFuncForMacros?.toString() || 'true',
        updated: defaultValues.useWindowFuncForMacros?.toString() || 'false',
        fieldName: 'useWindowFuncForMacros',
      });
    }
    if (query.nullifySparse !== defaultValues.nullifySparse) {
      differences.push({
        key: 'Nullify sparse categories',
        original: query.nullifySparse?.toString() || 'false',
        updated: defaultValues.nullifySparse?.toString() || 'false',
        fieldName: 'nullifySparse',
      });
    }
  }

  return differences;
}
