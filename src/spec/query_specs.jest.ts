import Scanner from '../datasource/scanner/scanner';
import { each } from 'lodash';
import SqlQueryMacros from '../datasource/sql-query/sql-query-macros';

class Case {
  name: string;
  got: string;
  gotWithWindow: string;
  expected: string;
  expectedWithWindow: string;
  fn: any;
  query: string;

  constructor(name: string, query: string, expected: string, expectedWithWindow: string, fn: any) {
    this.name = name;
    this.expected = expected;
    this.expectedWithWindow = expectedWithWindow;
    this.query = query;
    this.fn = fn;
    this.got = '';
    this.gotWithWindow = '';
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

      '/* comment */ SELECT t,' +
        ' from_good/((t - lagInFrame(t,1,0) OVER ())/1000) from_goodRate,' +
        ' from_bad/((t - lagInFrame(t,1,0) OVER ())/1000) from_badRate' +
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
      '$rated(countIf(Type = 200) AS from_good, countIf(Type != 200) AS from_bad) FROM requests',
      SqlQueryMacros.rate
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
      '$columnsMs',
      '/* comment */$columnsMs(from_OSName, count(*) c) FROM requests ANY INNER JOIN oses USING OS',
      '/* comment */SELECT t,' +
      ' groupArray((from_OSName, c)) AS groupArr' +
      ' FROM (' +
      ' SELECT $timeSeriesMs AS t,' +
      ' from_OSName,' +
      ' count(*) c' +
      ' FROM requests' +
      ' ANY INNER JOIN oses USING OS' +
      ' WHERE $timeFilterMs' +
      ' GROUP BY t,' +
      ' from_OSName' +
      ' ORDER BY t,' +
      ' from_OSName)' +
      ' GROUP BY t' +
      ' ORDER BY t',

      '/* comment */SELECT t,' +
      ' groupArray((from_OSName, c)) AS groupArr' +
      ' FROM (' +
      ' SELECT $timeSeriesMs AS t,' +
      ' from_OSName,' +
      ' count(*) c' +
      ' FROM requests' +
      ' ANY INNER JOIN oses USING OS' +
      ' WHERE $timeFilterMs' +
      ' GROUP BY t,' +
      ' from_OSName' +
      ' ORDER BY t,' +
      ' from_OSName)' +
      ' GROUP BY t' +
      ' ORDER BY t',
      SqlQueryMacros.columnsMs
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

      '/* comment */\nSELECT t,' +
        ' if(max_0 - lagInFrame(max_0,1,0) OVER () < 0, nan, (max_0 - lagInFrame(max_0,1,0) OVER ()) / ((t - lagInFrame(t,1,0) OVER ())/1000) ) AS max_0_PerSecond,' +
        ' if(max_1 - lagInFrame(max_1,1,0) OVER () < 0, nan, (max_1 - lagInFrame(max_1,1,0) OVER ()) / ((t - lagInFrame(t,1,0) OVER ())/1000) ) AS max_1_PerSecond' +
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

      '/* comment */\nSELECT t,' +
        ' max_0 - lagInFrame(max_0,1,0) OVER () AS max_0_Delta,' +
        ' max_1 - lagInFrame(max_1,1,0) OVER () AS max_1_Delta' +
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

      '/* comment */\nSELECT t,' +
        ' if((max_0 - lagInFrame(max_0,1,0) OVER ()) < 0, 0, max_0 - lagInFrame(max_0,1,0) OVER ()) AS max_0_Increase,' +
        ' if((max_1 - lagInFrame(max_1,1,0) OVER ()) < 0, 0, max_1 - lagInFrame(max_1,1,0) OVER ()) AS max_1_Increase' +
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

      '/* comment */ SELECT t,' +
        ' arrayMap(a -> (a.1, a.2/(t/1000 - lagInFrame(t/1000,1,0) OVER ())), groupArr)' +
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

      '/* comment */\nSELECT t,' +
        ' groupArray((from_alias, max_0_PerSecond)) AS groupArr' +
        ' FROM (' +
        ' SELECT t,' +
        ' from_alias,' +
        ' if((max_0 - lagInFrame(max_0,1,0) OVER ()) < 0 OR lagInFrame(from_alias,1,from_alias) OVER () != from_alias, nan, (max_0 - lagInFrame(max_0,1,0) OVER ()) / (t/1000 - lagInFrame(t/1000,1,0) OVER ())) AS max_0_PerSecond' +
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

      '/* comment */\nSELECT t,' +
        ' groupArray((from_alias, max_0_Delta)) AS groupArr' +
        ' FROM (' +
        ' SELECT t,' +
        ' from_alias,' +
        ' if(lagInFrame(from_alias,1,from_alias) OVER () != from_alias, 0, max_0 - lagInFrame(max_0,1,0) OVER ()) AS max_0_Delta' +
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

      '/* comment */\nSELECT t,' +
        ' groupArray((from_alias, max_0_Increase)) AS groupArr' +
        ' FROM (' +
        ' SELECT t,' +
        ' from_alias,' +
        ' if((max_0 - lagInFrame(max_0,1,0) OVER ()) < 0 OR lagInFrame(from_alias,1,from_alias) OVER () != from_alias, 0, max_0 - lagInFrame(max_0,1,0) OVER ()) AS max_0_Increase' +
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
    new Case(
      '$rateColumnsAggregated',

      '/* comment */ $rateColumnsAggregated(datacenter, concat(datacenter,interface) AS dc_interface, sum, tx_bytes * 1024 AS tx_kbytes, sum, max(rx_bytes) AS rx_bytes) '+
      " FROM traffic WHERE datacenter = 'dc1' HAVING rx_bytes > $interval",

      '/* comment */ SELECT t, datacenter, sum(tx_kbytesRate) AS tx_kbytesRateAgg, sum(rx_bytesRate) AS rx_bytesRateAgg'+
      ' FROM'+
      ' ('+
      '  SELECT t, datacenter, dc_interface, tx_kbytes / runningDifference(t / 1000) AS tx_kbytesRate, rx_bytes / runningDifference(t / 1000) AS rx_bytesRate '+
      ' FROM ('+
      '   SELECT $timeSeries AS t, datacenter, concat(datacenter, interface) AS dc_interface,'+
      ' max(tx_bytes * 1024) AS tx_kbytes, max(rx_bytes) AS rx_bytes '+
      '  FROM traffic'+
      ' WHERE $timeFilter'+
      " AND datacenter = 'dc1'  "+
      ' GROUP BY datacenter, dc_interface, t'+
      '  HAVING rx_bytes > $interval  '+
      ' ORDER BY datacenter, dc_interface, t ' +
      ' ) '+
      ')'+
      ' GROUP BY datacenter, t'+
      ' ORDER BY datacenter, t',

      '/* comment */ SELECT t, datacenter, sum(tx_kbytesRate) AS tx_kbytesRateAgg, sum(rx_bytesRate) AS rx_bytesRateAgg'+
      ' FROM'+
      ' ('+
      '  SELECT t, datacenter, dc_interface, ' +
      'tx_kbytes / (t/1000 - lagInFrame(t/1000,1,0) OVER ()) AS tx_kbytesRate, ' +
      'rx_bytes / (t/1000 - lagInFrame(t/1000,1,0) OVER ()) AS rx_bytesRate '+
      ' FROM ('+
      '   SELECT $timeSeries AS t, datacenter, concat(datacenter, interface) AS dc_interface,'+
      ' max(tx_bytes * 1024) AS tx_kbytes, max(rx_bytes) AS rx_bytes '+
      '  FROM traffic'+
      ' WHERE $timeFilter'+
      " AND datacenter = 'dc1'  "+
      ' GROUP BY datacenter, dc_interface, t'+
      '  HAVING rx_bytes > $interval  '+
      ' ORDER BY datacenter, dc_interface, t ' +
      ' ) '+
      ')'+
      ' GROUP BY datacenter, t'+
      ' ORDER BY datacenter, t',

      SqlQueryMacros.rateColumnsAggregated
    ),
    new Case(
      '$perSecondColumnsAggregated',
      '/* comment */ $perSecondColumnsAggregated(datacenter, concat(datacenter,interface) AS dc_interface, sum, tx_bytes * 1024 AS tx_kbytes, sum, max(rx_bytes) AS rx_bytes) '+
      " FROM traffic WHERE datacenter = 'dc1' HAVING rx_bytes > $interval",

      '/* comment */ SELECT t, datacenter, sum(tx_kbytesPerSecond) AS tx_kbytesPerSecondAgg, sum(rx_bytesPerSecond) AS rx_bytesPerSecondAgg'+
      ' FROM'+
      ' ('+
      '  SELECT t, datacenter, dc_interface,' +
      ' if(runningDifference(tx_kbytes) < 0 OR neighbor(dc_interface,-1,dc_interface) != dc_interface, nan, runningDifference(tx_kbytes) / runningDifference(t / 1000)) AS tx_kbytesPerSecond,' +
      ' if(runningDifference(rx_bytes) < 0 OR neighbor(dc_interface,-1,dc_interface) != dc_interface, nan, runningDifference(rx_bytes) / runningDifference(t / 1000)) AS rx_bytesPerSecond'+
      '  FROM ('+
      '   SELECT $timeSeries AS t, datacenter, concat(datacenter, interface) AS dc_interface,'+
      ' max(tx_bytes * 1024) AS tx_kbytes, max(rx_bytes) AS rx_bytes '+
      '  FROM traffic'+
      ' WHERE $timeFilter'+
      " AND datacenter = 'dc1'  "+
      ' GROUP BY datacenter, dc_interface, t'+
      '  HAVING rx_bytes > $interval  '+
      ' ORDER BY datacenter, dc_interface, t ' +
      ' ) '+
      ')'+
      ' GROUP BY datacenter, t'+
      ' ORDER BY datacenter, t',

      '/* comment */ SELECT t, datacenter, sum(tx_kbytesPerSecond) AS tx_kbytesPerSecondAgg, sum(rx_bytesPerSecond) AS rx_bytesPerSecondAgg'+
      ' FROM'+
      ' ('+
      '  SELECT t, datacenter, dc_interface,' +
      ' if((tx_kbytes - lagInFrame(tx_kbytes,1,0) OVER ()) < 0 OR lagInFrame(dc_interface,1,dc_interface) OVER () != dc_interface, nan, (tx_kbytes - lagInFrame(tx_kbytes,1,0) OVER ()) / (t/1000 - lagInFrame(t/1000,1,0) OVER ())) AS tx_kbytesPerSecond,' +
      ' if((rx_bytes - lagInFrame(rx_bytes,1,0) OVER ()) < 0 OR lagInFrame(dc_interface,1,dc_interface) OVER () != dc_interface, nan, (rx_bytes - lagInFrame(rx_bytes,1,0) OVER ()) / (t/1000 - lagInFrame(t/1000,1,0) OVER ())) AS rx_bytesPerSecond'+
      '  FROM ('+
      '   SELECT $timeSeries AS t, datacenter, concat(datacenter, interface) AS dc_interface,'+
      ' max(tx_bytes * 1024) AS tx_kbytes, max(rx_bytes) AS rx_bytes '+
      '  FROM traffic'+
      ' WHERE $timeFilter'+
      " AND datacenter = 'dc1'  "+
      ' GROUP BY datacenter, dc_interface, t'+
      '  HAVING rx_bytes > $interval  '+
      ' ORDER BY datacenter, dc_interface, t ' +
      ' ) '+
      ')'+
      ' GROUP BY datacenter, t'+
      ' ORDER BY datacenter, t',

      SqlQueryMacros.perSecondColumnsAggregated
    ),
    new Case(
      '$increaseColumnsAggregated',
      '/* comment */ $increaseColumnsAggregated(datacenter, concat(datacenter,interface) AS dc_interface, sum, tx_bytes * 1024 AS tx_kbytes, sum, max(rx_bytes) AS rx_bytes) '+
      " FROM traffic WHERE datacenter = 'dc1' HAVING rx_bytes > $interval",

      '/* comment */ SELECT t, datacenter, sum(tx_kbytesIncrease) AS tx_kbytesIncreaseAgg, sum(rx_bytesIncrease) AS rx_bytesIncreaseAgg'+
      ' FROM'+
      ' ('+
      '  SELECT t, datacenter, dc_interface,' +
      ' if(runningDifference(tx_kbytes) < 0 OR neighbor(dc_interface,-1,dc_interface) != dc_interface, nan, runningDifference(tx_kbytes) / 1) AS tx_kbytesIncrease,' +
      ' if(runningDifference(rx_bytes) < 0 OR neighbor(dc_interface,-1,dc_interface) != dc_interface, nan, runningDifference(rx_bytes) / 1) AS rx_bytesIncrease'+
      '  FROM ('+
      '   SELECT $timeSeries AS t, datacenter, concat(datacenter, interface) AS dc_interface,'+
      ' max(tx_bytes * 1024) AS tx_kbytes, max(rx_bytes) AS rx_bytes '+
      '  FROM traffic'+
      ' WHERE $timeFilter'+
      " AND datacenter = 'dc1'  "+
      ' GROUP BY datacenter, dc_interface, t'+
      '  HAVING rx_bytes > $interval  '+
      ' ORDER BY datacenter, dc_interface, t ' +
      ' ) '+
      ')'+
      ' GROUP BY datacenter, t'+
      ' ORDER BY datacenter, t',

      '/* comment */ SELECT t, datacenter, sum(tx_kbytesIncrease) AS tx_kbytesIncreaseAgg, sum(rx_bytesIncrease) AS rx_bytesIncreaseAgg'+
      ' FROM'+
      ' ('+
      '  SELECT t, datacenter, dc_interface,' +
      ' if((tx_kbytes - lagInFrame(tx_kbytes,1,0) OVER ()) < 0 OR lagInFrame(dc_interface,1,dc_interface) OVER () != dc_interface, nan, (tx_kbytes - lagInFrame(tx_kbytes,1,0) OVER ()) / 1) AS tx_kbytesIncrease,' +
      ' if((rx_bytes - lagInFrame(rx_bytes,1,0) OVER ()) < 0 OR lagInFrame(dc_interface,1,dc_interface) OVER () != dc_interface, nan, (rx_bytes - lagInFrame(rx_bytes,1,0) OVER ()) / 1) AS rx_bytesIncrease'+
      '  FROM ('+
      '   SELECT $timeSeries AS t, datacenter, concat(datacenter, interface) AS dc_interface,'+
      ' max(tx_bytes * 1024) AS tx_kbytes, max(rx_bytes) AS rx_bytes '+
      '  FROM traffic'+
      ' WHERE $timeFilter'+
      " AND datacenter = 'dc1'  "+
      ' GROUP BY datacenter, dc_interface, t'+
      '  HAVING rx_bytes > $interval  '+
      ' ORDER BY datacenter, dc_interface, t ' +
      ' ) '+
      ')'+
      ' GROUP BY datacenter, t'+
      ' ORDER BY datacenter, t',

      SqlQueryMacros.increaseColumnsAggregated
    ),
    new Case(
      '$deltaColumnsAggregated',
      '/* comment */ $deltaColumnsAggregated(datacenter, concat(datacenter,interface) AS dc_interface, sum, tx_bytes * 1024 AS tx_kbytes, sum, max(rx_bytes) AS rx_bytes) '+
      " FROM traffic WHERE datacenter = 'dc1' HAVING rx_bytes > $interval",

      '/* comment */ SELECT t, datacenter, sum(tx_kbytesDelta) AS tx_kbytesDeltaAgg, sum(rx_bytesDelta) AS rx_bytesDeltaAgg'+
      ' FROM'+
      ' ('+
      '  SELECT t, datacenter, dc_interface,' +
      ' if(neighbor(dc_interface,-1,dc_interface) != dc_interface, 0, runningDifference(tx_kbytes) / 1) AS tx_kbytesDelta,' +
      ' if(neighbor(dc_interface,-1,dc_interface) != dc_interface, 0, runningDifference(rx_bytes) / 1) AS rx_bytesDelta'+
      '  FROM ('+
      '   SELECT $timeSeries AS t, datacenter, concat(datacenter, interface) AS dc_interface,'+
      ' max(tx_bytes * 1024) AS tx_kbytes, max(rx_bytes) AS rx_bytes '+
      '  FROM traffic'+
      ' WHERE $timeFilter'+
      " AND datacenter = 'dc1'  "+
      ' GROUP BY datacenter, dc_interface, t'+
      '  HAVING rx_bytes > $interval  '+
      ' ORDER BY datacenter, dc_interface, t ' +
      ' ) '+
      ')'+
      ' GROUP BY datacenter, t'+
      ' ORDER BY datacenter, t',

      '/* comment */ SELECT t, datacenter, sum(tx_kbytesDelta) AS tx_kbytesDeltaAgg, sum(rx_bytesDelta) AS rx_bytesDeltaAgg'+
      ' FROM'+
      ' ('+
      '  SELECT t, datacenter, dc_interface,' +
      ' if(lagInFrame(dc_interface,1,dc_interface) OVER () != dc_interface, 0, tx_kbytes - lagInFrame(tx_kbytes,1,0) OVER ()) AS tx_kbytesDelta,' +
      ' if(lagInFrame(dc_interface,1,dc_interface) OVER () != dc_interface, 0, rx_bytes - lagInFrame(rx_bytes,1,0) OVER ()) AS rx_bytesDelta'+
      '  FROM ('+
      '   SELECT $timeSeries AS t, datacenter, concat(datacenter, interface) AS dc_interface,'+
      ' max(tx_bytes * 1024) AS tx_kbytes, max(rx_bytes) AS rx_bytes '+
      '  FROM traffic'+
      ' WHERE $timeFilter'+
      " AND datacenter = 'dc1'  "+
      ' GROUP BY datacenter, dc_interface, t'+
      '  HAVING rx_bytes > $interval  '+
      ' ORDER BY datacenter, dc_interface, t ' +
      ' ) '+
      ')'+
      ' GROUP BY datacenter, t'+
      ' ORDER BY datacenter, t',

      SqlQueryMacros.deltaColumnsAggregated
    ),
  ];

