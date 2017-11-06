export default class SqlSeries {
    series: any;
    meta: any;
    tillNow: any;
    from: any;
    to: any;
    /** @ngInject */
    constructor(options: any);
    getTimeSeries(): any[];
    extrapolate(datapoints: any): any;
    _formatValue(value: any): number;
}
