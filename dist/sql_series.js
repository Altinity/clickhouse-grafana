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
                    this.keys = options.keys || [];
                }
                SqlSeries.prototype.toTable = function () {
                    var self = this, data = [];
                    if (this.series.length === 0) {
                        return data;
                    }
                    var columns = [];
                    lodash_1.default.each(self.meta, function (col) {
                        columns.push({ "text": col.name, "type": SqlSeries._toJSType(col.type) });
                    });
                    var rows = [];
                    lodash_1.default.each(self.series, function (ser) {
                        var r = [];
                        lodash_1.default.each(ser, function (v) {
                            r.push(SqlSeries._formatValue(v));
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
                    var metrics = {};
                    // timeCol have to be the first column always
                    var timeCol = self.meta[0];
                    var lastTimeStamp = self.series[0][timeCol.name];
                    var keyColumns = self.keys.filter(function (name) { return name != timeCol.name; });
                    lodash_1.default.each(self.series, function (row) {
                        var t = SqlSeries._formatValue(row[timeCol.name]);
                        /* Build composite key (categories) from GROUP BY */
                        var metricKey = null;
                        if (keyColumns.length > 0) {
                            metricKey = keyColumns.map(function (name) { return row[name]; }).join(', ');
                        }
                        /* Make sure all series end with a value or nil for current timestamp
                         * to render discontiguous timeseries properly. */
                        if (lastTimeStamp < t) {
                            lodash_1.default.each(metrics, function (datapoints, seriesName) {
                                if (datapoints[datapoints.length - 1][1] < lastTimeStamp) {
                                    datapoints.push([null, lastTimeStamp]);
                                }
                            });
                            lastTimeStamp = t;
                        }
                        /* For each metric-value pair in row, construct a datapoint */
                        lodash_1.default.each(row, function (val, key) {
                            /* Skip timestamp and GROUP BY keys */
                            if ((self.keys.length == 0 && timeCol.name == key) || self.keys.indexOf(key) >= 0) {
                                return;
                            }
                            /* If composite key is specified, e.g. 'category1',
                             * use it instead of the metric name, e.g. count() */
                            if (metricKey) {
                                key = metricKey;
                            }
                            if (lodash_1.default.isArray(val)) {
                                /* Expand groupArray into multiple timeseries */
                                lodash_1.default.each(val, function (arr) {
                                    SqlSeries._pushDatapoint(metrics, t, arr[0], arr[1]);
                                });
                            }
                            else {
                                SqlSeries._pushDatapoint(metrics, t, key, val);
                            }
                        });
                    });
                    lodash_1.default.each(metrics, function (datapoints, seriesName) {
                        timeSeries.push({ target: seriesName, datapoints: self.extrapolate(datapoints) });
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
                SqlSeries._pushDatapoint = function (metrics, timestamp, key, value) {
                    if (!metrics[key]) {
                        metrics[key] = [];
                        /* Fill null values for each new series */
                        for (var seriesName in metrics) {
                            metrics[seriesName].forEach(function (v) {
                                if (v[1] < timestamp) {
                                    metrics[key].push([null, v[1]]);
                                }
                            });
                            break;
                        }
                    }
                    metrics[key].push([SqlSeries._formatValue(value), timestamp]);
                };
                SqlSeries._toJSType = function (type) {
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
                SqlSeries._formatValue = function (value) {
                    if (value === null) {
                        return value;
                    }
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