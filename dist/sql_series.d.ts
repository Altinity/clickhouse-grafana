export default class SqlSeries {
    series: any;
    keys: any;
    meta: any;
    tillNow: any;
    from: any;
    to: any;
    /** @ngInject */
    constructor(options: any);
    toTable(): any;
    toTimeSeries(): any;
    extrapolate(datapoints: any): any;
    static _pushDatapoint(metrics: any, timestamp: number, key: string, value: number): void;
    static _toJSType(type: any): string;
    static _formatValue(value: any): any;
}
