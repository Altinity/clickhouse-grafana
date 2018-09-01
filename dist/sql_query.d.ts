/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
export default class SqlQuery {
    target: any;
    templateSrv: any;
    options: any;
    /** @ngInject */
    constructor(target: any, templateSrv?: any, options?: any);
    replace(options: any, adhocFilters: any): any;
    static columns(query: string): string;
    static _columns(key: string, value: string, fromQuery: string): string;
    static rateColumns(query: string): string;
    static rate(query: string, ast: any): string;
    static _fromIndex(query: string): number;
    static _rate(args: any, fromQuery: string): string;
    static _applyTimeFilter(query: string): string;
    static getTimeSeries(dateTimeType: string): string;
    static getTimeFilter(isToNow: boolean, dateTimeType: string): string;
    static convertTimestamp(date: any): number;
    static round(date: any, round: number): any;
    static convertInterval(interval: any, intervalFactor: number): number;
    static interpolateQueryExpr(value: any, variable: any, defaultFormatFn: any): any;
    static clickhouseOperator(value: any): any;
    static clickhouseEscape(value: any, variable: any): any;
    static unescape(query: any): any;
}
