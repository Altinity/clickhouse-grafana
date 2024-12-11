import { isObject } from 'lodash';
import { AnnotationEvent } from '@grafana/data';

export default class ResponseParser {
  constructor() {}

  parse(query: string, results: any): any[] {
    if (!results || !results.data || results.data?.length === 0) {
      return [];
    }

    let res: any[] = [];
    let meta: any[];
    let data: Array<{ [key: string]: any }>;
    if (typeof results.meta !== 'undefined') {
      meta = results.meta;
      data = results.data;
    } else {
      meta = results.data.meta;
      data = results.data.data;
    }

    const keys = meta.map((item: any) => {
      return item.name;
    });
    const textColIndex = ResponseParser.findColIndex(keys, '__text');
    const valueColIndex = ResponseParser.findColIndex(keys, '__value');
    const keyValuePairs = keys.length === 2 && textColIndex !== -1 && valueColIndex !== -1;

    data.forEach((result: { [key: string]: any }) => {
      if (!isObject(result)) {
        res.push({ text: result });
        return;
      }

      let keys = Object.keys(result);
      if (keys.length > 1) {
        if (keyValuePairs) {
          const textKey = keys[textColIndex] as keyof typeof result;
          const valueKey = keys[valueColIndex] as keyof typeof result;
          if (textKey in result && valueKey in result) {
            res.push({ text: result[textKey], value: result[valueKey] });
          }
        } else {
          res.push(result);
        }
      } else {
        const textKey = keys[0] as keyof typeof result;
        res.push({ text: result[textKey] });
      }
    });

    return res;
  }

  static findColIndex(columns: string[], colName: string): number {
    for (let i = 0; i < columns.length; i++) {
      if (columns[i] === colName) {
        return i;
      }
    }

    return -1;
  }

  transformAnnotationResponse(options: any, data: any) {
    const rows = data.data;
    const columns = data.meta;
    const result = [];
    let hasTime = false;
    let hasRegion = false;
    let hasType = false;

    console.log(columns)
    for (let i = 0, len = columns.length; i < len; i++) {
      const column = columns[i];

      if (column.name === 'time') {
        hasTime = true;
      }
      if (column.name === 'time_end') {
        hasRegion = true;
      }
      if (column.name === 'type') {
        hasType = true;
      }
    }

    if (!hasTime) {
      throw new Error('Missing mandatory time column in annotation query.');
    }

    for (let i = 0, len = rows.length; i < len; i++) {
      const row = rows[i];
      // @TODO look to https://grafana.com/docs/grafana/latest/packages_api/data/annotationevent/
      // and try implements all possible fields
      const event: AnnotationEvent = {
        annotation: options.annotation,
        time: Math.floor(row.time),
        timeEnd: row.time_end ? Math.floor(row.time_end) : 0,
        isRegion: hasRegion && Math.floor(row.time_end) > 0,
        title: row.title,
        type: hasType && row.type ? row.type : 'annotation',
        text: row.text,
        tags: row.tags ? row.tags.trim().split(/\s*,\s*/) : [],
      };
      // @ts-ignore
      result.push(event);
    }

    return result;
  }
}
