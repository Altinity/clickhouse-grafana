import { each, find, isArray, omitBy, pickBy } from 'lodash';
import { DataFrame, FieldType, MutableDataFrame } from '@grafana/data';

interface Trace {
  traceID: string;
  spanID: string;
  parentSpanID?: string | null;
  serviceName: string;
  startTime: number;
  duration: number;
  operationName: string;
  tags: object[];
  serviceTags: object[];
}

interface Field {
  name: string;
  type: string;
  values: Array<string | number | null | object>;
  config: Record<string, unknown>;
}

interface TraceData {
  fields: Field[];
  length: number;
}

export default class SqlSeries {
  refId: string;
  series: any;
  keys: any;
  meta: any[];
  tillNow: any;
  from: any;
  to: any;

  /** @ngInject */
  constructor(options: any) {
    this.refId = options.refId;
    this.series = options.series;
    this.meta = options.meta;
    this.tillNow = options.tillNow;
    this.from = options.from;
    this.to = options.to;
    this.keys = options.keys || [];
  }

  toTraces(): TraceData[] {

    let series: Trace[] = this.series; // Ensure 'this.series' is defined in the context where toTraces is called.

    function transformTraceData(inputData: Trace[]): TraceData[] {
      const fields: { [key: string]: Field } = {
        traceID: { name: 'traceID', type: 'string', values: [], config: {} },
        spanID: { name: 'spanID', type: 'string', values: [], config: {} },
        operationName: { name: 'operationName', type: 'string', values: [], config: {} },
        parentSpanID: { name: 'parentSpanID', type: 'string', values: [], config: {} },
        serviceName: { name: 'serviceName', type: 'string', values: [], config: {} },
        startTime: { name: 'startTime', type: 'number', values: [], config: {} },
        duration: { name: 'duration', type: 'number', values: [], config: {} },
        tags: { name: 'tags', type: 'number', values: [], config: {} },
        serviceTags: { name: 'serviceTags', type: 'number', values: [], config: {} },
      };

      inputData.forEach(span => {
        fields.traceID.values.push(span.traceID);
        fields.spanID.values.push(span.spanID);
        fields.operationName.values.push(span.operationName);
        fields.parentSpanID.values.push(span.parentSpanID || null); // Assuming null if undefined
        fields.serviceName.values.push(span.serviceName);
        fields.startTime.values.push(parseInt(span.startTime.toString(), 10));
        fields.duration.values.push(parseInt(span.duration.toString(), 10));
        fields.tags.values.push(Object.entries(span.tags).map(([key, value]) => ({key: key, value: value})));
        fields.serviceTags.values.push(Object.entries(span.serviceTags).map(([key, value]) => ({key: key, value: value})));
        // Handle other fields if required
      });

      return [{
        fields: Object.values(fields),
        length: inputData.length
      }];
    }

    return transformTraceData(series);
  }

  toFlamegraph(): any {
    interface FlamegraphData {
      label: string;
      level: number;
      value: string;
      self: number;
    }

    interface Field {
      name: string;
      type: string;
      values: Array<string | number>;
      config: {};
    }

    try {
      const series: FlamegraphData[] = this.series;
      return transformTraceData(series);
    } catch (error: any) {
      return [{
        fields: [{
          name: 'error',
          type: 'string',
          values: [error?.message],
          config: {}
        }],
        length: 1
      }];
    }

    function transformTraceData(inputData: FlamegraphData[]): any {
      const sortedData = inputData.filter(item => {
        return !(Number(item.level) === 0)
      })

      const fields: { [key: string]: Field } = {
        label: { name: 'label', type: 'string', values: ['all'], config: {} },
        level: { name: 'level', type: 'number', values: [0], config: {} },
        value: { name: 'value', type: 'number', values: [0], config: {} },
        self: { name: 'self', type: 'number', values: [0], config: {} },
      };

      const totalValue = inputData.filter(item => Number(item.level) === 1).reduce((acc, item) => {
        return acc + Number(item.value);
      }, 0);

      fields.value.values[0] = totalValue;

      sortedData.forEach(item => {
        fields.label.values.push(item.label);
        fields.level.values.push(Number(item.level));
        fields.value.values.push(Number(item.value));
        fields.self.values.push(item.self);
      });


      console.log([{
        fields: Object.values(fields),
        length: inputData.length
      }])
      return [{
        fields: Object.values(fields),
        length: inputData.length
      }];
    }
  }

