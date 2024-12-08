import { Field } from './sql_series';

interface FlamegraphData {
  label: string;
  level: number;
  value: string;
  self: number;
}

export const toFlamegraph = (inputSeries): any => {
  // interface Field {
  //   name: string;
  //   type: string;
  //   values: Array<string | number>;
  //   config: {};
  // }

  try {
    const series: FlamegraphData[] = inputSeries;
    return transformTraceData(series);
  } catch (error: any) {
    return [
      {
        fields: [
          {
            name: 'error',
            type: 'string',
            values: [error?.message],
            config: {},
          },
        ],
        length: 1,
      },
    ];
  }

  function transformTraceData(inputData: FlamegraphData[]): any {
    const sortedData = inputData.filter((item) => {
      return !(Number(item.level) === 0);
    });

    const fields: { [key: string]: Field } = {
      label: { name: 'label', type: 'string', values: ['all'], config: {} },
      level: { name: 'level', type: 'number', values: [0], config: {} },
      value: { name: 'value', type: 'number', values: [0], config: {} },
      self: { name: 'self', type: 'number', values: [0], config: {} },
    };

    fields.value.values[0] = inputData
      .filter((item) => Number(item.level) === 1)
      .reduce((acc, item) => {
        return acc + Number(item.value);
      }, 0);

    sortedData.forEach((item) => {
      fields.label.values.push(item.label);
      fields.level.values.push(Number(item.level));
      fields.value.values.push(Number(item.value));
      fields.self.values.push(item.self);
    });

    return [
      {
        fields: Object.values(fields),
        length: inputData.length,
      },
    ];
  }
};
