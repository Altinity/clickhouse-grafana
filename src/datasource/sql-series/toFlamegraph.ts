import { Field } from './sql_series';
import { DataLink } from '@grafana/data';
import { LinkBuilderFactory, FlamegraphLinkBuilder, FlamegraphLinkContext } from '../datalinks';
import { DataLinksConfig } from '../../types/types';

interface FlamegraphData {
  label: string;
  level: number;
  value: string;
  self: number;
}

export const toFlamegraph = (inputSeries, dataLinksConfig?: DataLinksConfig): any => {
  // interface Field {
  //   name: string;
  //   type: string;
  //   values: Array<string | number>;
  //   config: {};
  // }

  try {
    const series: FlamegraphData[] = inputSeries;
    return transformTraceData(series, dataLinksConfig);
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

  function transformTraceData(inputData: FlamegraphData[], config?: DataLinksConfig): any {
    // Initialize link builder if config is provided
    const linkBuilder = config
      ? LinkBuilderFactory.getBuilder<FlamegraphLinkContext>('flamegraph', config)
      : null;

    const sortedData = inputData.filter((item) => {
      return !(Number(item.level) === 0);
    });

    const fields: { [key: string]: Field } = {
      label: { name: 'label', type: 'string', values: ['all'], config: { links: [] } },
      level: { name: 'level', type: 'number', values: [0], config: {} },
      value: { name: 'value', type: 'number', values: [0], config: {} },
      self: { name: 'self', type: 'number', values: [0], config: {} },
    };

    fields.value.values[0] = inputData
      .filter((item) => Number(item.level) === 1)
      .reduce((acc, item) => {
        return acc + Number(item.value);
      }, 0);

    // Build data links for each flamegraph node
    const labelFieldLinks: DataLink[] = [];

    sortedData.forEach((item) => {
      fields.label.values.push(item.label);
      fields.level.values.push(Number(item.level));
      fields.value.values.push(Number(item.value));
      fields.self.values.push(item.self);

      // Build links for this node
      if (linkBuilder) {
        const context = FlamegraphLinkBuilder.createContext(item);
        const links = linkBuilder.buildLinks(context);
        labelFieldLinks.push(...links);
      }
    });

    // Attach links to label field
    if (labelFieldLinks.length > 0) {
      fields.label.config.links = labelFieldLinks;
    }

    return [
      {
        fields: Object.values(fields),
        length: inputData.length,
      },
    ];
  }
};
