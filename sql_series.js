define([
  'lodash'
],
function (_) {
  'use strict';

  function SqlSeries(options) {
    this.series = options.series;
    this.meta = options.meta;
    this.tillNow = options.tillNow;
    this.from = options.from;
    this.to = options.to;
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
    _.each(metrics, function(v, k) {
        var datapoints = [];
        _.each(intervals, function(interval) {
            if (metrics[k][interval] === undefined || metrics[k][interval] === null) {
              metrics[k][interval] = 0;
            }
            datapoints.push([self._formatValue(metrics[k][interval]), interval]);
          });
        timeSeries.push({target: k, datapoints: self.extrapolate(datapoints)});
      });

    return timeSeries;
  };

  p.extrapolate = function(datapoints) {
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
