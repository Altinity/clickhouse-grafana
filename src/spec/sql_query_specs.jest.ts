import SqlQuery from '../datasource/sql-query/sql_query';
import dayjs from 'dayjs';
// @ts-ignore
import { RawTimeRangeStub } from './lib/raw_time_range_stub';
// @ts-ignore
import TemplateSrvStub from './lib/template_srv_stub';
import SqlQueryMacros, { TimeRange } from '../datasource/sql-query/sql-query-macros';
import { SqlQueryHelper } from '../datasource/sql-query/sql-query-helper';
import {TimestampFormat} from "../types/types";

describe('Query SELECT with $timeFilterByColumn and range with from and to:', () => {
  const query = 'SELECT * FROM table WHERE $timeFilterByColumn(column_name)';
  const range: TimeRange = {
    from: dayjs('2018-12-24 01:02:03Z'),
    to: dayjs('2018-12-31 23:59:59Z'),
    raw: RawTimeRangeStub,
  };

  it('gets replaced with BETWEEN filter', () => {
    expect(SqlQueryMacros.replaceTimeFilters(query, range, TimestampFormat.DateTime)).toBe(
      'SELECT * FROM table WHERE column_name >= toDateTime(1545613323) AND column_name <= toDateTime(1546300799)'
    );
    expect(SqlQueryMacros.replaceTimeFilters(query, range, TimestampFormat.DateTime64)).toBe(
      'SELECT * FROM table WHERE column_name >= toDateTime64(1545613323000/1000, 3) AND column_name <= toDateTime64(1546300799000/1000, 3)'
    );
  });
});

describe('Query SELECT with $timeFilterByColumn, $timeFilter64ByColumn and range with from', () => {
  const query = 'SELECT * FROM table WHERE $timeFilterByColumn(column_name)';
  const query64 = 'SELECT * FROM table WHERE $timeFilter64ByColumn(column_name)';
  const range: TimeRange = {
    from: dayjs('2018-12-24 01:02:03.200Z'),
    to: dayjs(),
    raw: {
      from: dayjs('2018-12-24 01:02:03.200Z'),
      to: 'now',
    },
  };

  it('gets replaced with >= filter', () => {
    expect(SqlQueryMacros.replaceTimeFilters(query, range, TimestampFormat.DateTime)).toBe(
      'SELECT * FROM table WHERE ' +
        'column_name >= toDateTime(' +
        range.from.unix() +
        ') AND ' +
        'column_name <= toDateTime(' +
        range.to.unix() +
        ')'
    );
    expect(SqlQueryMacros.replaceTimeFilters(query, range, TimestampFormat.DateTime64)).toBe(
      'SELECT * FROM table WHERE ' +
        'column_name >= toDateTime64(' +
        range.from.unix() +
        '200/1000, 3) AND ' +
        'column_name <= toDateTime64(' +
        range.to.valueOf() +
        '/1000, 3)'
    );
    expect(SqlQueryMacros.replaceTimeFilters(query64, range, TimestampFormat.DateTime)).toBe(
      'SELECT * FROM table WHERE ' +
        'column_name >= toDateTime64(' +
        range.from.unix() +
        '200/1000, 3) AND ' +
        'column_name <= toDateTime64(' +
        range.to.valueOf() +
        '/1000, 3)'
    );
    expect(SqlQueryMacros.replaceTimeFilters(query64, range, TimestampFormat.DateTime64)).toBe(
      'SELECT * FROM table WHERE ' +
        'column_name >= toDateTime64(' +
        range.from.unix() +
        '200/1000, 3) AND ' +
        'column_name <= toDateTime64(' +
        range.to.valueOf() +
        '/1000, 3)'
    );
  });
});

