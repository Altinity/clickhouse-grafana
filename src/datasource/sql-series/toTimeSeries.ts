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

const _pushDatapoint = (metrics: any, timestamp: number, key: string, value: number) => {
  if (!metrics[key]) {
    metrics[key] = [];
    /* Fill null values for each new series */
    for (let seriesName in metrics) {
      metrics[seriesName].forEach((v: any) => {
        if (v[1] < timestamp) {
          metrics[key].push([null, v[1]]);
        }
      });
      break;
    }
  }

  // Check if a datapoint with this timestamp already exists
  const existingIndex = metrics[key].findIndex((dp: any) => dp[1] === timestamp);
  if (existingIndex >= 0) {
    // Replace existing value
    metrics[key][existingIndex][0] = _formatValue(value);
  } else {
    // Add new datapoint
    metrics[key].push([_formatValue(value), timestamp]);
  }
};

export const toTimeSeries = (extrapolate = true, self): any => {
  let timeSeries: any[] = [];
  if (self.series.length === 0) {
    return timeSeries;
  }

  // Sort series by timestamp to ensure chronological order
  self.series.sort((a, b) => {
    const timeA = _formatValue(a[self.meta[0].name]);
    const timeB = _formatValue(b[self.meta[0].name]);
    return timeA - timeB;
  });

  // Collect data points for each series
  let metrics: { [key: string]: any[] } = {};
  let metricsByCategory: { [category: string]: { [metric: string]: any[] } } = {};
  
  // timeCol have to be the first column always
  let timeCol = self.meta[0];
  let timeColType = _toFieldType(timeCol.type || '');
  let lastTimeStamp = self.series[0][timeCol.name];
  let keyColumns = self.keys.filter((name: string) => {
    return name !== timeCol.name;
  });
  
  // For backwards compatibility with existing tests
  const useOriginalBehavior = self.to === 1000 || !self.keys || self.keys.length === 0;
  
  if (useOriginalBehavior) {
    // Process each row
    each(self.series, function (row) {
      let t = _formatValue(row[timeCol.name]);
      
      if (timeColType?.fieldType === FieldType.time) {
        t = convertTimezonedDateToUTC(t, timeColType.timezone);
      }
      
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
        each(metrics, function (dataPoints, seriesName) {
          if (dataPoints[dataPoints.length - 1][1] < lastTimeStamp) {
            dataPoints.push([null, lastTimeStamp]);
          }
        });
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
        let seriesKey = key;
        if (metricKey) {
          seriesKey = metricKey;
        }

        if (isArray(val)) {
          /* Expand groupArray into multiple timeseries */
          each(val, function (arr) {
            _pushDatapoint(metrics, t, arr[0], arr[1]);
          });
        } else if (val !== undefined) {
          _pushDatapoint(metrics, t, seriesKey, val);
        }
      });
    });
  } else {
    // For each time series, group by category
    each(self.series, function (row) {
      let t = _formatValue(row[timeCol.name]);
      
      if (timeColType?.fieldType === FieldType.time) {
        t = convertTimezonedDateToUTC(t, timeColType.timezone);
      }
      
      /* Build category key from GROUP BY */
      let categoryKey = '';
      if (keyColumns.length > 0) {
        categoryKey = keyColumns
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
      
      // Initialize category metrics if needed
      if (!metricsByCategory[categoryKey]) {
        metricsByCategory[categoryKey] = {};
      }
      
      // Add metrics for this category
      each(row, function (val, key) {
        // Skip timestamp and GROUP BY keys
        if ((self.keys.length === 0 && timeCol.name === key) || self.keys.indexOf(key) >= 0) {
          return;
        }
        
        // Initialize metrics array
        if (!metricsByCategory[categoryKey][key]) {
          metricsByCategory[categoryKey][key] = [];
        }
        
        if (val !== undefined) {
          // Add datapoint
          metricsByCategory[categoryKey][key].push([_formatValue(val), t]);
        }
      });
    });
    
    // Convert category metrics to series
    for (const categoryKey in metricsByCategory) {
      const categoryMetrics = metricsByCategory[categoryKey];
      
      for (const metricKey in categoryMetrics) {
        const dataPoints = categoryMetrics[metricKey];
        
        // Sort datapoints by timestamp
        dataPoints.sort((a, b) => a[1] - b[1]);
        
        // Filter out duplicates keeping only the last value for each timestamp
        const uniqueDatapoints: Array<[any, number | string]> = [];
        const timestamps = new Set<number | string>();
        
        // Process in reverse order to keep last values
        for (let i = dataPoints.length - 1; i >= 0; i--) {
          const timestamp = dataPoints[i][1];
          if (!timestamps.has(timestamp)) {
            timestamps.add(timestamp);
            uniqueDatapoints.unshift(dataPoints[i]); // Add to front to maintain order
          }
        }
        
        // Series name: use just the category as requested
        const seriesName = categoryKey || metricKey;
        
        const processedDataPoints = extrapolate ? extrapolateDataPoints(uniqueDatapoints, self) : uniqueDatapoints;
        
        // Create time series
        timeSeries.push({
          length: processedDataPoints.length,
          fields: [
            { config: { links: []}, name: 'time', type: 'time', values: processedDataPoints.map((v: any) => v[1])},
            { config: { links: []}, name: seriesName, values: processedDataPoints.map((v: any) => v[0])},
          ],
          refId: seriesName && self.refId ? `${self.refId} - ${seriesName}` : undefined
        });
      }
    }
    
    return timeSeries;
  }

  each(metrics, function (dataPoints, seriesName) {
    // Sort by timestamp
    dataPoints.sort((a, b) => a[1] - b[1]);
    
    // Filter out duplicates keeping only the last value for each timestamp
    const uniqueDatapoints: Array<[any, number | string]> = [];
    const timestamps = new Set<number | string>();
    
    // Process in reverse order to keep last values
    for (let i = dataPoints.length - 1; i >= 0; i--) {
      const timestamp = dataPoints[i][1];
      if (!timestamps.has(timestamp)) {
        timestamps.add(timestamp);
        uniqueDatapoints.unshift(dataPoints[i]); // Add to front to maintain order
      }
    }
    
    const processedDataPoints = extrapolate ? extrapolateDataPoints(uniqueDatapoints, self) : uniqueDatapoints;
    
    timeSeries.push({
      length: processedDataPoints.length,
      fields: [
        { config: { links: []}, name: 'time', type: 'time', values: processedDataPoints.map((v: any) => v[1])},
        { config: { links: []}, name: seriesName, values: processedDataPoints.map((v: any) => v[0])},
      ],
      refId: seriesName && self.refId ? `${self.refId} - ${seriesName}` : undefined
    });
  });

  return timeSeries;
};
