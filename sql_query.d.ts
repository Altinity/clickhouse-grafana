/// <reference path="../../../../../public/app/headers/common.d.ts" />
export default class SqlQuery {
    target: any;
    selectModels: any[];
    queryBuilder: any;
    templateSrv: any;
    options: any;
    /** @ngInject */
    constructor(target: any, templateSrv?: any, options?: any);
    updateProjection(): void;
    updatePersistedParts(): void;
    removeSelect(index: number): void;
    removeSelectPart(selectParts: any, part: any): void;
    addSelectPart(selectParts: any, type: any): void;
    private static renderTagCondition(tag, index);
    getTableAndDatabase(): any;
    render(rebuild: boolean): any;
    replace(options?: any): any;
    static columns(query: string): string;
    static _columns(key: string, value: string, fromQuery: string): string;
    static rateColumns(query: string): string;
    static rate(query: string): string;
    static _fromIndex(query: string): number;
    static _rate(args: any, fromQuery: string): string;
    static _applyTimeFilter(query: string): string;
    static getTimeFilter(isToNow: any): string;
    static convertTimestamp(date: any): number;
    static convertInterval(interval: number): number;
    static REGEX_COLUMNS: RegExp;
    static interpolateQueryExpr(value: any, variable: any, defaultFormatFn: any): any;
    static clickhouseEscape(value: any): any;
}
