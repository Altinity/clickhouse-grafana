/// <reference path="../../../../../public/app/headers/common.d.ts" />
export default class SqlQuery {
    target: any;
    queryBuilder: any;
    templateSrv: any;
    options: any;
    /** @ngInject */
    constructor(target: any, templateSrv?: any, options?: any);
    replace(options?: any): any;
    static columns(query: string): string;
    static _columns(key: string, value: string, fromQuery: string): string;
    static rateColumns(query: string): string;
    static rate(query: string, ast: any): string;
    static _fromIndex(query: string): number;
    static _rate(args: any, fromQuery: string): string;
    static _applyTimeFilter(query: string): string;
    static getTimeFilter(isToNow: any): string;
    static convertTimestamp(date: any): number;
    static round(date: any, round: string): any;
    static convertInterval(interval: any, intervalFactor: any): number;
    static interpolateQueryExpr(value: any, variable: any, defaultFormatFn: any): any;
    static clickhouseEscape(value: any, variable: any): any;
}
