import Scanner from '../datasource/scanner';
import { each } from 'lodash';
import SqlQueryMacros from '../datasource/sql-query/sql-query-macros';

class Case {
  name: string;
  got: string;
  expected: string;
  fn: any;
  scanner: Scanner;
  query: string;

  constructor(name: string, query: string, expected: string, fn: any) {
    this.name = name;
    this.expected = expected;
    this.query = query;
    this.fn = fn;
    this.scanner = new Scanner(query);
    this.got = '';
  }
}

describe('macros builder:', () => {
  let testCases = [
    new Case(
      '$rate',
      '/* comment */ $rate(countIf(Type = 200) AS from_good, countIf(Type != 200) AS from_bad) FROM requests',
      '/* comment */ SELECT t,' +
        ' from_good/runningDifference(t/1000) from_goodRate,' +
        ' from_bad/runningDifference(t/1000) from_badRate' +
        ' FROM (' +
        ' SELECT $timeSeries AS t,' +
        ' countIf(Type = 200) AS from_good,' +
        ' countIf(Type != 200) AS from_bad' +
        ' FROM requests' +
        ' WHERE $timeFilter' +
        ' GROUP BY t' +
        ' ORDER BY t)',
      SqlQueryMacros.rate
    ),
    new Case(
      '$rate negative',
      '$rated(countIf(Type = 200) AS from_good, countIf(Type != 200) AS from_bad) FROM requests',
      '$rated(countIf(Type = 200) AS from_good, countIf(Type != 200) AS from_bad) FROM requests',
      SqlQueryMacros.rate
    ),
    new Case(
      '$rateColumns',
      "/* comment */ $rateColumns((AppType = '' ? 'undefined' : AppType) from_type, sum(Hits) from_hits) " +
        " FROM table_all WHERE Event = 'request' AND (-1 IN ($template) OR col IN ($template)) HAVING hits > $interval",
      '/* comment */ SELECT t,' +
        ' arrayMap(a -> (a.1, a.2/runningDifference( t/1000 )), groupArr)' +
        ' FROM' +
        ' (SELECT t,' +
        ' groupArray((from_type, from_hits)) AS groupArr' +
        ' FROM (' +
        ' SELECT $timeSeries AS t,' +
        " (AppType = '' ? 'undefined' : AppType) from_type," +
        ' sum(Hits) from_hits' +
        ' FROM table_all' +
        ' WHERE $timeFilter' +
        " AND Event = 'request' AND (-1 IN ($template) OR col IN ($template))" +
        ' GROUP BY t, from_type' +
        ' HAVING hits > $interval' +
        ' ORDER BY t, from_type)' +
        ' GROUP BY t' +
        ' ORDER BY t)',
      SqlQueryMacros.rateColumns
    ),
    new Case(
      '$columns',
      '/* comment */$columns(from_OSName, count(*) c) FROM requests ANY INNER JOIN oses USING OS',
      '/* comment */SELECT t,' +
        ' groupArray((from_OSName, c)) AS groupArr' +
        ' FROM (' +
        ' SELECT $timeSeries AS t,' +
        ' from_OSName,' +
        ' count(*) c' +
        ' FROM requests' +
        ' ANY INNER JOIN oses USING OS' +
        ' WHERE $timeFilter' +
        ' GROUP BY t,' +
        ' from_OSName' +
        ' ORDER BY t,' +
        ' from_OSName)' +
        ' GROUP BY t' +
        ' ORDER BY t',
      SqlQueryMacros.columns
    ),
    new Case(
      '$perSecond',
      '/* comment */\n$perSecond(from_total, from_amount) FROM requests',
      '/* comment */\nSELECT t,' +
        ' if(runningDifference(max_0) < 0, nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_PerSecond,' +
        ' if(runningDifference(max_1) < 0, nan, runningDifference(max_1) / runningDifference(t/1000)) AS max_1_PerSecond' +
        ' FROM (' +
        ' SELECT $timeSeries AS t,' +
        ' max(from_total) AS max_0,' +
        ' max(from_amount) AS max_1' +
        ' FROM requests' +
        ' WHERE $timeFilter' +
        ' GROUP BY t' +
        ' ORDER BY t)',
      SqlQueryMacros.perSecond
    ),
    new Case(
      '$delta',
      '/* comment */\n$delta(from_total, from_amount) FROM requests',
      '/* comment */\nSELECT t,' +
        ' runningDifference(max_0) AS max_0_Delta,' +
        ' runningDifference(max_1) AS max_1_Delta' +
        ' FROM (' +
        ' SELECT $timeSeries AS t,' +
        ' max(from_total) AS max_0,' +
        ' max(from_amount) AS max_1' +
        ' FROM requests' +
        ' WHERE $timeFilter' +
        ' GROUP BY t' +
        ' ORDER BY t)',
      SqlQueryMacros.delta
    ),
    new Case(
      '$increase',
      '/* comment */\n$increase(from_total, from_amount) FROM requests',
      '/* comment */\nSELECT t,' +
        ' if(runningDifference(max_0) < 0, 0, runningDifference(max_0)) AS max_0_Increase,' +
        ' if(runningDifference(max_1) < 0, 0, runningDifference(max_1)) AS max_1_Increase' +
        ' FROM (' +
        ' SELECT $timeSeries AS t,' +
        ' max(from_total) AS max_0,' +
        ' max(from_amount) AS max_1' +
        ' FROM requests' +
        ' WHERE $timeFilter' +
        ' GROUP BY t' +
        ' ORDER BY t)',
      SqlQueryMacros.increase
    ),
    new Case(
      '$perSecondColumns',
      "/* comment */\n$perSecondColumns(concat('test',type) AS from_alias, from_total) FROM requests WHERE type IN ('udp', 'tcp')",
      '/* comment */\nSELECT t,' +
        ' groupArray((from_alias, max_0_PerSecond)) AS groupArr' +
        ' FROM (' +
        ' SELECT t,' +
        ' from_alias,' +
        ' if(runningDifference(max_0) < 0 OR neighbor(from_alias,-1,from_alias) != from_alias, nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_PerSecond' +
        ' FROM (' +
        ' SELECT $timeSeries AS t,' +
        " concat('test', type) AS from_alias," +
        ' max(from_total) AS max_0' +
        ' FROM requests' +
        ' WHERE $timeFilter' +
        " AND type IN ('udp', 'tcp')" +
        ' GROUP BY t, from_alias' +
        ' ORDER BY from_alias, t' +
        ')' +
        ')' +
        ' GROUP BY t' +
        ' ORDER BY t',
      SqlQueryMacros.perSecondColumns
    ),
    new Case(
      '$deltaColumns',
      "/* comment */\n$deltaColumns(concat('test',type) AS from_alias, from_total) FROM requests WHERE type IN ('udp', 'tcp')",
      '/* comment */\nSELECT t,' +
        ' groupArray((from_alias, max_0_Delta)) AS groupArr' +
        ' FROM (' +
        ' SELECT t,' +
        ' from_alias,' +
        ' if(neighbor(from_alias,-1,from_alias) != from_alias, 0, runningDifference(max_0)) AS max_0_Delta' +
        ' FROM (' +
        ' SELECT $timeSeries AS t,' +
        " concat('test', type) AS from_alias," +
        ' max(from_total) AS max_0' +
        ' FROM requests' +
        ' WHERE $timeFilter' +
        " AND type IN ('udp', 'tcp')" +
        ' GROUP BY t, from_alias' +
        ' ORDER BY from_alias, t' +
        ')' +
        ')' +
        ' GROUP BY t' +
        ' ORDER BY t',
      SqlQueryMacros.deltaColumns
    ),
    new Case(
      '$increaseColumns',
      "/* comment */\n$increaseColumns(concat('test',type) AS from_alias, from_total) FROM requests WHERE type IN ('udp', 'tcp')",
      '/* comment */\nSELECT t,' +
        ' groupArray((from_alias, max_0_Increase)) AS groupArr' +
        ' FROM (' +
        ' SELECT t,' +
        ' from_alias,' +
        ' if(runningDifference(max_0) < 0 OR neighbor(from_alias,-1,from_alias) != from_alias, 0, runningDifference(max_0)) AS max_0_Increase' +
        ' FROM (' +
        ' SELECT $timeSeries AS t,' +
        " concat('test', type) AS from_alias," +
        ' max(from_total) AS max_0' +
        ' FROM requests' +
        ' WHERE $timeFilter' +
        " AND type IN ('udp', 'tcp')" +
        ' GROUP BY t, from_alias' +
        ' ORDER BY from_alias, t' +
        ')' +
        ')' +
        ' GROUP BY t' +
        ' ORDER BY t',
      SqlQueryMacros.increaseColumns
    ),
  ];

  each(testCases, (tc) => {
    let ast = tc.scanner.toAST();
    tc.got = tc.fn(tc.query, ast);

    if (tc.got !== tc.expected) {
      console.log(tc.got);
      console.log(tc.expected);
    }
    describe(tc.name, () => {
      it('expects equality', () => {
        console.log('<<<<<<<<<', tc.fn.name);
        expect(tc.got).toEqual(tc.expected);
      });
    });
  });
});

