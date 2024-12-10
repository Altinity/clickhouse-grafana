import { Field } from './sql_series';
import { parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const toAnnotation = (input: any, meta: any): any[] => {
  let series: any[] = input;

  function parseTimeBasedOnType(timeStr: string, type: string): number {
    if (type.startsWith('DateTime64')) {
      const match = type.match(/DateTime64\(\d+,\s*'([^']+)'\)/);
      if (match) {
        const timezone = match[1];
        const date = parseISO(timeStr);
        return toZonedTime(date, timezone).getTime();
      }
      return parseISO(timeStr).getTime();
    }
    if (type === 'DateTime' || type === 'DateTime64') {
      return parseISO(timeStr).getTime();
    }

    // Default to timestamp parsing if no other type matches
    return parseInt(timeStr, 10);
  }

  function transformAnnotationData(inputData: any): any[] {
    const fields: { [key: string]: Field } = {
      time: { name: 'time', type: 'number', values: [], config: {} },
      timeEnd: { name: 'timeEnd', type: 'number', values: [], config: {} },
      title: { name: 'title', type: 'string', values: [], config: {} },
      text: { name: 'text', type: 'string', values: [], config: {} },
      tags: { name: 'tags', type: 'array', values: [], config: {} },
    };

    inputData.forEach((annotation) => {
      const timeType = meta.find((m: any) => m.name === 'time')?.type || 'number';
      const timeEndType = meta.find((m: any) => m.name === 'time_end')?.type || 'number';

      fields.time.values.push(parseTimeBasedOnType(annotation.time, timeType));
      fields.timeEnd.values.push(parseTimeBasedOnType(annotation.time_end, timeEndType));
      fields.title.values.push(annotation.title);
      fields.text.values.push(annotation.text);
      fields.tags.values.push(annotation.tags ? annotation.tags.split(',') : []); // Split tags into an array
    });

    return [
      {
        fields: Object.values(fields),
        length: inputData.length, // Using the provided rows count
      },
    ];
  }

  return transformAnnotationData(series);
};
