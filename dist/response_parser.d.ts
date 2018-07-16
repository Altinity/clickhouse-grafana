/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
export default class ResponseParser {
    parse(query: string, results: any): any[];
    static findColIndex(columns: string[], colName: string): number;
}