/*
 check https://github.com/Altinity/clickhouse-grafana/issues/187
 check https://github.com/Altinity/clickhouse-grafana/issues/256
 check https://github.com/Altinity/clickhouse-grafana/issues/265
*/
describe('comments and $rate and from in field name', () => {
  const query =
    "/*comment1*/\n-- comment2\n/*\ncomment3\n */\n$rate(countIf(service_name='mysql' AND from_user='alice') AS mysql_alice, countIf(service_name='postgres') AS postgres)\n" +
    'FROM $table\n' +
    "WHERE from_user='bob'";
  const expQuery =
    "/*comment1*/\n-- comment2\n/*\ncomment3\n */\nSELECT t, mysql_alice/runningDifference(t/1000) mysql_aliceRate, postgres/runningDifference(t/1000) postgresRate FROM ( SELECT $timeSeries AS t, countIf(service_name = 'mysql' AND from_user = 'alice') AS mysql_alice, countIf(service_name = 'postgres') AS postgres FROM $table\nWHERE $timeFilter AND from_user='bob' GROUP BY t ORDER BY t)";
  const scanner = new Scanner(query);
  it('gets replaced with right FROM query', () => {
    expect(SqlQueryMacros.applyMacros(query, scanner.toAST())).toBe(expQuery);
  });
});

