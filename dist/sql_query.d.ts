/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
export interface RawTimeRange {
    from: any | string;
    to: any | string;
}
export interface TimeRange {
    from: any;
    to: any;
    raw: RawTimeRange;
}
export default class SqlQuery {
    target: any;
    templateSrv: any;
    options: any;
    /** @ngInject */
    constructor(target: any, templateSrv?: any, options?: any);
    replace(options: any, adhocFilters: any): any;
    static replaceTimeFilters(query: string, range: TimeRange, dateTimeType?: string, round?: number): string;
    static getFilterSqlForDateTime(isToNow: boolean, dateTimeType: string): string;
    static getConvertFn(dateTimeType: string): (t: string) => string;
    static target(from: string, target: any): [string, string];
    static applyMacros(query: string, ast: any): string;
    static contain(obj: any, field: string): boolean;
    static _parseMacros(macros: string, query: string): string;
    static columns(query: string, ast: any): string;
    static _columns(key: string, value: string, fromQuery: string): string;
    static rateColumns(query: string, ast: any): string;
    static _fromIndex(query: string): number;
    static rate(query: string, ast: any): string;
    static _rate(args: any, fromQuery: string): string;
    static perSecondColumns(query: string, ast: any): string;
    static perSecond(query: string, ast: any): string;
    static _perSecond(args: any, fromQuery: string): string;
    static _applyTimeFilter(query: string): string;
    static getTimeSeries(dateTimeType: string): string;
    static getDateFilter(isToNow: boolean): string;
    static getDateTimeFilter(isToNow: boolean, dateTimeType: string): string;
    static convertTimestamp(date: any): number;
    static round(date: any, round: number): any;
    static convertInterval(interval: any, intervalFactor: number): number;
    static interpolateQueryExpr(value: any, variable: any, defaultFormatFn: any): any;
    static clickhouseOperator(value: any): any;
    static clickhouseEscape(value: any, variable: any): any;
    static unescape(query: any): any;
    static betweenBraces(query: any): any;
}
