System.register(['lodash'], function(exports_1) {
    var lodash_1;
    var SqlSeries;
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            }],
        execute: function() {
            SqlSeries = (function () {
                /** @ngInject */
                function SqlSeries(options) {
                    this.series = options.series;
                    this.meta = options.meta;
                    this.tillNow = options.tillNow;
                    this.from = options.from;
                    this.to = options.to;
                }
                SqlSeries.prototype.toTable = function () {
                    var self = this, data = [];
                    if (this.series.length === 0) {
                        return data;
                    }
                    var columns = [];
                    lodash_1.default.each(self.meta, function (col) {
                        columns.push({ "text": col.name, "type": self._toJSType(col.type) });
                    });
                    var rows = [];
                    lodash_1.default.each(self.series, function (ser) {
                        var r = [];
                        lodash_1.default.each(ser, function (v) {
                            r.push(v);
                        });
                        rows.push(r);
                    });
                    data.push({
                        "columns": columns,
                        "rows": rows,
                        "type": "table"
                    });
                    return data;
                };
                SqlSeries.prototype.toTimeSeries = function () {
                    var self = this, timeSeries = [];
                    if (self.series.length === 0) {
                        return timeSeries;
                    }
                    // timeCol have to be the first column always
                    var timeCol = self.meta[0], metrics = {}, intervals = [], t;
                    lodash_1.default.each(self.series, function (series) {
                        t = self._formatValue(series[timeCol.name]);
                        intervals.push(t);
                        // rm time value from series
                        delete series[timeCol.name];
                        lodash_1.default.each(series, function (val, key) {
                            if (lodash_1.default.isArray(val)) {
                                lodash_1.default.each(val, function (arr) {
                                    (metrics[arr[0]] = metrics[arr[0]] || {})[t] = arr[1];
                                });
                            }
                            else {
                                (metrics[key] = metrics[key] || {})[t] = val;
                            }
                        });
                    });
                    lodash_1.default.each(metrics, function (v, k) {
                        var datapoints = [];
                        lodash_1.default.each(intervals, function (interval) {
                            if (metrics[k][interval] === undefined || metrics[k][interval] === null) {
                                metrics[k][interval] = 0;
                            }
                            datapoints.push([self._formatValue(metrics[k][interval]), interval]);
                        });
                        timeSeries.push({ target: k, datapoints: self.extrapolate(datapoints) });
                    });
                    return timeSeries;
                };
                ;
                SqlSeries.prototype.extrapolate = function (datapoints) {
                    if (datapoints.length < 10 || (!this.tillNow && datapoints[0][0] !== 0)) {
                        return datapoints;
                    }
                    // Duration between first/last samples and boundary of range.
                    var durationToStart = datapoints[0][1] / 1000 - this.from, durationToEnd = this.to - datapoints[datapoints.length - 1][1] / 1000;
                    // If the first/last samples are close to the boundaries of the range,
                    // extrapolate the result.
                    var sampledInterval = (datapoints[datapoints.length - 1][1] - datapoints[0][1]) / 1000, averageDurationBetweenSamples = sampledInterval / (datapoints.length - 1);
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
                        diff = ((datapoints[datapoints.length - 2][0] - datapoints[datapoints.length - 3][0]) / datapoints[datapoints.length - 2][0]) * 0.1;
                        diff %= 1;
                        if (isNaN(diff)) {
                            diff = 0;
                        }
                        datapoints[datapoints.length - 1][0] = datapoints[datapoints.length - 2][0] * (1 + diff);
                    }
                    return datapoints;
                };
                ;
                SqlSeries.prototype._toJSType = function (type) {
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
                            return "string";
                    }
                };
                SqlSeries.prototype._formatValue = function (value) {
                    var numeric = Number(value);
                    if (isNaN(numeric)) {
                        return value;
                    }
                    else {
                        return numeric;
                    }
                };
                ;
                return SqlSeries;
            })();
            exports_1("default", SqlSeries);
        }
    }
});
//# sourceMappingURL=sql_series.js.map