  toTable(): any {
    let self = this;
    let data: Array<{ columns: any[]; rows: any[]; type: string }> = [];
    if (this.series.length === 0) {
      return data;
    }

    let columns: any[] = [];
    each(self.meta, function (col) {
      columns.push({ text: col.name, type: SqlSeries._toJSType(col.type) });
    });

    let rows: any[] = [];
    each(self.series, function (ser) {
      let r: any[] = [];
      each(columns, function (col, index) {
        r.push(SqlSeries._formatValueByType(ser[col.text], SqlSeries._toJSType(self.meta[index].type)));
      });
      rows.push(r);
    });

    data.push({
      columns: columns,
      rows: rows,
      type: 'table',
    });

    return data;
  }

  toLogs(): DataFrame[] {
    const dataFrame: DataFrame[] = [];
    const self = this;
    const reservedFields = ['level', 'id'];

    if (this.series.length === 0) {
      return dataFrame;
    }

    let types: { [key: string]: any } = {};
    let labelFields: any[] = [];
    // Trying to find message field
    // If we have a "content" field - take it
    let messageField = find(this.meta, ['name', 'content'])?.name;
    // If not - take the first string field
    if (messageField === undefined) {
      messageField = find(this.meta, (o: any) => SqlSeries._toFieldType(o.type) === FieldType.string)?.name;
    }
    // If no string fields - this query is unusable for logs, because Grafana requires at least one text field
    if (messageField === undefined) {
      return dataFrame;
    }

    each(this.meta, function (col: any, index: number) {
      let type = SqlSeries._toFieldType(col.type);
      // Assuming that fist column is time
      // That's special case for 'Column:TimeStamp'
      if (index === 0 && col.type === 'UInt64') {
        type = FieldType.time;
      }
      if (type === FieldType.string && col.name !== messageField && !reservedFields.includes(col.name)) {
        labelFields.push(col.name);
      }

      types[col.name] = type;
    });

    each(this.series, function (ser: any) {
      const frame = new MutableDataFrame({
        refId: self.refId,
        meta: {
          preferredVisualisationType: 'logs',
        },
        fields: [],
      });
      const labels = pickBy(ser, (_value: any, key: string) => labelFields.includes(key));

      each(ser, function (_value: any, key: string) {
        // Skip unknown keys for in case
        if (!(key in types)) {
          return;
        }
        if (key === messageField) {
          frame.addField({ name: key, type: types[key], labels: labels });
        } else if (!labelFields.includes(key)) {
          frame.addField({ name: key, type: types[key] });
        }
      });

      frame.add(omitBy(ser, (_value: any, key: string) => labelFields.includes(key)));
      dataFrame.push(frame);
    });

    return dataFrame;
  }

  toTimeSeries(extrapolate = true): any {
    let self = this,
      timeSeries: any[] = [];
    if (self.series.length === 0) {
      return timeSeries;
    }

    let metrics: { [key: string]: any[] } = {};
    // timeCol have to be the first column always
    let timeCol = self.meta[0];
    let lastTimeStamp = self.series[0][timeCol.name];
    let keyColumns = self.keys.filter((name: string) => {
      return name !== timeCol.name;
    });
    each(self.series, function (row) {
      let t = SqlSeries._formatValue(row[timeCol.name]);
      /* Build composite key (categories) from GROUP BY */
      let metricKey: any = null;
      if (keyColumns.length > 0) {
        metricKey = keyColumns.map((name: string) => row[name]).join(', ');
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
        if (metricKey) {
          key = metricKey;
        }
        if (isArray(val)) {
          /* Expand groupArray into multiple timeseries */
          each(val, function (arr) {
            SqlSeries._pushDatapoint(metrics, t, arr[0], arr[1]);
          });
        } else {
          SqlSeries._pushDatapoint(metrics, t, key, val);
        }
      });
    });

    each(metrics, function (dataPoints, seriesName) {
      if (extrapolate) {
        timeSeries.push({ target: seriesName, datapoints: self.extrapolate(dataPoints) });
      } else {
        timeSeries.push({ target: seriesName, datapoints: dataPoints });
      }
    });