/* fix https://github.com/Altinity/clickhouse-grafana/issues/319 */
describe('columns + union all + with', () => {
  const query =
    '$columns(\n' +
    '  category,   \n' +
    '  sum(agg_value) as value\n' +
    ')\n' +
    'FROM (\n' +
    '\n' +
    ' SELECT\n' +
    '    $timeSeries as t,\n' +
    '    category,\n' +
    '    sum(too_big_value) as agg_value\n' +
    ' FROM $table\n' +
    ' WHERE $timeFilter\n' +
    ' GROUP BY t,category\n' +
    ' \n' +
    ' UNION ALL\n' +
    ' \n' +
    ' WITH (SELECT sum(too_big_value) FROM $table) AS total_value\n' +
    ' SELECT\n' +
    '    $timeSeries as t,\n' +
    '    category,\n' +
    '    sum(too_big_value) / total_value as agg_value\n' +
    ' FROM $table\n' +
    ' WHERE $timeFilter\n' +
    ' GROUP BY t,category\n' +
    ')';
  const expQuery =
    'SELECT t, groupArray((category, value)) AS groupArr FROM ( SELECT $timeSeries AS t, category, sum(agg_value) as value FROM (\n' +
    '\n' +
    ' SELECT\n' +
    '    $timeSeries as t,\n' +
    '    category,\n' +
    '    sum(too_big_value) as agg_value\n' +
    ' FROM $table\n' +
    ' WHERE $timeFilter AND $timeFilter\n' +
    ' GROUP BY t,category\n' +
    ' \n' +
    ' UNION ALL\n' +
    ' \n' +
    ' WITH (SELECT sum(too_big_value) FROM $table) AS total_value\n' +
    ' SELECT\n' +
    '    $timeSeries as t,\n' +
    '    category,\n' +
    '    sum(too_big_value) / total_value as agg_value\n' +
    ' FROM $table\n' +
    ' WHERE $timeFilter AND $timeFilter\n' +
    ' GROUP BY t,category\n' +
    ') GROUP BY t, category ORDER BY t, category) GROUP BY t ORDER BY t';
  const scanner = new Scanner(query);
  let ast = scanner.toAST();
  let actual = SqlQueryMacros.applyMacros(query, ast);
  it('gets replaced with right FROM query', () => {
    expect(actual).toBe(expQuery);
  });
});
