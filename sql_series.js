define([
  'lodash',
  'app/core/table_model'
],
function (_) {
  'use strict';

  function SqlSeries(options) {
    this.series = options.series;
    this.meta = options.meta;
    this.table = options.table;
  }

  var p = SqlSeries.prototype;

  p.getTimeSeries = function() {
    var self = this, timeSeries = [];

    if (self.series.length === 0) {
      return timeSeries;
    }

    // timeCol have to be the first column always
    var timeCol = self.meta[0], metrics = {}, intervals = [], t;
    _.each(self.series, function(serie) {
        t = self._formatValue(serie[timeCol.name]);
        intervals.push(t);

        // rm time value from series
        delete serie[timeCol.name];

        _.each(serie, function(val, key) {
            if (_.isArray(val)) {
              _.each(val, function(arr) {
                  (metrics[arr[0]] = metrics[arr[0]] || {})[t] = arr[1];
                });
            } else {
              (metrics[key] = metrics[key] || {})[t] = val;
            }
          });
      });

    var nullInterval;
    _.each(metrics, function(v, k) {
        var datapoints = [];
        _.each(intervals, function(interval) {
            if (metrics[k][interval] === null) { // avoid zero values in case of runningDifference()
              delete metrics[k][interval];
              nullInterval = interval;
              return;
            }

            if (interval === nullInterval) {
              return;
            }

            if (metrics[k][interval] === undefined) {
              metrics[k][interval] = 0;
            }
            datapoints.push([self._formatValue(metrics[k][interval]), interval]);
          });
        timeSeries.push({target: k, datapoints: datapoints});
      });

    return timeSeries;
  };

  p._formatValue = function(value) {
    var v_numeric = Number(value);

    if (isNaN(value)) {
      return value;
    } else {
      return parseFloat(v_numeric);
    }
  };

  return SqlSeries;
});
