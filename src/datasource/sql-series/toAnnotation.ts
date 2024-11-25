import { Field } from './sql_series';

export const toAnnotation = (input: any): any[] => {
  let series: any[] = input;

  function transformAnnotationData(inputData: any): any[] {
    const fields: { [key: string]: Field } = {
      time: { name: 'time', type: 'number', values: [], config: {} },
      timeEnd: { name: 'timeEnd', type: 'number', values: [], config: {} },
      title: { name: 'title', type: 'string', values: [], config: {} },
      text: { name: 'text', type: 'string', values: [], config: {} },
      tags: { name: 'tags', type: 'array', values: [], config: {} },
    };

    inputData.forEach((annotation) => {
      fields.time.values.push(parseInt(annotation.time, 10));
      fields.timeEnd.values.push(parseInt(annotation.time_end, 10));
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