describe('Query SELECT with $timeSeries $timeFilter and DATETIME64', () => {
  const query =
    'SELECT $timeSeries as t, sum(x) AS metric\n' +
    'FROM $table\n' +
    'WHERE $timeFilter\n' +
    'GROUP BY t\n' +
    'ORDER BY t';
  const expQuery =
    'SELECT (intDiv(toFloat64("d") * 1000, (15 * 1000)) * (15 * 1000)) as t, sum(x) AS metric\n' +
    'FROM default.test_datetime64\n' +
    'WHERE "d" >= toDateTime64(1545613320, 3) AND "d" <= toDateTime64(1546300740, 3)\n' +
    'GROUP BY t\n' +
    'ORDER BY t';
  let templateSrv = new TemplateSrvStub();
  const adhocFilters: any[] = [];
  let target = {
    query: query,
    interval: '15s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'test_datetime64',
    database: 'default',
    dateTimeType: 'DATETIME64',
    dateColDataType: '',
    dateTimeColDataType: 'd',
    round: '1m',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    scopedVars: {
      __interval: {
        text: '15s',
        value: '15s',
      },
      __interval_ms: {
        text: '15000',
        value: 15000,
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);
  it('applyMacros $timeSeries with $timeFilter with DATETIME64', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

describe('$unescape', () => {
  const query =
    "SELECT $unescape('count()'), " +
    "$unescape('if(runningDifference(max_0) < 0, nan, " +
    "runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate') " +
    "FROM requests WHERE $unescape('client_ID') = 5";
  const expQuery =
    'SELECT count(), if(runningDifference(max_0) < 0, ' +
    'nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate ' +
    'FROM requests WHERE client_ID = 5';
  it('gets replaced with >= filter', () => {
    expect(SqlQueryHelper.unescape(query)).toBe(expQuery);
  });
});

describe('Identifiers back-quoting', () => {
  it('Standard identifier - untouched', () => {
    expect(SqlQueryHelper.escapeIdentifier('My_Identifier_33')).toBe('My_Identifier_33');
  });
  it('Begining with number', () => {
    expect(SqlQueryHelper.escapeIdentifier('1nfoVista')).toBe('"1nfoVista"');
  });
  it('Containing spaces', () => {
    expect(SqlQueryHelper.escapeIdentifier('My Identifier')).toBe('"My Identifier"');
  });
  it('Containing arithmetic operation special characters', () => {
    expect(SqlQueryHelper.escapeIdentifier('a / 1000')).toBe('a / 1000');
    expect(SqlQueryHelper.escapeIdentifier('a + b')).toBe('a + b');
    expect(SqlQueryHelper.escapeIdentifier('b - c')).toBe('b - c');
    expect(SqlQueryHelper.escapeIdentifier('5*c')).toBe('5*c');
    expect(SqlQueryHelper.escapeIdentifier('a / 1000 + b - 5*c')).toBe('a / 1000 + b - 5*c');
    expect(SqlQueryHelper.escapeIdentifier('a / 1000 + b - 5*c')).toBe('a / 1000 + b - 5*c');
  });
  it('Containing double-quote', () => {
    expect(SqlQueryHelper.escapeIdentifier('My"Bad"Identifier')).toBe('"My\\"Bad\\"Identifier"');
  });
  it('Containing function calls', () => {
    expect(SqlQueryHelper.escapeIdentifier('toDateTime(someDate)')).toBe('toDateTime(someDate)');
  });
});

/* fix https://github.com/Altinity/clickhouse-grafana/issues/440 */
describe('Table Identifiers back-quoting', () => {
  it('Standard identifier - untouched', () => {
    expect(SqlQueryHelper.escapeTableIdentifier('My_Identifier_33')).toBe('My_Identifier_33');
  });
  it('Begining with number', () => {
    expect(SqlQueryHelper.escapeTableIdentifier('1nfoVista')).toBe('`1nfoVista`');
  });
  it('Containing spaces', () => {
    expect(SqlQueryHelper.escapeTableIdentifier('My Identifier')).toBe('`My Identifier`');
  });
  it('Containing single quote', () => {
    expect(SqlQueryHelper.escapeTableIdentifier('My`Identifier')).toBe('`My\\`Identifier`');
  });

  it('Containing arithmetic operation special characters', () => {
    expect(SqlQueryHelper.escapeTableIdentifier('a / 1000')).toBe('`a / 1000`');
    expect(SqlQueryHelper.escapeTableIdentifier('a + b')).toBe('`a + b`');
    expect(SqlQueryHelper.escapeTableIdentifier('b - c')).toBe('`b - c`');
    expect(SqlQueryHelper.escapeTableIdentifier('5*c')).toBe('`5*c`');
    expect(SqlQueryHelper.escapeTableIdentifier('a / 1000 + b - 5*c')).toBe('`a / 1000 + b - 5*c`');
    expect(SqlQueryHelper.escapeTableIdentifier('a / 1000 + b - 5*c')).toBe('`a / 1000 + b - 5*c`');
  });
  it('Containing double-quote', () => {
    expect(SqlQueryHelper.escapeTableIdentifier('My"Bad"Identifier')).toBe('`My"Bad"Identifier`');
  });
});

/* check https://github.com/Altinity/clickhouse-grafana/issues/276 */
describe('$rateColumns and subquery + $conditionalTest + SqlQuery.replace + adhocFilters', () => {
  const query =
    '$rateColumns(\n' +
    "    'User.' || toString(from_user) || ', Serv.' || toString(service_name) as key,\n" +
    '    sum(count) as value\n' +
    ') FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        service_name,\n' +
    '        from_user,\n' +
    '        count() as count\n' +
    '    FROM $table\n' +
    '\n' +
    '    WHERE\n' +
    '        $timeFilter\n' +
    '        $conditionalTest(AND toLowerCase(service_name) IN ($repeated_service),$repeated_service)\n' +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        from_user,\n' +
    '        service_name\n' +
    ')';
  const expQuery =
    'SELECT t, arrayMap(a -> (a.1, a.2/runningDifference( t/1000 )), groupArr) FROM (' +
    'SELECT t, groupArray((key, value)) AS groupArr FROM ( ' +
    "SELECT (intDiv(toUInt32(event_time), 20) * 20) * 1000 AS t, 'User.' || toString(from_user) || ', Serv.' || toString(service_name) as key, " +
    'sum(count) as value FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        service_name,\n' +
    '        from_user,\n' +
    '        count() as count\n' +
    '    FROM default.test_grafana\n' +
    '\n' +
    '    WHERE event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740) AND\n' +
    '        event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740)\n' +
    "        AND toLowerCase(service_name) IN ('mysql','postgresql')\n" +
    "        AND test = 'value'\n" +
    "        AND test2 LIKE '%value%'\n" +
    "        AND test3 NOT LIKE '%value%'\n" +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        from_user,\n' +
    '        service_name\n' +
    ') GROUP BY t, key ORDER BY t, key) GROUP BY t ORDER BY t)';
  let templateSrv = new TemplateSrvStub();
  templateSrv.variables = [
    {
      name: 'repeated_service',
      type: 'query',
      current: {
        value: ['mysql', 'postgresql'],
      },
      options: [
        { selected: false, value: '$__all' },
        { selected: true, value: 'mysql' },
        { selected: true, value: 'postgresql' },
      ],
    },
  ];
  const adhocFilters = [
    {
      key: 'test',
      operator: '=',
      value: 'value',
    },
    {
      key: 'test2',
      operator: '=~',
      value: '%value%',
    },
    {
      key: 'test3',
      operator: '!~',
      value: '%value%',
    },
  ];
  let target = {
    query: query,
    interval: '20s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'test_grafana',
    database: 'default',
    dateTimeType: 'DATETIME',
    dateColDataType: 'event_date',
    dateTimeColDataType: 'event_time',
    round: '1m',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    scopedVars: {
      __interval: {
        text: '20s',
        value: '20s',
      },
      __interval_ms: {
        text: '20000',
        value: 20000,
      },
      repeated_service: {
        value: ['mysql', 'postgresql'],
        multi: true,
        includeAll: true,
        options: [
          { selected: false, value: '$__all' },
          { selected: true, value: 'mysql' },
          { selected: true, value: 'postgresql' },
        ],
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);

  it('applyMacros with subQuery and adHocFilters', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

/* check https://github.com/Altinity/clickhouse-grafana/issues/386 */
describe('$rateColumnsAggregated and subquery + $conditionalTest + SqlQuery.replace + adhocFilters', () => {
  const query =
    '$rateColumnsAggregated(\n' +
    "    datacenter, concat(datacenter,interface) AS dc_interface,\n" +
    '    sum, max(tx_bytes) as value\n' +
    ') FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        datacenter,\n' +
    '        interface,\n' +
    '        max(tx_bytes) as tx_bytes\n' +
    '    FROM $table\n' +
    '\n' +
    '    WHERE\n' +
    '        $timeFilter\n' +
    '        $conditionalTest(AND toLowerCase(datacenter) IN ($repeated_datacenter),$repeated_datacenter)\n' +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        datacenter,\n' +
    '        interface\n' +
    ')';
  const expQuery =
    'SELECT t, datacenter, sum(valueRate) AS valueRateAgg FROM (  ' +
    'SELECT t, datacenter, dc_interface, value / runningDifference(t / 1000) AS valueRate  FROM (' +
    '   SELECT (intDiv(toUInt32(event_time), 20) * 20) * 1000 AS t, datacenter, concat(datacenter, interface) AS dc_interface, ' +
    'max(tx_bytes) AS value   FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        datacenter,\n' +
    '        interface,\n' +
    '        max(tx_bytes) as tx_bytes\n' +
    '    FROM default.traffic\n' +
    '\n' +
    '    WHERE event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740) AND\n' +
    '        event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740)\n' +
    "        AND toLowerCase(datacenter) IN ('dc1','dc2')\n" +
    "        AND test = 'value'\n" +
    "        AND test2 LIKE '%value%'\n" +
    "        AND test3 NOT LIKE '%value%'\n" +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        datacenter,\n' +
    '        interface\n' +
    ')   GROUP BY datacenter, dc_interface, t    ORDER BY datacenter, dc_interface, t  ) ) GROUP BY datacenter, t ORDER BY datacenter, t';
  let templateSrv = new TemplateSrvStub();
  templateSrv.variables = [
    {
      name: 'repeated_datacenter',
      type: 'query',
      current: {
        value: ['dc1', 'dc2'],
      },
      options: [
        { selected: false, value: '$__all' },
        { selected: true, value: 'dc1' },
        { selected: true, value: 'dc2' },
      ],
    },
  ];
  const adhocFilters = [
    {
      key: 'test',
      operator: '=',
      value: 'value',
    },
    {
      key: 'test2',
      operator: '=~',
      value: '%value%',
    },
    {
      key: 'test3',
      operator: '!~',
      value: '%value%',
    },
  ];
  let target = {
    query: query,
    interval: '20s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'traffic',
    database: 'default',
    dateTimeType: 'DATETIME',
    dateColDataType: 'event_date',
    dateTimeColDataType: 'event_time',
    round: '1m',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    scopedVars: {
      __interval: {
        text: '20s',
        value: '20s',
      },
      __interval_ms: {
        text: '20000',
        value: 20000,
      },
      repeated_datacenter: {
        value: ['dc1', 'dc2'],
        multi: true,
        includeAll: true,
        options: [
          { selected: false, value: '$__all' },
          { selected: true, value: 'dc1' },
          { selected: true, value: 'dc2' },
        ],
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);

  it('applyMacros with subQuery and adHocFilters', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

/* check https://github.com/Altinity/clickhouse-grafana/issues/386 */
describe('$perSecondColumnsAggregated and subquery + $conditionalTest + SqlQuery.replace + adhocFilters', () => {
  const query =
    '$perSecondColumnsAggregated(\n' +
    "    datacenter, concat(datacenter,interface) AS dc_interface,\n" +
    '    sum, max(tx_bytes) as value\n' +
    ') FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        datacenter,\n' +
    '        interface,\n' +
    '        max(tx_bytes) as tx_bytes\n' +
    '    FROM $table\n' +
    '\n' +
    '    WHERE\n' +
    '        $timeFilter\n' +
    '        $conditionalTest(AND toLowerCase(datacenter) IN ($repeated_datacenter),$repeated_datacenter)\n' +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        datacenter,\n' +
    '        interface\n' +
    ')';
  const expQuery =
    'SELECT t, datacenter, sum(valuePerSecond) AS valuePerSecondAgg FROM (  ' +
    'SELECT t, datacenter, dc_interface,' +
    ' if(runningDifference(value) < 0 OR neighbor(dc_interface,-1,dc_interface) != dc_interface, nan, runningDifference(value) / runningDifference(t / 1000)) AS valuePerSecond' +
    '  FROM (' +
    '   SELECT (intDiv(toUInt32(event_time), 20) * 20) * 1000 AS t, datacenter, concat(datacenter, interface) AS dc_interface, ' +
    'max(tx_bytes) AS value   FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        datacenter,\n' +
    '        interface,\n' +
    '        max(tx_bytes) as tx_bytes\n' +
    '    FROM default.traffic\n' +
    '\n' +
    '    WHERE event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740) AND\n' +
    '        event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740)\n' +
    "        AND toLowerCase(datacenter) IN ('dc1','dc2')\n" +
    "        AND test = 'value'\n" +
    "        AND test2 LIKE '%value%'\n" +
    "        AND test3 NOT LIKE '%value%'\n" +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        datacenter,\n' +
    '        interface\n' +
    ')   GROUP BY datacenter, dc_interface, t    ORDER BY datacenter, dc_interface, t  ) ) GROUP BY datacenter, t ORDER BY datacenter, t';
  let templateSrv = new TemplateSrvStub();
  templateSrv.variables = [
    {
      name: 'repeated_datacenter',
      type: 'query',
      current: {
        value: ['dc1', 'dc2'],
      },
      options: [
        { selected: false, value: '$__all' },
        { selected: true, value: 'dc1' },
        { selected: true, value: 'dc2' },
      ],
    },
  ];
  const adhocFilters = [
    {
      key: 'test',
      operator: '=',
      value: 'value',
    },
    {
      key: 'test2',
      operator: '=~',
      value: '%value%',
    },
    {
      key: 'test3',
      operator: '!~',
      value: '%value%',
    },
  ];
  let target = {
    query: query,
    interval: '20s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'traffic',
    database: 'default',
    dateTimeType: 'DATETIME',
    dateColDataType: 'event_date',
    dateTimeColDataType: 'event_time',
    round: '1m',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    scopedVars: {
      __interval: {
        text: '20s',
        value: '20s',
      },
      __interval_ms: {
        text: '20000',
        value: 20000,
      },
      repeated_datacenter: {
        value: ['dc1', 'dc2'],
        multi: true,
        includeAll: true,
        options: [
          { selected: false, value: '$__all' },
          { selected: true, value: 'dc1' },
          { selected: true, value: 'dc2' },
        ],
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);

  it('applyMacros with subQuery and adHocFilters', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

/* check https://github.com/Altinity/clickhouse-grafana/issues/386 */
describe('$increaseColumnsAggregated and subquery + $conditionalTest + SqlQuery.replace + adhocFilters', () => {
  const query =
    '$increaseColumnsAggregated(\n' +
    "    datacenter, concat(datacenter,interface) AS dc_interface,\n" +
    '    sum, max(tx_bytes) as value\n' +
    ') FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        datacenter,\n' +
    '        interface,\n' +
    '        max(tx_bytes) as tx_bytes\n' +
    '    FROM $table\n' +
    '\n' +
    '    WHERE\n' +
    '        $timeFilter\n' +
    '        $conditionalTest(AND toLowerCase(datacenter) IN ($repeated_datacenter),$repeated_datacenter)\n' +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        datacenter,\n' +
    '        interface\n' +
    ')';
  const expQuery =
    'SELECT t, datacenter, sum(valueIncrease) AS valueIncreaseAgg FROM (  ' +
    'SELECT t, datacenter, dc_interface,' +
    ' if(runningDifference(value) < 0 OR neighbor(dc_interface,-1,dc_interface) != dc_interface, nan, runningDifference(value) / 1) AS valueIncrease' +
    '  FROM (' +
    '   SELECT (intDiv(toUInt32(event_time), 20) * 20) * 1000 AS t, datacenter, concat(datacenter, interface) AS dc_interface, ' +
    'max(tx_bytes) AS value   FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        datacenter,\n' +
    '        interface,\n' +
    '        max(tx_bytes) as tx_bytes\n' +
    '    FROM default.traffic\n' +
    '\n' +
    '    WHERE event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740) AND\n' +
    '        event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740)\n' +
    "        AND toLowerCase(datacenter) IN ('dc1','dc2')\n" +
    "        AND test = 'value'\n" +
    "        AND test2 LIKE '%value%'\n" +
    "        AND test3 NOT LIKE '%value%'\n" +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        datacenter,\n' +
    '        interface\n' +
    ')   GROUP BY datacenter, dc_interface, t    ORDER BY datacenter, dc_interface, t  ) ) GROUP BY datacenter, t ORDER BY datacenter, t';
  let templateSrv = new TemplateSrvStub();
  templateSrv.variables = [
    {
      name: 'repeated_datacenter',
      type: 'query',
      current: {
        value: ['dc1', 'dc2'],
      },
      options: [
        { selected: false, value: '$__all' },
        { selected: true, value: 'dc1' },
        { selected: true, value: 'dc2' },
      ],
    },
  ];
  const adhocFilters = [
    {
      key: 'test',
      operator: '=',
      value: 'value',
    },
    {
      key: 'test2',
      operator: '=~',
      value: '%value%',
    },
    {
      key: 'test3',
      operator: '!~',
      value: '%value%',
    },
  ];
  let target = {
    query: query,
    interval: '20s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'traffic',
    database: 'default',
    dateTimeType: 'DATETIME',
    dateColDataType: 'event_date',
    dateTimeColDataType: 'event_time',
    round: '1m',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    scopedVars: {
      __interval: {
        text: '20s',
        value: '20s',
      },
      __interval_ms: {
        text: '20000',
        value: 20000,
      },
      repeated_datacenter: {
        value: ['dc1', 'dc2'],
        multi: true,
        includeAll: true,
        options: [
          { selected: false, value: '$__all' },
          { selected: true, value: 'dc1' },
          { selected: true, value: 'dc2' },
        ],
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);

  it('applyMacros with subQuery and adHocFilters', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

/* check https://github.com/Altinity/clickhouse-grafana/issues/386 */
describe('$deltaColumnsAggregated and subquery + $conditionalTest + SqlQuery.replace + adhocFilters', () => {
  const query =
    '$deltaColumnsAggregated(\n' +
    "    datacenter, concat(datacenter,interface) AS dc_interface,\n" +
    '    sum, max(tx_bytes) as value\n' +
    ') FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        datacenter,\n' +
    '        interface,\n' +
    '        max(tx_bytes) as tx_bytes\n' +
    '    FROM $table\n' +
    '\n' +
    '    WHERE\n' +
    '        $timeFilter\n' +
    '        $conditionalTest(AND toLowerCase(datacenter) IN ($repeated_datacenter),$repeated_datacenter)\n' +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        datacenter,\n' +
    '        interface\n' +
    ')';
  const expQuery =
    'SELECT t, datacenter, sum(valueDelta) AS valueDeltaAgg FROM (  ' +
    'SELECT t, datacenter, dc_interface,' +
    ' if(neighbor(dc_interface,-1,dc_interface) != dc_interface, 0, runningDifference(value) / 1) AS valueDelta' +
    '  FROM (' +
    '   SELECT (intDiv(toUInt32(event_time), 20) * 20) * 1000 AS t, datacenter, concat(datacenter, interface) AS dc_interface, ' +
    'max(tx_bytes) AS value   FROM\n' +
    '(\n' +
    '    SELECT\n' +
    '        toStartOfMinute(event_time) AS event_time,\n' +
    '        datacenter,\n' +
    '        interface,\n' +
    '        max(tx_bytes) as tx_bytes\n' +
    '    FROM default.traffic\n' +
    '\n' +
    '    WHERE event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740) AND\n' +
    '        event_date >= toDate(1545613320) AND event_date <= toDate(1546300740) AND event_time >= toDateTime(1545613320) AND event_time <= toDateTime(1546300740)\n' +
    "        AND toLowerCase(datacenter) IN ('dc1','dc2')\n" +
    "        AND test = 'value'\n" +
    "        AND test2 LIKE '%value%'\n" +
    "        AND test3 NOT LIKE '%value%'\n" +
    '    GROUP BY\n' +
    '        event_time,\n' +
    '        datacenter,\n' +
    '        interface\n' +
    ')   GROUP BY datacenter, dc_interface, t    ORDER BY datacenter, dc_interface, t  ) ) GROUP BY datacenter, t ORDER BY datacenter, t';
  let templateSrv = new TemplateSrvStub();
  templateSrv.variables = [
    {
      name: 'repeated_datacenter',
      type: 'query',
      current: {
        value: ['dc1', 'dc2'],
      },
      options: [
        { selected: false, value: '$__all' },
        { selected: true, value: 'dc1' },
        { selected: true, value: 'dc2' },
      ],
    },
  ];
  const adhocFilters = [
    {
      key: 'test',
      operator: '=',
      value: 'value',
    },
    {
      key: 'test2',
      operator: '=~',
      value: '%value%',
    },
    {
      key: 'test3',
      operator: '!~',
      value: '%value%',
    },
  ];
  let target = {
    query: query,
    interval: '20s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'traffic',
    database: 'default',
    dateTimeType: 'DATETIME',
    dateColDataType: 'event_date',
    dateTimeColDataType: 'event_time',
    round: '1m',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    scopedVars: {
      __interval: {
        text: '20s',
        value: '20s',
      },
      __interval_ms: {
        text: '20000',
        value: 20000,
      },
      repeated_datacenter: {
        value: ['dc1', 'dc2'],
        multi: true,
        includeAll: true,
        options: [
          { selected: false, value: '$__all' },
          { selected: true, value: 'dc1' },
          { selected: true, value: 'dc2' },
        ],
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);

  it('applyMacros with subQuery and adHocFilters', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});


/* check https://github.com/Altinity/clickhouse-grafana/issues/282 */
describe('check replace with $adhoc macros', () => {
  const query =
    'SELECT\n' +
    '    $timeSeries as t,\n' +
    '    count()\n' +
    'FROM $table\n' +
    'WHERE $timeFilter AND $adhoc\n' +
    'GROUP BY t\n' +
    'ORDER BY t';
  const expQuery =
    'SELECT\n' +
    '    (intDiv(toUInt32(TimeFlowStart), 15) * 15) * 1000 as t,\n' +
    '    count()\n' +
    'FROM default.flows_raw\n\n' +
    'WHERE\n' +
    '    TimeFlowStart >= toDate(1545613320) AND TimeFlowStart <= toDate(1546300740) AND TimeFlowStart >= toDateTime(1545613320) AND TimeFlowStart <= toDateTime(1546300740)\n' +
    '    AND (SrcAS = 1299)\n' +
    'GROUP BY t\n\n' +
    'ORDER BY t\n';
  let templateSrv = new TemplateSrvStub();
  const adhocFilters = [
    {
      key: 'default.flows_raw.SrcAS',
      operator: '=',
      value: '1299',
    },
  ];
  let target = {
    query: query,
    interval: '15s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'flows_raw',
    database: 'default',
    dateTimeType: 'DATETIME',
    dateColDataType: 'TimeFlowStart',
    dateTimeColDataType: 'TimeFlowStart',
    round: '1m',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    scopedVars: {
      __interval: {
        text: '15s',
        value: '15s',
      },
      __interval_ms: {
        text: '15000',
        value: 15000,
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);
  it('applyMacros with $adhoc', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

/* check https://github.com/Altinity/clickhouse-grafana/issues/284 */
describe('check replace with $columns and concat and ARRAY JOIN', () => {
  const query =
    '$columns(\n' +
    "substring(concat(JobName as JobName,' # ' , Metrics.Name as MetricName), 1, 50) as JobSource,\n" +
    'sum(Metrics.Value) as Kafka_lag_max)\n' +
    'FROM $table\n' +
    'ARRAY JOIN Metrics';
  const expQuery =
    "SELECT t, groupArray((JobSource, Kafka_lag_max)) AS groupArr FROM ( SELECT (intDiv(toUInt32(dateTimeColumn), 15) * 15) * 1000 AS t, substring(concat(JobName as JobName, ' # ', Metrics.Name as MetricName), 1, 50) as JobSource, sum(Metrics.Value) as Kafka_lag_max FROM default.test_array_join_nested\n" +
    '\n' +
    'ARRAY JOIN Metrics\n' +
    ' \n\n' +
    "WHERE dateTimeColumn >= toDate(1545613320) AND dateTimeColumn <= toDate(1546300740) AND dateTimeColumn >= toDateTime(1545613320) AND dateTimeColumn <= toDateTime(1546300740) AND JobName LIKE 'Job'\n" +
    ' GROUP BY t, JobSource ORDER BY t, JobSource) GROUP BY t ORDER BY t';
  let templateSrv = new TemplateSrvStub();
  const adhocFilters = [
    {
      key: 'default.test_array_join_nested.JobName',
      operator: '=~',
      value: 'Job',
    },
  ];
  let target = {
    query: query,
    interval: '15s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'test_array_join_nested',
    database: 'default',
    dateTimeType: 'DATETIME',
    dateColDataType: 'dateTimeColumn',
    dateTimeColDataType: 'dateTimeColumn',
    round: '1m',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    scopedVars: {
      __interval: {
        text: '15s',
        value: '15s',
      },
      __interval_ms: {
        text: '15000',
        value: 15000,
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);
  it('replace with $columns and ARRAY JOIN', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

/* check https://github.com/Altinity/clickhouse-grafana/issues/294 */
describe('combine $timeFilterByColumn and $dateTimeCol', () => {
  const query =
    'SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter AND $timeFilterByColumn($dateTimeCol) AND $timeFilterByColumn(another_column) GROUP BY t';
  const expQuery =
    'SELECT (intDiv(toUInt32(tm), 15) * 15) * 1000 as t, count() FROM default.test_table ' +
    'WHERE dt >= toDate(1545613320) AND dt <= toDate(1546300740) AND tm >= toDateTime(1545613320) AND tm <= toDateTime(1546300740) ' +
    'AND tm >= toDateTime(1545613201) AND tm <= toDateTime(1546300859) ' +
    'AND another_column >= toDateTime(1545613201) AND another_column <= toDateTime(1546300859) ' +
    'GROUP BY t';

  let templateSrv = new TemplateSrvStub();
  const adhocFilters: any[] = [];
  let target = {
    query: query,
    interval: '15s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'test_table',
    database: 'default',
    dateTimeType: 'DATETIME',
    dateColDataType: 'dt',
    dateTimeColDataType: 'tm',
    round: '1m',
    rawQuery: '',
  };

  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2018-12-31 23:59:59Z'),
      raw: RawTimeRangeStub,
    },
    scopedVars: {
      __interval: {
        text: '15s',
        value: '15s',
      },
      __interval_ms: {
        text: '15000',
        value: 15000,
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);
  it('replace with $timeFilterByColumn($dateTimeCol)', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

/* check $naturalTimeSeries https://github.com/Altinity/clickhouse-grafana/pull/89 */
describe('check $naturalTimeSeries', () => {
  const query = 'SELECT $naturalTimeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t';
  const expQuery =
    'SELECT toUInt32(toDateTime(toStartOfMonth(tm))) * 1000 as t, count() ' +
    'FROM default.test_table WHERE dt >= toDate(1545613320) AND dt <= toDate(1640995140) ' +
    'AND tm >= toDateTime(1545613320) AND tm <= toDateTime(1640995140) GROUP BY t';

  let templateSrv = new TemplateSrvStub();
  const adhocFilters: any[] = [];
  let target = {
    query: query,
    interval: '15s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'test_table',
    database: 'default',
    dateTimeType: 'DATETIME',
    dateColDataType: 'dt',
    dateTimeColDataType: 'tm',
    round: '1m',
    rawQuery: '',
  };

  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2021-12-31 23:59:59Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03Z'),
      to: dayjs('2021-12-31 23:59:59Z'),
      raw: RawTimeRangeStub,
    },
    scopedVars: {
      __interval: {
        text: '15s',
        value: '15s',
      },
      __interval_ms: {
        text: '15000',
        value: 15000,
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);
  it('replace with $timeFilterByColumn($dateTimeCol)', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

/* check $timeSeriesMs and $timeFilterMs https://github.com/Altinity/clickhouse-grafana/issues/344 */
describe('Query SELECT with $timeSeriesMs $timeFilterMs and DATETIME64', () => {
  const query =
    'SELECT $timeSeriesMs as t, sum(x) AS metric\n' +
    'FROM $table\n' +
    'WHERE $timeFilterMs\n' +
    'GROUP BY t\n' +
    'ORDER BY t';
  const expQuery =
    'SELECT (intDiv(toFloat64("d") * 1000, 100) * 100) as t, sum(x) AS metric\n' +
    'FROM default.test_datetime64\n' +
    'WHERE "d" >= toDateTime64(1545613323200/1000, 3) AND "d" <= toDateTime64(1546300799200/1000, 3)\n' +
    'GROUP BY t\n' +
    'ORDER BY t';
  let templateSrv = new TemplateSrvStub();
  const adhocFilters: any[] = [];
  let target = {
    query: query,
    interval: '100ms',
    intervalFactor: 1,
    skip_comments: false,
    table: 'test_datetime64',
    database: 'default',
    dateTimeType: 'DATETIME64',
    dateColDataType: '',
    dateTimeColDataType: 'd',
    round: '100ms',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03.200Z'),
      to: dayjs('2018-12-31 23:59:59.200Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03.200Z'),
      to: dayjs('2018-12-31 23:59:59.200Z'),
    },
    scopedVars: {
      __interval: {
        text: '100ms',
        value: '100ms',
      },
      __interval_ms: {
        text: '100',
        value: 100,
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);
  it('applyMacros $timeSeriesMs with $timeFilterMs with DATETIME64', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});

/* fix https://github.com/Altinity/clickhouse-grafana/issues/440 */
describe('Query SELECT with special character in table', () => {
  const query = 'SELECT $timeSeries as t, sum(x) AS metric\n' + 'FROM $table\n' + 'GROUP BY t\n' + 'ORDER BY t';
  const expQuery =
    'SELECT (intDiv(toFloat64("d") * 1000, (1 * 1000)) * (1 * 1000)) as t, sum(x) AS metric\n' +
    'FROM default.`test-table-escaping`\n' +
    'GROUP BY t\n' +
    'ORDER BY t';
  let templateSrv = new TemplateSrvStub();
  const adhocFilters: any[] = [];
  let target = {
    query: query,
    interval: '1s',
    intervalFactor: 1,
    skip_comments: false,
    table: 'test-table-escaping',
    database: 'default',
    dateTimeType: 'DATETIME64',
    dateColDataType: '',
    dateTimeColDataType: 'd',
    round: '1s',
    rawQuery: '',
  };
  const options = {
    rangeRaw: {
      from: dayjs('2018-12-24 01:02:03.200Z'),
      to: dayjs('2018-12-31 23:59:59.200Z'),
    },
    range: {
      from: dayjs('2018-12-24 01:02:03.200Z'),
      to: dayjs('2018-12-31 23:59:59.200Z'),
    },
    scopedVars: {
      __interval: {
        text: '1s',
        value: '1s',
      },
      __interval_ms: {
        text: '1000',
        value: 1000,
      },
    },
  };
  let sql_query = new SqlQuery(target, templateSrv, options);
  it('applyMacros $table with escaping', () => {
    expect(sql_query.replace(options, adhocFilters)).toBe(expQuery);
  });
});
