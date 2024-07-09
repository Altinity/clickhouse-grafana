// @ts-nocheck
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

export const transformData = (inputData: { meta: any; data: any; }) => {
  const meta = inputData.meta;
  const data = inputData.data;

  const fields = meta.map((metaField, index) => {
    const fieldName = metaField.name;
    const fieldType = determineFieldType(metaField.type);

    const values = data.map(entry => {
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
      values: values
    };
  });

  const transformedData = {
    fields: fields,
    length: data.length
  };

  return transformedData
};
