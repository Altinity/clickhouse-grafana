import Scanner from '../datasource/scanner/scanner';

describe('scanner:', () => {
  describe('AST case 1', () => {
    let query =
        'SELECT EventDate, col1, col2, toUInt32(col1 > 0 ? col2/col1*10000 : 0)/100 AS percent ' +
        'FROM ( SELECT   EventDate,   col1,   countIf(col2 GLOBAL IN some_table) AS col2_shared,   ' +
        'count() AS col_count,   uniqCombinedIf(col3, col3 GLOBAL IN some_table) AS col3_shared,   ' +
        "uniqCombined(col3) AS unique_col3 FROM   general_table_all PREWHERE   Event IN ('type1')   " +
        "AND EventDate <= '2016-12-20'   WHERE     (EventDate, col1) GLOBAL IN some_table GROUP BY   " +
        'EventDate, col1) GLOBAL ANY LEFT JOIN ( SELECT   EventDate,   col1,   countIf(col2 GLOBAL IN some_table) ' +
        'AS col2_shared,   count() AS col_count,   uniqCombinedIf(col3, col3 GLOBAL IN some_table) AS col3_shared,   ' +
        "uniqCombined(col3) AS unique_col3 FROM   general_table_all PREWHERE   Event IN ('type2')   " +
        "AND EventDate <= '2016-12-20' WHERE   (EventDate, col1) GLOBAL IN some_table   " +
        'AND col4 GLOBAL IN some_table GROUP BY   EventDate, col1) USING EventDate, col1 ' +
        'ORDER BY EventDate, col1 FORMAT CSVWithNames',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['EventDate', 'col1', 'col2', 'toUInt32(col1 > 0 ? col2 / col1 * 10000 : 0) / 100 AS percent'],
      from: {
        root: [],
        select: [
          'EventDate',
          'col1',
          'countIf(col2 GLOBAL IN some_table) AS col2_shared',
          'count() AS col_count',
          'uniqCombinedIf(col3, col3 GLOBAL IN some_table) AS col3_shared',
          'uniqCombined(col3) AS unique_col3',
        ],
        from: ['general_table_all'],
        prewhere: ["Event IN ('type1')", "AND EventDate <= '2016-12-20'"],
        where: ['(EventDate, col1) GLOBAL IN some_table'],
        'group by': ['EventDate', 'col1'],
      },
      join: [
        {
          aliases: [],
          on: [],
          source: {
            from: ['general_table_all'],
            'group by': ['EventDate', 'col1'],
            prewhere: ["Event IN ('type2')", "AND EventDate <= '2016-12-20'"],
            root: [],
            select: [
              'EventDate',
              'col1',
              'countIf(col2 GLOBAL IN some_table) AS col2_shared',
              'count() AS col_count',
              'uniqCombinedIf(col3, col3 GLOBAL IN some_table) AS col3_shared',
              'uniqCombined(col3) AS unique_col3',
            ],
            where: ['(EventDate, col1) GLOBAL IN some_table', 'AND col4 GLOBAL IN some_table'],
          },
          type: 'GLOBAL ANY LEFT JOIN',
          using: ['EventDate', 'col1'],
        },
      ],
      'order by': ['EventDate', 'col1'],
      format: ['CSVWithNames'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 2', () => {
    let query =
        "$rateColumns((AppType = '' ? 'undefined' : AppType) type, sum(Hits) hits) " +
        "FROM table_all  WHERE Event = 'request' AND (-1 IN ($template) OR col IN ($template)) HAVING hits > $interval",
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      $rateColumns: ["(AppType = '' ? 'undefined' : AppType) type", 'sum(Hits) hits'],
      select: [],
      from: ['table_all'],
      where: ["Event = 'request'", 'AND(- 1 IN ($template) OR col IN ($template))'],
      having: ['hits > $interval'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 3', () => {
    let query =
        'SELECT $timeSeries as t, count() AS `SMALL` FROM db.table ' +
        'WHERE W0 <= 400 AND LastEvent>=1 AND $timeFilter GROUP BY t ORDER BY t',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['$timeSeries as t', 'count() AS `SMALL`'],
      from: ['db.table'],
      where: ['W0 <= 400', 'AND LastEvent >= 1', 'AND $timeFilter'],
      'group by': ['t'],
      'order by': ['t'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 4', () => {
    let query =
        'SELECT LogTime, Entity, Message FROM $table ' +
        'ANY LEFT JOIN (SELECT * FROM default.log_events) USING EventCode ' +
        'WHERE $timeFilter ORDER BY LogTime DESC LIMIT $__limit',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['LogTime', 'Entity', 'Message'],
      from: ['$table'],
      join: [
        {
          aliases: [],
          on: [],
          source: {
            from: ['default.log_events'],
            root: [],
            select: ['*'],
          },
          type: 'ANY LEFT JOIN',
          using: ['EventCode'],
        },
      ],
      where: ['$timeFilter'],
      'order by': ['LogTime DESC'],
      limit: ['$__limit'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 5', () => {
    let query = 'SELECT select FROM $table',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['select'],
      from: ['$table'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 6', () => {
    let query = 'SELECT 1, select FROM $table',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['1', 'select'],
      from: ['$table'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 7', () => {
    let query = "SELECT t, countIf(Format='1') FROM $table",
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['t', "countIf(Format = '1')"],
      from: ['$table'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 8', () => {
    let query = 'SELECT from FROM from',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['from'],
      from: ['from'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 9', () => {
    let query =
        'SELECT' +
        '  t, groupArray((process_name, duration)) as groupArr ' +
        ' FROM (' +
        '  SELECT' +
        '    (intDiv(toUInt32(event_datetime), 5) * 5) * 1000 as t,' +
        '    process_name,' +
        '    quantile(0.95)(duration) duration' +
        '  FROM xx ' +
        '  WHERE event_date >= toDate(1514966917) AND event_datetime >= toDateTime(1514966917)' +
        '  GROUP BY t, process_name  ORDER BY t, process_name' +
        ') GROUP BY t ORDER BY t FORMAT JSON',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['t', 'groupArray((process_name, duration)) as groupArr'],
      from: {
        root: [],
        select: [
          '(intDiv(toUInt32(event_datetime), 5) * 5) * 1000 as t',
          'process_name',
          'quantile(0.95)(duration) duration',
        ],
        from: ['xx'],
        where: ['event_date >= toDate(1514966917)', 'AND event_datetime >= toDateTime(1514966917)'],
        'group by': ['t', 'process_name'],
        'order by': ['t', 'process_name'],
      },
      'group by': ['t'],
      'order by': ['t'],
      format: ['JSON'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 10(array)', () => {
    let query = "SELECT count() FROM $table WHERE type[1] = 'key' AND zone['City'] = 'Kyiv'",
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['count()'],
      from: ['$table'],
      where: ["type[1] = 'key'", "AND zone['City'] = 'Kyiv'"],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 11(union all)', () => {
    let query = 'SELECT a, b FROM table1 UNION ALL select c, d from table2 UNION ALL select e, f from table3',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['a', 'b'],
      from: ['table1'],
      'union all': [
        {
          root: [],
          select: ['c', 'd'],
          from: ['table2'],
        },
        {
          root: [],
          select: ['e', 'f'],
          from: ['table3'],
        },
      ],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 12(union all closure)', () => {
    let query = 'SELECT * FROM (select c, d from table2 UNION ALL select e, f from table3) ORDER BY c',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['*'],
      from: {
        root: [],
        select: ['c', 'd'],
        from: ['table2'],
        'union all': [
          {
            root: [],
            select: ['e', 'f'],
            from: ['table3'],
          },
        ],
      },
      'order by': ['c'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 13(partial statement match)', () => {
    let query = 'SELECT $timeSeries as t, count() as formatt FROM $table WHERE $timeFilter GROUP BY t ORDER BY t',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['$timeSeries as t', 'count() as formatt'],
      from: ['$table'],
      where: ['$timeFilter'],
      'group by': ['t'],
      'order by': ['t'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 14(quoted literals)', () => {
    let query =
        'SELECT $timeSeries as "t", count() as "formatt" FROM $table WHERE $timeFilter GROUP BY "t" ORDER BY "t"',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['$timeSeries as "t"', 'count() as "formatt"'],
      from: ['$table'],
      where: ['$timeFilter'],
      'group by': ['"t"'],
      'order by': ['"t"'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 15 (escaped quotes inside quotes)', () => {
    let query = 'SELECT now() AS t, \'test\\\'value\' AS v FROM $table WHERE v="test\\"field"',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['now() AS t', "'test\\'value' AS v"],
      from: ['$table'],
      where: ['v = "test\\"field"'],
    };
    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 16 (subquery + alias)', () => {
    let query =
        'SELECT t2.service_name, sum(1.05*rand()) AS test ' +
        'FROM (SELECT event_time, service_name FROM default.test_grafana) AS t2 ' +
        'WHERE $timeFilter ' +
        'GROUP BY service_name ' +
        'ORDER BY test DESC',
      scanner = new Scanner(query);

    let expectedAST = {
      from: {
        root: [],
        select: ['event_time', 'service_name'],
        from: ['default.test_grafana'],
        aliases: ['AS t2'],
      },
      'group by': ['service_name'],
      'order by': ['test DESC'],
      root: [],
      select: ['t2.service_name', 'sum(1.05 * rand()) AS test'],
      where: ['$timeFilter'],
    };
    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 17 (subquery + multiple joins)', () => {
    let query =
        'SELECT t1.service_name, sum(1.05*rand()) AS test ' +
        'FROM (SELECT DISTINCT service_name FROM default.test_grafana) AS t2 ' +
        'INNER JOIN $table AS t1 ' +
        'ON (t2.service_name=t1.service_name AND 1=1) ' +
        'CROSS JOIN (SELECT DISTINCT service_name FROM default.test_grafana) AS t3 ' +
        'ON t3.service_name=t1.service_name AND 1=1 ' +
        'ANY JOIN default.test_grafana AS t4 ' +
        'USING service_name ' +
        'WHERE $timeFilter ' +
        'GROUP BY t1.service_name ORDER BY test DESC',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['t1.service_name', 'sum(1.05 * rand()) AS test'],
      from: {
        from: ['default.test_grafana'],
        root: [],
        select: ['DISTINCT service_name'],
        aliases: ['AS t2'],
      },
      join: [
        {
          source: ['$table'],
          type: 'INNER JOIN',
          aliases: ['AS', 't1'],
          on: ['(t2.service_name=t1.service_name AND 1=1)'],
          using: [],
        },
        {
          source: {
            root: [],
            select: ['DISTINCT service_name'],
            from: ['default.test_grafana'],
          },
          type: 'CROSS JOIN',
          aliases: ['AS', 't3'],
          on: ['t3.service_name=t1.service_name AND 1=1'],
          using: [],
        },
        {
          source: ['default.test_grafana'],
          type: 'ANY JOIN',
          aliases: ['AS', 't4'],
          on: [],
          using: ['service_name'],
        },
      ],
      where: ['$timeFilter'],
      'group by': ['t1.service_name'],
      'order by': ['test DESC'],
    };
    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  describe('AST case 18 (comment + macros)', () => {
    let query =
        '/* test comment1 */\n' +
        '-- test comment2\n' +
        '/* \n' +
        '  test multiline comment3\n' +
        '*/  \n' +
        "$rate(countIf(service_name='mysql' AND from_user='alice') AS mysql_alice, countIf(service_name='postgres') AS postgres) \n" +
        'FROM $table\n' +
        "WHERE from_user='bob' /* comment after query */",
      scanner = new Scanner(query);

    let expectedAST = {
      root: ['/* test comment1 */\n' + '-- test comment2\n' + '/* \n' + '  test multiline comment3\n' + '*/\n'],
      select: [],
      $rate: [
        "countIf(service_name = 'mysql' AND from_user = 'alice') AS mysql_alice",
        "countIf(service_name = 'postgres') AS postgres",
      ],
      from: ['$table'],
      where: ["from_user = 'bob'/* comment after query */\n"],
    };
    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  /* fix https://github.com/Altinity/clickhouse-grafana/issues/319 */
  describe('AST case 19 ($columns + union all + with + sub query)', () => {
    let query =
        '$columns(\n' +
        '  service_name,   \n' +
        '  sum(agg_value) as value\n' +
        ')\n' +
        'FROM (\n' +
        '\n' +
        ' SELECT\n' +
        '    $timeSeries as t,\n' +
        '    service_name,\n' +
        '    sum(too_big_value) as agg_value\n' +
        ' FROM $table\n' +
        ' WHERE $timeFilter\n' +
        ' GROUP BY t,service_name\n' +
        ' \n' +
        ' UNION ALL\n' +
        ' \n' +
        ' WITH (SELECT sum(too_big_value) FROM $table) AS total_value\n' +
        ' SELECT\n' +
        '    $timeSeries as t,\n' +
        '    service_name,\n' +
        '    sum(too_big_value) / total_value as agg_value\n' +
        ' FROM $table\n' +
        ' WHERE $timeFilter\n' +
        ' GROUP BY t,service_name\n' +
        ')',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: [],
      $columns: ['service_name', 'sum(agg_value) as value'],
      from: {
        root: [],
        select: ['$timeSeries as t', 'service_name', 'sum(too_big_value) as agg_value'],
        from: ['$table'],
        'group by': ['t', 'service_name'],
        'union all': [
          {
            from: ['$table'],
            'group by': ['t', 'service_name'],
            root: [],
            select: ['$timeSeries as t', 'service_name', 'sum(too_big_value) / total_value as agg_value'],
            where: ['$timeFilter'],
            with: ['(SELECT sum(too_big_value) FROM $table) AS total_value'],
          },
        ],
        where: ['$timeFilter'],
      },
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  /* fix https://github.com/Altinity/clickhouse-grafana/issues/374 */
  describe('AST case 20 (`--` inside of quotes)', () => {
    let query =
        '--test one line comment1\n' +
        'SELECT *\n' +
        'FROM $table\n' +
        "WHERE title='-- test not comment1' -- test inline comment1\n" +
        "AND user_info='test -- not comment2' -- test inline comment2",
      scanner = new Scanner(query);

    let expectedAST = {
      root: ['--test one line comment1\n'],
      select: ['*'],
      from: ['$table'],
      where: [
        "title = '-- test not comment1'-- test inline comment1\n",
        "AND user_info = 'test -- not comment2'-- test inline comment2\n",
      ],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
      expect(Scanner.RemoveComments(query)).toEqual(
        '\n' +
          'SELECT *\n' +
          'FROM $table\n' +
          "WHERE title='-- test not comment1' \n" +
          "AND user_info='test -- not comment2' "
      );
    });
  });

  /* fix https://github.com/Altinity/clickhouse-grafana/issues/422 */
  describe('AST case 21 (adhoc + ORDER BY ... WITH FILL)', () => {
    let query =
        'SELECT\n' +
        '    $timeSeries as t,\n' +
        '    sum(too_big_value) * 8 / $interval AS B\n' +
        'FROM $table\n' +
        '\n' +
        'WHERE\n' +
        '    event_time BETWEEN $from AND $to\n' +
        '    $adhoc \n' +
        'GROUP BY t\n' +
        'ORDER BY t WITH FILL STEP ($interval*1000*5)',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      select: ['$timeSeries as t', 'sum(too_big_value) * 8 / $interval AS B'],
      from: ['$table'],
      where: ['event_time BETWEEN $from', 'AND $to $adhoc'],
      'group by': ['t'],
      'order by': ['t WITH FILL STEP($interval * 1000 * 5)'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });

  /* fix https://github.com/Altinity/clickhouse-grafana/issues/421 */
  describe('AST case 22 (WITH + adhoc + SELECT x IN ( ... )', () => {
    let query =
        'WITH topx AS (\n' +
        "   SELECT DISTINCT CASE WHEN service_name = '' THEN 'other' ELSE service_name END AS filter, count() AS cnt \n" +
        '   FROM $table WHERE $timeFilter AND $adhoc  GROUP BY service_name \n' +
        '   ORDER BY cnt DESC LIMIT 10\n' +
        ')\n' +
        '\n' +
        'SELECT\n' +
        '    $timeSeries as t,\n' +
        "    CASE WHEN service_name IN (SELECT filter FROM topx) THEN service_name ELSE 'other' END AS spl,\n" +
        '    count()\n' +
        'FROM $table\n' +
        '\n' +
        'WHERE $timeFilter AND $adhoc\n' +
        'GROUP BY t, spl\n' +
        'ORDER BY t, spl\n',
      scanner = new Scanner(query);

    let expectedAST = {
      root: [],
      with: [
        "topx AS(SELECT DISTINCT CASE WHEN service_name = '' THEN 'other' ELSE service_name END AS filter, count() AS cnt FROM $table WHERE $timeFilter AND $adhoc GROUP BY service_name ORDER BY cnt DESC LIMIT 10)",
      ],
      select: [
        '$timeSeries as t',
        'CASE WHEN service_name IN (\n' +
          '    SELECT filter\n' +
          '\n' +
          '    FROM topx\n' +
          ") THEN service_name ELSE 'other' END AS spl",
        'count()',
      ],
      from: ['$table'],
      where: ['$timeFilter', 'AND $adhoc'],
      'group by': ['t', 'spl'],
      'order by': ['t', 'spl'],
    };

    it('expects equality', () => {
      expect(scanner.toAST()).toEqual(expectedAST);
    });
  });
});
