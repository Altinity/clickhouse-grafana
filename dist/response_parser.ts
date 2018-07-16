///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import _ from 'lodash';

export default class ResponseParser {
  parse(query: string, results: any) : any[] {
    if (!results || results.data.length === 0) {
      return [];
    }

    const res = [];
    const sqlResults = results.data;

    const keys = Object.keys(sqlResults[0]);
    const textColIndex = ResponseParser.findColIndex(keys, '__text');
    const valueColIndex = ResponseParser.findColIndex(keys, '__value');
    const keyValuePairs = keys.length === 2 && textColIndex !== -1 && valueColIndex !== -1;

    let r;
    for (r of sqlResults) {
        if (!_.isObject(r)) {
            res.push({ text: r });
            return
        }

        if (keys.length > 1) {
          if (keyValuePairs) {
            res.push({ text: r[keys[textColIndex]], value: r[keys[valueColIndex]]});
          } else {
            res.push(r);
          }
        } else {
            res.push({ text: r[keys[0]]});
        }
    }

    return res
  }

  static findColIndex(columns: string[], colName: string) : number {
    for (let i = 0; i < columns.length; i++) {
      if (columns[i] === colName) {
        return i;
      }
    }

    return -1;
  }
}