  each(testCases, (tc) => {
    let ast = new Scanner(tc.query).toAST();
    tc.got = tc.fn(tc.query, ast, false);

    ast = new Scanner(tc.query).toAST();
    tc.gotWithWindow = tc.fn(tc.query, ast, true);

    describe(tc.name, () => {
      it('expects without window functions', () => {
        expect(tc.got).toEqual(tc.expected);
      });
      it('expects with window functions', () => {
        expect(tc.gotWithWindow).toEqual(tc.expectedWithWindow);
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
    expect(SqlQueryMacros.applyMacros(query, scanner.toAST(), false)).toBe(expQuery);
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
  let actual = SqlQueryMacros.applyMacros(query, ast, false);
  it('gets replaced with right FROM query', () => {
    expect(actual).toBe(expQuery);
  });
});

/* fix https://github.com/Altinity/clickhouse-grafana/issues/409 */
describe('columns + order by with fill', () => {
  const query =
    '$columns(\n' +
    '  category,   \n' +
    '  sum(agg_value) as value\n' +
    ')\n' +
    'FROM $table\n' +
    'WHERE category=\'test\'\n' +
    'GROUP BY t, category\n' +
    'HAVING value > 100\n' +
    'ORDER BY t, category\n';
  const expQuery =
    'SELECT t, groupArray((category, value)) AS groupArr FROM ( SELECT $timeSeries AS t, category, sum(agg_value) as value FROM $table\n' +
    'WHERE $timeFilter AND category=\'test\'' +
    ' GROUP BY t, category HAVING value > 100 ORDER BY t, category\n' +
    ') GROUP BY t ORDER BY t';
  const scanner = new Scanner(query);
  let ast = scanner.toAST();
  let actual = SqlQueryMacros.applyMacros(query, ast, false);
  it('gets replaced with right FROM query', () => {
    expect(actual).toBe(expQuery);
  });
});

