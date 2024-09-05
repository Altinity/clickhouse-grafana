// @ts-nocheck
import SqlSeries from "../../datasource/sql_series";
import {logger} from '@grafana/ts-backend';

const FieldType = {
  time: 'time',
  number: 'number',
  string: 'string',
  boolean: 'boolean'
};

class ArrayVector {
  constructor(array) {
    this.array = array;
  }
}

function determineFieldType(type) {
  switch (type) {
    case 'UInt64':
    case 'Int64':
    case 'UInt32':
    case 'Int32':
    case 'Float64':
    case 'Float32':
      return FieldType.number;
    case 'String':
      return FieldType.string;
    case 'Boolean':
      return FieldType.boolean;
    case 'Time':
      return FieldType.time;
    default:
      return FieldType.string;
  }
};

export const transformData = (inputData: any, refId: string): any => {
  const meta = inputData.meta;
  const data = inputData.data;

  logger.info("transformData inputData", meta)

  const fields = meta.map((metaField, index) => {
    const fieldName = metaField.name;
    let fieldType = SqlSeries._toFieldType(metaField.type);

    logger.info('-------', fieldType, fieldName)
    const values = data.map(entry => {
      if (fieldName === 'time' || fieldName === 't') {
        return new Date(Number(entry[metaField.name]));
      }

      if (index === 0 && metaField.type === 'UInt64') {
        fieldType = FieldType.time;
      }

      switch (fieldType) {
        case FieldType.number:
          return Number(entry[fieldName]);
        case FieldType.time:
          return new Date(Number(entry[fieldName]));
        case FieldType.boolean:
          return entry[fieldName].toLowerCase() === 'true';
        default:
          return entry[fieldName];
      }
    });

    return {
      name: fieldName,
      config: {},
      type: fieldType,
      values: values,
    };
  });

  return {
    fields: fields,
    refId: refId,
    length: data.length
  };
};