    return timeSeries;
  }

  extrapolate(datapoints: any) {
    if (datapoints.length < 10 || (!this.tillNow && datapoints[0][0] !== 0)) {
      return datapoints;
    }

    // Duration between first/last samples and boundary of range.
    let durationToStart = datapoints[0][1] / 1000 - this.from,
      durationToEnd = this.to - datapoints[datapoints.length - 1][1] / 1000;

    // If the first/last samples are close to the boundaries of the range,
    // extrapolate the result.
    let sampledInterval = (datapoints[datapoints.length - 1][1] - datapoints[0][1]) / 1000,
      averageDurationBetweenSamples = sampledInterval / (datapoints.length - 1);

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
      let l = datapoints.length;
      diff = ((datapoints[l - 2][0] - datapoints[l - 3][0]) / datapoints[l - 2][0]) * 0.1;
      diff %= 1;
      if (isNaN(diff)) {
        diff = 0;
      }
      datapoints[l - 1][0] = datapoints[l - 2][0] * (1 + diff);
    }

    return datapoints;
  }

  static _pushDatapoint(metrics: any, timestamp: number, key: string, value: number) {
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

    metrics[key].push([SqlSeries._formatValue(value), timestamp]);
  }

  static _toJSType(type: any): string {
    switch (type) {
      case 'UInt8':
      case 'UInt16':
      case 'UInt32':
      case 'UInt64':
      case 'Int8':
      case 'Int16':
      case 'Int32':
      case 'Int64':
      case 'Float32':
      case 'Float64':
      case 'Decimal':
      case 'Decimal32':
      case 'Decimal64':
      case 'Decimal128':
      case 'Nullable(UInt8)':
      case 'Nullable(UInt16)':
      case 'Nullable(UInt32)':
      case 'Nullable(UInt64)':
      case 'Nullable(Int8)':
      case 'Nullable(Int16)':
      case 'Nullable(Int32)':
      case 'Nullable(Int64)':
      case 'Nullable(Float32)':
      case 'Nullable(Float64)':
      case 'Nullable(Decimal)':
      case 'Nullable(Decimal32)':
      case 'Nullable(Decimal64)':
      case 'Nullable(Decimal128)':
        return 'number';
      default:
        return 'string';
    }
  }

  static _toFieldType(type: string): FieldType {
    switch (type) {
      case 'UInt8':
      case 'UInt16':
      case 'UInt32':
      case 'UInt64':
      case 'Int8':
      case 'Int16':
      case 'Int32':
      case 'Int64':
      case 'Float32':
      case 'Float64':
      case 'Decimal':
      case 'Decimal32':
      case 'Decimal64':
      case 'Decimal128':
      case 'Nullable(UInt8)':
      case 'Nullable(UInt16)':
      case 'Nullable(UInt32)':
      case 'Nullable(UInt64)':
      case 'Nullable(Int8)':
      case 'Nullable(Int16)':
      case 'Nullable(Int32)':
      case 'Nullable(Int64)':
      case 'Nullable(Float32)':
      case 'Nullable(Float64)':
      case 'Nullable(Decimal)':
      case 'Nullable(Decimal32)':
      case 'Nullable(Decimal64)':
      case 'Nullable(Decimal128)':
        return FieldType.number;
      case 'Date':
      case 'DateTime':
      case 'DateTime64':
      case 'DateTime64(3)':
      case 'DateTime64(6)':
      case 'Nullable(Date)':
      case 'Nullable(DateTime)':
      case 'Nullable(DateTime64)':
      case 'Nullable(DateTime64(3))':
      case 'Nullable(DateTime64(6))':
        return FieldType.time;
      case 'IPv6':
      case 'IPv4':
      case 'Nullable(IPv6)':
      case 'Nullable(IPv4)':
        return FieldType.other;
      default:
        return FieldType.string;
    }
  }

  static _formatValue(value: any) {
    if (value === null) {
      return value;
    }

    let numeric = Number(value);
    if (isNaN(numeric)) {
      return value;
    } else {
      return numeric;
    }
  }

  static _formatValueByType(value: any, t: string) {
    if (value === null) {
      return value;
    }

    let numeric = Number(value);
    if (isNaN(numeric) || t !== 'number') {
      return value;
    } else {
      return numeric;
    }
  }
}
