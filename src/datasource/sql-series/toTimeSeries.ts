import { each, isArray } from 'lodash';
import { _toFieldType, convertTimezonedDateToUTC } from './sql_series';
import { FieldType } from '@grafana/data';

const _formatValue = (value: any) => {
  if (value === null) {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  let numeric = Number(value);
  if (isNaN(numeric)) {
    return value;
  } else {
    return numeric;
  }
};

const extrapolateDataPoints = (datapoints: any, self) => {
  if (datapoints.length < 10 || (!self.tillNow && datapoints[0][0] !== 0)) {
    return datapoints;
  }

  // Duration between first/last samples and boundary of range.
  const durationToStart = datapoints[0][1] / 1000 - self.from;
  const durationToEnd = self.to - datapoints[datapoints.length - 1][1] / 1000;

  // If the first/last samples are close to the boundaries of the range,
  // extrapolate the result.
  const sampledInterval = (datapoints[datapoints.length - 1][1] - datapoints[0][1]) / 1000;
  const averageDurationBetweenSamples = sampledInterval / (datapoints.length - 1);

  let diff;
  // close to left border and value is 0 because of runningDifference function
  if (durationToStart < averageDurationBetweenSamples && datapoints[0][0] === 0) {
    diff = ((datapoints[1][0] - datapoints[2][0]) / datapoints[1][0]) * 0.1;
    diff %= 1;

    if (isNaN(diff)) {
      diff = 0;
    }

    const newDatapointValue = datapoints[1][0] * (1 + diff);
    if (!isNaN(newDatapointValue)) {
      datapoints[0][0] = newDatapointValue;
    }
  }

  if (durationToEnd < averageDurationBetweenSamples) {
    let l = datapoints.length;
    diff = ((datapoints[l - 2][0] - datapoints[l - 3][0]) / datapoints[l - 2][0]) * 0.1;
    diff %= 1;

    if (isNaN(diff)) {
      diff = 0;
    }

    const newDatapointValue = datapoints[l - 2][0] * (1 + diff);

    if (!isNaN(newDatapointValue)) {
      datapoints[l - 1][0] = newDatapointValue;
    }
  }

  return datapoints;
};

const _pushDatapoint = (metrics: any, timestamp: number, key: string, value: number, nullifySparse: boolean) => {
  if (!metrics[key]) {
    metrics[key] = [];

    /* Fill null values for each new series only if nullifySparse is true */
    if (nullifySparse) {
      for (let seriesName in metrics) {
        metrics[seriesName].forEach((v: any) => {
          if (v[1] < timestamp) {
            metrics[key].push([null, v[1]]);
          }
        });
        break;
      }
    }
  }

  metrics[key].push([_formatValue(value), timestamp]);
};

export const toTimeSeries = (extrapolate = true, nullifySparse = false, self): any => {
  let timeSeries: any[] = [];
  if (self.series.length === 0) {
    return timeSeries;
  }

  let metrics: { [key: string]: any[] } = {};
  // timeCol have to be the first column always
  let timeCol = self.meta[0];
  let timeColType = _toFieldType(timeCol.type || '');
  let lastTimeStamp = self.series[0][timeCol.name];
  let keyColumns = self.keys.filter((name: string) => {
    return name !== timeCol.name;
  });
  each(self.series, function (row) {
    let t = _formatValue(row[timeCol.name]);
    /* Build composite key (categories) from GROUP BY */
    let metricKey: any = null;

    if (keyColumns.length > 0) {
      metricKey = keyColumns
        .map((name: string) => {
          const value = row[name];

          if (typeof value === 'undefined') {
            return undefined;
          }

          if (typeof value === 'object') {
            return JSON.stringify(value);
          } else {
            return String(value);
          }
        })
        .join(', ');
    }

    /* Make sure all series end with a value or nil for current timestamp
     * to render discontinuous timeseries properly. */
    if (lastTimeStamp < t) {
      if (nullifySparse) {
        each(metrics, function (dataPoints, seriesName) {
          if (dataPoints[dataPoints.length - 1][1] < lastTimeStamp) {
            dataPoints.push([null, lastTimeStamp]);
          }
        });
      }
      lastTimeStamp = t;
    }
    /* For each metric-value pair in row, construct a datapoint */
    each(row, function (val, key) {
      /* Skip timestamp and GROUP BY keys */
      if ((self.keys.length === 0 && timeCol.name === key) || self.keys.indexOf(key) >= 0) {
        return;
      }
      /* If composite key is specified, e.g. 'category1',
       * use it instead of the metric name, e.g. count() */
      if (metricKey) {
        key = metricKey;
      }
      if (timeColType?.fieldType === FieldType.time) {
        t = convertTimezonedDateToUTC(t, timeColType.timezone);
      }

      if (isArray(val)) {
        /* Expand groupArray into multiple timeseries */
        each(val, function (arr) {
          _pushDatapoint(metrics, t, arr[0], arr[1], nullifySparse);
        });
      } else {
        _pushDatapoint(metrics, t, key, val, nullifySparse);
      }
    });
  });

  each(metrics, function (dataPoints, seriesName) {
    const processedDataPoints = (extrapolate ? extrapolateDataPoints(dataPoints, self) : dataPoints).filter(item => (typeof item[0] === 'number' || item[0] === null) && item[1]);

    timeSeries.push({
      length: processedDataPoints.length,
      fields: [
        { config: { links: []}, name: 'time', type: 'time', values: processedDataPoints.map((v: any) => v[1])},
        { config: { links: []}, name: seriesName, values: processedDataPoints.map((v: any) => v[0])},
      ],
      refId: seriesName && self.refId ? `${self.refId} - ${seriesName}` : undefined
    })
  });

  return timeSeries;
};
