import { size } from 'lodash';
import SqlSeries from '../datasource/sql-series/sql_series';
import AdhocCtrl from '../datasource/adhoc';
import ResponseParser from '../datasource/response_parser';
import { FieldType } from '@grafana/data';

describe('clickhouse sql series:', () => {
  describe('SELECT $timeseries response WHERE $adhoc = 1', () => {
    let response = {
      meta: [
        {
          name: 't',
        },
        {
          name: 'good',
        },
        {
          name: 'bad',
        },
      ],
      data: [
        {
          t: '1485443760000',
          good: 26070,
          bad: 17,
        },
        {
          t: '1485443820000',
          good: 24824,
          bad: 12,
        },
        {
          t: '1485443880000',
          good: 25268,
          bad: 17,
        },
      ],
    };

    let sqlSeries = new SqlSeries({
      series: response.data,
      meta: response.meta,
      table: '',
    });
    let timeSeries = sqlSeries.toTimeSeries();
    it('expects two results', () => {
      expect(size(timeSeries)).toBe(2);
    });

    it('should get three datapoints', () => {
      expect(size(timeSeries[0].fields[0].values)).toBe(3);
      expect(size(timeSeries[0].fields[0].values)).toBe(3);
    });
  });

  describe('SELECT $columns response', () => {
    let response = {
      meta: [
        {
          name: 't',
          type: 'UInt64',
        },
        {
          name: 'requests',
          type: 'Array(Tuple(String, Float64))',
        },
      ],

      data: [
        {
          t: '1485445140000',
          requests: [
            ['Chrome', null],
            ['Edge', null],
            ['Firefox', null],
          ],
        },
        {
          t: '1485445200000',
          requests: [
            ['Chrome', 1],
            ['Edge', 4],
            ['Firefox', 7],
          ],
        },
        {
          t: '1485445260000',
          requests: [
            ['Chrome', 2],
            ['Chromium', 5],
            ['Edge', 8],
            ['Firefox', 11],
          ],
        },
        {
          t: '1485445320000',
          requests: [
            ['Chrome', 3],
            ['Chromium', 6],
            ['Edge', 9],
            ['Firefox', 12],
          ],
        },
      ],
    };

    let sqlSeries = new SqlSeries({
      series: response.data,
      meta: response.meta,
      table: '',
    });
    let timeSeries = sqlSeries.toTimeSeries(false, true);

    it('expects four results', () => {
      expect(size(timeSeries)).toBe(4);
    });

    it('should get three datapoints', () => {
      expect(size(timeSeries[0].fields[0].values)).toBe(4);
      expect(size(timeSeries[1].fields[0].values)).toBe(4);
      expect(size(timeSeries[2].fields[0].values)).toBe(4);
      expect(size(timeSeries[3].fields[0].values)).toBe(4);
    });
  });

  describe('When performing ad-hoc query', () => {
    let response = {
      meta: [
        {
          name: 'database',
          type: 'String',
        },
        {
          name: 'table',
          type: 'String',
        },
        {
          name: 'name',
          type: 'String',
        },
        {
          name: 'type',
          type: 'String',
        },
      ],
      data: [
        {
          database: 'default',
          table: 'requests',
          name: 'Event',
          type: "Enum8('VIEWS' = 1, 'CLICKS' = 2)",
        },
        {
          database: 'default',
          table: 'requests',
          name: 'UserID',
          type: 'UInt32',
        },
        {
          database: 'default',
          table: 'requests',
          name: 'URL',
          type: 'String',
        },
      ],

      rows: 3,
    };

    // @ts-ignore
    let rp = new ResponseParser();
    let adhocCtrl = new AdhocCtrl({ defaultDatabase: 'default' });
    it('should be inited', function () {
      expect(adhocCtrl.query).toBe(
        "SELECT database, table, name, type FROM system.columns WHERE database = 'default' ORDER BY database, table"
      );
      expect(adhocCtrl.datasource.defaultDatabase).toBe('default');
    });

    let data = rp.parse('', response);
    adhocCtrl.processTagKeysResponse(data);
    it('should return adhoc filter list', function () {
      let results = adhocCtrl.tagKeys;
      expect(results.length).toBe(6);
      expect(results[0].text).toBe('requests.Event');
      expect(results[0].value).toBe('requests.Event');

      expect(results[1].text).toBe('requests.UserID');
      expect(results[1].value).toBe('requests.UserID');

      expect(results[2].text).toBe('requests.URL');
      expect(results[2].value).toBe('requests.URL');

      expect(results[3].text).toBe('Event');
      expect(results[3].value).toBe('Event');

      expect(results[4].text).toBe('UserID');
      expect(results[4].value).toBe('UserID');

      expect(results[5].text).toBe('URL');
      expect(results[5].value).toBe('URL');
    });
  });

  describe('When performing logs query', () => {
    let response = {
      meta: [
        {
          name: 't',
          type: 'UInt64',
        },
        {
          name: 'content',
          type: 'String',
        },
        {
          name: 'level',
          type: 'LowCardinality(String)',
        },
        {
          name: 'id',
          type: 'String',
        },
        {
          name: 'host',
          type: 'String',
        },
      ],

      data: [
        {
          t: '1485445140000',
          content: 'Log line 1',
          level: 'Warning',
          id: '1234',
          host: 'localhost',
        },
        {
          t: '1485445200000',
          content: 'Log line 1',
          level: 'Warning',
          id: '1234',
          host: 'localhost',
        },
        {
          t: '1485445260000',
          content: 'Log line 2',
          level: 'Info',
          id: '5678',
          host: 'localhost',
        },
        {
          t: '1485445320000',
          content: 'Log line 3',
          level: 'Unknown',
          id: '0000',
          host: 'localhost',
        },
      ],
    };

    let sqlSeries = new SqlSeries({
      refId: 'A',
      series: response.data,
      meta: response.meta,
      table: '',
    });
    let logs = sqlSeries.toLogs();

    it('should have refId', () => {
      expect(logs[0].refId).toBe('A');
    });

    it('should have preferred visualization option logs', () => {
      expect(logs[0].meta?.preferredVisualisationType).toBe('logs');
    });

    it('should get four fields in DataFrame', () => {
      expect(logs[0].fields.length).toBe(5);
    });

    it('should get first field in DataFrame as time', () => {
      expect(logs[0].fields[0].type).toBe(FieldType.time);
    });

    it('should get second field in DataFrame as content with labels', () => {
      expect(logs[0].fields[3].name).toEqual('labels');
      expect(logs[0].fields[3].values[0]).toHaveProperty('host');
    });

    it('should get one datapoints for each field in each DataFrame', () => {
      expect(size(logs[0].fields)).toBe(5);
      expect(size(logs[0].fields[1].values)).toBe(4);
      expect(size(logs[0].fields[2].values)).toBe(4);
      expect(size(logs[0].fields[3].values)).toBe(4);
    });
  });
});

// check https://github.com/Altinity/clickhouse-grafana/issues/281
describe('When meta and data keys do not have the same index', () => {
  const response = {
    meta: [
      {
        name: 'c',
        type: 'String',
      },
      {
        name: 'a',
        type: 'String',
      },
      {
        name: 'b',
        type: 'String',
      },
    ],

    data: [
      {
        b: 'b_value',
        c: 'c_value',
        a: 'a_value',
      },
    ],
  };

  // @ts-ignore
  const responseParser = new ResponseParser();
  const data = responseParser.parse("SELECT 'a_value' AS a, 'b_value' AS b, 'c_value' AS c", response);

  it('should return key-value pairs', function () {
    expect(data[0]).toStrictEqual({ a: 'a_value', b: 'b_value', c: 'c_value' });
  });

  let sqlTable = new SqlSeries({
    series: response.data,
    meta: response.meta,
  });
  let table = sqlTable.toTable();
  expect(table[0].type).toBe('table');
  expect(table[0].columns).toStrictEqual([
    { text: 'c', type: 'string' },
    { text: 'a', type: 'string' },
    { text: 'b', type: 'string' },
  ]);
  expect(table[0].rows).toStrictEqual([['c_value', 'a_value', 'b_value']]);
});
