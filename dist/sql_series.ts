import _ from 'lodash';

export default class SqlSeries {
    series: any;
    keys: any;
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
        this.keys = options.keys;
    }

    toTable():any {
        let self = this, data = [];
        if (this.series.length === 0) {
            return data;
        }

        let columns = [];
        _.each(self.meta, function(col) {
            columns.push({"text": col.name, "type": SqlSeries._toJSType(col.type)})
        });

        let rows = [];
        _.each(self.series, function (ser) {
            let r = [];
            _.each(ser, function (v) {
                r.push(SqlSeries._formatValue(v))
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
        let self = this, timeSeries = [];
        if (self.series.length === 0) {
            return timeSeries;
        }

        // timeCol have to be the first column always
        let timeCol = self.meta[0], metrics = {}, intervals = [], t;
        let keyColumns = self.keys.filter(name => name != timeCol.name);
        _.each(self.series, function(series) {
            t = SqlSeries._formatValue(series[timeCol.name]);
            intervals.push(t);
            // rm time value from series
            delete series[timeCol.name];
            /* Build composite key (categories) from GROUP BY */
            let metricKey = null;
            if (keyColumns.length > 0) {
                metricKey = keyColumns.map(name => series[name]).join(', ');
                keyColumns.forEach(name => {
                    delete series[name];
                });
            }

            _.each(series, function(val, key) {
                /* If composite key is specified, e.g. 'category1',
                 * use it instead of the metric name, e.g. count()
                 */
                if (metricKey) {
                    key = metricKey;
                }
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
            let datapoints = [];
            _.each(intervals, function(interval) {
                if (metrics[k][interval] === undefined) {
                    metrics[k][interval] = null;
                }
                datapoints.push([SqlSeries._formatValue(metrics[k][interval]), interval]);
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
        let durationToStart = datapoints[0][1]/1000 - this.from,
            durationToEnd = this.to - datapoints[datapoints.length-1][1]/1000;

        // If the first/last samples are close to the boundaries of the range,
        // extrapolate the result.
        let sampledInterval = (datapoints[datapoints.length-1][1] - datapoints[0][1])/1000,
            averageDurationBetweenSamples = sampledInterval / (datapoints.length-1);

        let diff;
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

    static _formatValue(value:any) {
        if (value === null) {
            return value
        }

        let numeric = Number(value);
        if (isNaN(numeric)) {
            return value
        } else {
            return numeric
        }
    };
}