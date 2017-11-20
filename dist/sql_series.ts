import _ from 'lodash';

export default class SqlSeries {
    series: any;
    meta: any;
    tillNow: any;
    from: any;
    to: any;

    /** @ngInject */
    constructor(options) {
        this.series = options.series;
        this.meta = options.meta;
        this.tillNow = options.tillNow;
        this.from = options.from;
        this.to = options.to;
    }

    toTable():any {
        var self = this, data = [];
        if (this.series.length === 0) {
            return data;
        }

        var columns = [];
        _.each(self.meta, function(col) {
            columns.push({"text": col.name, "type": SqlSeries._toJSType(col.type)})
        });

        var rows = [];
        _.each(self.series, function (ser) {
            var r = [];
            _.each(ser, function (v) {
                r.push(v)
            });
            rows.push(r)
        });

        data.push({
            "columns": columns,
            "rows": rows,
            "type": "table"
        });

        return data
    }

    toTimeSeries():any {
        var self = this, timeSeries = [];
        if (self.series.length === 0) {
            return timeSeries;
        }

        // timeCol have to be the first column always
        var timeCol = self.meta[0], metrics = {}, intervals = [], t;
        _.each(self.series, function(series) {
            t = self._formatValue(series[timeCol.name]);
            intervals.push(t);
            // rm time value from series
            delete series[timeCol.name];
            _.each(series, function(val, key) {
                if (_.isArray(val)) {
                    _.each(val, function(arr) {
                        (metrics[arr[0]] = metrics[arr[0]] || {})[t] = arr[1];
                    });
                } else {
                    (metrics[key] = metrics[key] || {})[t] = val;
                }
            });
        });

        _.each(metrics, function(v, k) {
            var datapoints = [];
            _.each(intervals, function(interval) {
                if (metrics[k][interval] === undefined) {
                    metrics[k][interval] = null;
                }
                datapoints.push([self._formatValue(metrics[k][interval]), interval]);
            });
            timeSeries.push({target: k, datapoints: self.extrapolate(datapoints)});
        });
        return timeSeries;
    };

    extrapolate(datapoints) {
        if (datapoints.length < 10 || (!this.tillNow && datapoints[0][0] !== 0)) {
            return datapoints;
        }

        // Duration between first/last samples and boundary of range.
        var durationToStart = datapoints[0][1]/1000 - this.from,
            durationToEnd = this.to - datapoints[datapoints.length-1][1]/1000;

        // If the first/last samples are close to the boundaries of the range,
        // extrapolate the result.
        var sampledInterval = (datapoints[datapoints.length-1][1] - datapoints[0][1])/1000,
            averageDurationBetweenSamples = sampledInterval / (datapoints.length-1);

        var diff;
        // close to left border and value is 0 because of runningDifference function
        if (durationToStart < averageDurationBetweenSamples && datapoints[0][0] === 0) {
            diff = ((datapoints[1][0] - datapoints[2][0]) / datapoints[1][0]) * 0.1;
            diff %= 1;
            if (isNaN(diff)) {
                diff = 0;
            }
            datapoints[0][0] = datapoints[1][0] * (1 + diff);
        }

        if (durationToEnd < averageDurationBetweenSamples) {
            diff = ((datapoints[datapoints.length-2][0] - datapoints[datapoints.length-3][0]) / datapoints[datapoints.length-2][0]) * 0.1;
            diff %= 1;
            if (isNaN(diff)) {
                diff = 0;
            }
            datapoints[datapoints.length-1][0] = datapoints[datapoints.length-2][0] * (1 + diff);
        }

        return datapoints;
    };

    static _toJSType(type:any):string {
        switch (type) {
            case 'UInt8':
            case 'UInt16':
            case 'UInt32':
            case 'UInt64':
            case 'Int8':
            case 'Int16':
            case 'Int32':
            case 'Int64':
                return "number";
            default:
                return "string"
        }
    }

    _formatValue(value:any) {
        if (value === null) {
            return value
        }

        var numeric = Number(value);
        if (isNaN(numeric)) {
            return value
        } else {
            return numeric
        }
    };
}