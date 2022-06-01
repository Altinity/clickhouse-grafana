package main

import (
	"encoding/json"
	"fmt"
	"github.com/stretchr/testify/require"
	"reflect"
	"sort"
	"testing"
	"time"
)

type macrosTestCase struct {
	name     string
	query    string
	got      string
	expected string
	scanner  EvalQueryScanner
	fn       func(string, *EvalAST) (string, error)
}

func newMacrosTestCase(name, query, expected string, fn func(string, *EvalAST) (string, error)) macrosTestCase {
	return macrosTestCase{
		name:     name,
		query:    query,
		expected: expected,
		scanner:  newScanner(query),
		fn:       fn,
	}
}

func TestMacrosBuilder(t *testing.T) {
	q := EvalQuery{}
	testCases := []macrosTestCase{
		newMacrosTestCase(
			"$rate",
			"/* comment */ $rate(countIf(Type = 200) AS from_good, countIf(Type != 200) AS from_bad) FROM requests",
			"/* comment */ SELECT t,"+
				" from_good/runningDifference(t/1000) from_goodRate,"+
				" from_bad/runningDifference(t/1000) from_badRate"+
				" FROM ("+
				" SELECT $timeSeries AS t,"+
				" countIf(Type = 200) AS from_good,"+
				" countIf(Type != 200) AS from_bad"+
				" FROM requests"+
				" WHERE $timeFilter"+
				" GROUP BY t"+
				" ORDER BY t)",
			q.rate,
		),
		newMacrosTestCase(
			"$rate negative",
			"$rated(countIf(Type = 200) AS from_good, countIf(Type != 200) AS from_bad) FROM requests",
			"$rated(countIf(Type = 200) AS from_good, countIf(Type != 200) AS from_bad) FROM requests",
			q.rate,
		),
		newMacrosTestCase(
			"$rateColumns",
			"/* comment */ $rateColumns((AppType = '' ? 'undefined' : AppType) from_type, sum(Hits) from_hits) "+
				" FROM table_all WHERE Event = 'request' AND (-1 IN ($template) OR col IN ($template)) HAVING hits > $interval",
			"/* comment */ SELECT t,"+
				" arrayMap(a -> (a.1, a.2/runningDifference( t/1000 )), groupArr)"+
				" FROM"+
				" (SELECT t,"+
				" groupArray((from_type, from_hits)) AS groupArr"+
				" FROM ("+
				" SELECT $timeSeries AS t,"+
				" (AppType = '' ? 'undefined' : AppType) from_type,"+
				" sum(Hits) from_hits"+
				" FROM table_all"+
				" WHERE $timeFilter"+
				" AND Event = 'request' AND (-1 IN ($template) OR col IN ($template))"+
				" GROUP BY t, from_type"+
				" HAVING hits > $interval"+
				" ORDER BY t, from_type)"+
				" GROUP BY t"+
				" ORDER BY t)",
			q.rateColumns,
		),
		newMacrosTestCase(
			"$columns",
			"/* comment */$columns(from_OSName, count(*) c) FROM requests ANY INNER JOIN oses USING OS",
			"/* comment */SELECT t,"+
				" groupArray((from_OSName, c)) AS groupArr"+
				" FROM ("+
				" SELECT $timeSeries AS t,"+
				" from_OSName,"+
				" count(*) c"+
				" FROM requests"+
				" ANY INNER JOIN oses USING OS"+
				" WHERE $timeFilter"+
				" GROUP BY t,"+
				" from_OSName"+
				" ORDER BY t,"+
				" from_OSName)"+
				" GROUP BY t"+
				" ORDER BY t",
			q.columns,
		),
		newMacrosTestCase(
			"$perSecond",
			"/* comment */\n$perSecond(from_total, from_amount) FROM requests",
			"/* comment */\nSELECT t,"+
				" if(runningDifference(max_0) < 0, nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate,"+
				" if(runningDifference(max_1) < 0, nan, runningDifference(max_1) / runningDifference(t/1000)) AS max_1_Rate"+
				" FROM ("+
				" SELECT $timeSeries AS t,"+
				" max(from_total) AS max_0,"+
				" max(from_amount) AS max_1"+
				" FROM requests"+
				" WHERE $timeFilter"+
				" GROUP BY t"+
				" ORDER BY t)",
			q.perSecond,
		),
		newMacrosTestCase(
			"$perSecondColumns",
			"/* comment */\n$perSecondColumns(concat('test',type) AS from_alias, from_total) FROM requests WHERE type IN ('udp', 'tcp')",
			"/* comment */\nSELECT t,"+
				" groupArray((from_alias, max_0_Rate)) AS groupArr"+
				" FROM ("+
				" SELECT t,"+
				" from_alias,"+
				" if(runningDifference(max_0) < 0 OR neighbor(from_alias,-1,from_alias) != from_alias, nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate"+
				" FROM ("+
				" SELECT $timeSeries AS t,"+
				" concat('test', type) AS from_alias,"+
				" max(from_total) AS max_0"+
				" FROM requests"+
				" WHERE $timeFilter"+
				" AND type IN ('udp', 'tcp')"+
				" GROUP BY t, from_alias"+
				" ORDER BY from_alias, t"+
				")"+
				")"+
				" GROUP BY t"+
				" ORDER BY t",
			q.perSecondColumns,
		),
	}
	r := require.New(t)
	for _, tc := range testCases {
		ast, err := tc.scanner.toAST()
		r.NoError(err)
		tc.got, err = tc.fn(tc.query, ast)
		r.NoError(err)
		r.Equal(tc.expected, tc.got, "expects equality in %s", tc.name)
	}
}

/*
 comments and $rate and from in field name
 check https://github.com/Altinity/clickhouse-grafana/issues/187
 check https://github.com/Altinity/clickhouse-grafana/issues/256
 check https://github.com/Altinity/clickhouse-grafana/issues/265
*/
func TestCommentsAndRateMacrosWithFromKeywordInFieldName(t *testing.T) {
	const query = "/*comment1*/\n-- comment2\n/*\ncomment3\n */\n$rate(countIf(service_name='mysql' AND from_user='alice') AS mysql_alice, countIf(service_name='postgres') AS postgres)\n" +
		"FROM $table\n" +
		"WHERE from_user='bob'"
	const expQuery = "/*comment1*/\n-- comment2\n/*\ncomment3\n */\nSELECT t, mysql_alice/runningDifference(t/1000) mysql_aliceRate, postgres/runningDifference(t/1000) postgresRate FROM ( SELECT $timeSeries AS t, countIf(service_name = 'mysql' AND from_user = 'alice') AS mysql_alice, countIf(service_name = 'postgres') AS postgres FROM $table\nWHERE $timeFilter AND from_user='bob' GROUP BY t ORDER BY t)"
	r := require.New(t)
	q := EvalQuery{}
	scanner := newScanner(query)
	ast, err := scanner.toAST()
	r.NoError(err)
	actual, err := q.applyMacros(query, ast)
	r.NoError(err)
	r.Equal(actual, expQuery, "gets replaced with right FROM query")
}

/*
 columns + union all + with
 fix https://github.com/Altinity/clickhouse-grafana/issues/319
*/
func TestColumnsMacrosWithUnionAllAndWithKeyword(t *testing.T) {
	const query = "$columns(\n" +
		"  category,   \n" +
		"  sum(agg_value) as value\n" +
		")\n" +
		"FROM (\n" +
		"\n" +
		" SELECT\n" +
		"    $timeSeries as t,\n" +
		"    category,\n" +
		"    sum(too_big_value) as agg_value\n" +
		" FROM $table\n" +
		" WHERE $timeFilter\n" +
		" GROUP BY t,category\n" +
		" \n" +
		" UNION ALL\n" +
		" \n" +
		" WITH (SELECT sum(too_big_value) FROM $table) AS total_value\n" +
		" SELECT\n" +
		"    $timeSeries as t,\n" +
		"    category,\n" +
		"    sum(too_big_value) / total_value as agg_value\n" +
		" FROM $table\n" +
		" WHERE $timeFilter\n" +
		" GROUP BY t,category\n" +
		")"
	const expQuery = "SELECT t, groupArray((category, value)) AS groupArr FROM ( SELECT $timeSeries AS t, category, sum(agg_value) as value FROM (\n" +
		"\n" +
		" SELECT\n" +
		"    $timeSeries as t,\n" +
		"    category,\n" +
		"    sum(too_big_value) as agg_value\n" +
		" FROM $table\n" +
		" WHERE $timeFilter AND $timeFilter\n" +
		" GROUP BY t,category\n" +
		" \n" +
		" UNION ALL\n" +
		" \n" +
		" WITH (SELECT sum(too_big_value) FROM $table) AS total_value\n" +
		" SELECT\n" +
		"    $timeSeries as t,\n" +
		"    category,\n" +
		"    sum(too_big_value) / total_value as agg_value\n" +
		" FROM $table\n" +
		" WHERE $timeFilter AND $timeFilter\n" +
		" GROUP BY t,category\n" +
		") GROUP BY t, category ORDER BY t, category) GROUP BY t ORDER BY t"
	r := require.New(t)
	q := EvalQuery{}
	scanner := newScanner(query)
	ast, err := scanner.toAST()
	r.NoError(err)
	actual, err := q.applyMacros(query, ast)
	r.NoError(err)
	r.Equal(actual, expQuery, "gets replaced with right FROM query")
}

type astTestCase struct {
	name        string
	query       string
	scanner     EvalQueryScanner
	expectedAST *EvalAST
}

func (t *astTestCase) SortedObjKeys(Obj map[string]interface{}) []string {
	keys := make([]string, 0, len(Obj))
	for k := range Obj {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func (t *astTestCase) CheckASTEqual(expectedAST *EvalAST, actualAST *EvalAST) (bool, error) {
	if expectedAST.Obj != nil {
		if actualAST.Obj == nil {
			return false, fmt.Errorf("expectedAST.Obj != nil, actualAST.Obj == nil")
		}
		expectedKeys := t.SortedObjKeys(expectedAST.Obj)
		actualKeys := t.SortedObjKeys(actualAST.Obj)
		if !reflect.DeepEqual(expectedKeys, actualKeys) {
			return false, fmt.Errorf("!reflect.DeepEqual(expectedKeys=%v, actualKeys=%v)\n", expectedKeys, actualKeys)
		}
		for k, v := range expectedAST.Obj {
			switch v.(type) {
			case *EvalAST:
				check, err := t.CheckASTEqual(v.(*EvalAST), actualAST.Obj[k].(*EvalAST))
				if !check {
					return false, fmt.Errorf("!t.CheckASTEqual(expectedAST.Obj[%s].(*EvalAST), actualAST.Obj[%s].(*EvalAST))\n <= %v\n", k, k, err)
				}
			case string:
				if v.(string) != actualAST.Obj[k].(string) {
					return false, fmt.Errorf("expectedAST.Obj[%s]=%s != actualAST.Obj[%s]=%s\n", k, expectedAST.Obj[k].(string), k, actualAST.Obj[k].(string))
				}
			}
		}
		return true, nil
	} else if expectedAST.Arr != nil {
		if actualAST.Arr == nil {
			return false, fmt.Errorf("expectedAST.Arr != nil, actualAST.Arr == nil")
		}
		if len(actualAST.Arr) != len(expectedAST.Arr) {
			return false, fmt.Errorf("len(actualAST.Arr)=%d != len(expectedAST.Arr)=%d\n", len(actualAST.Arr), len(expectedAST.Arr))
		}
		for i, v := range expectedAST.Arr {
			switch v.(type) {
			case *EvalAST:
				check, err := t.CheckASTEqual(v.(*EvalAST), actualAST.Arr[i].(*EvalAST))
				if !check {
					return false, fmt.Errorf("!t.CheckASTEqual(expectedAST.Arr[%d].(*EvalAST), actualAST.Arr[%d].(*EvalAST))\n <= %v", i, i, err)
				}
			case string:
				if v.(string) != actualAST.Arr[i].(string) {
					return false, fmt.Errorf("expectedAST.Arr[%d]=%s != actualAST.Arr[%d]=%s\n", i, expectedAST.Arr[i].(string), i, actualAST.Arr[i].(string))
				}
			}
		}
		return true, nil
	} else {
		allNil := expectedAST.Obj == nil && actualAST.Obj == nil && expectedAST.Arr == nil && actualAST.Arr == nil

		if !allNil {
			return allNil, fmt.Errorf("allNil=%v, (expectedAST.Obj == nil) = %v && (actualAST.Obj == nil) = %v && (expectedAST.Arr == nil) = %v && (actualAST.Arr == nil) = %v\n", allNil, expectedAST.Obj == nil, actualAST.Obj == nil, expectedAST.Arr == nil, actualAST.Arr == nil)
		}
		return true, nil
	}
}

func newASTTestCase(name, query string, expectedAST *EvalAST) astTestCase {
	return astTestCase{
		name:        name,
		query:       query,
		expectedAST: expectedAST,
		scanner:     newScanner(query),
	}
}

func TestScannerAST(t *testing.T) {
	testCases := []astTestCase{
		newASTTestCase(
			"AST case 1",
			"SELECT EventDate, col1, col2, toUInt32(col1 > 0 ? col2/col1*10000 : 0)/100 AS percent "+
				"FROM ( SELECT   EventDate,   col1,   countIf(col2 GLOBAL IN some_table) AS col2_shared,   "+
				"count() AS col_count,   uniqCombinedIf(col3, col3 GLOBAL IN some_table) AS col3_shared,   "+
				"uniqCombined(col3) AS unique_col3 FROM   general_table_all PREWHERE   Event IN ('type1')   "+
				"AND EventDate <= '2016-12-20'   WHERE     (EventDate, col1) GLOBAL IN some_table GROUP BY   "+
				"EventDate, col1) GLOBAL ANY LEFT JOIN ( SELECT   EventDate,   col1,   countIf(col2 GLOBAL IN some_table) "+
				"AS col2_shared,   count() AS col_count,   uniqCombinedIf(col3, col3 GLOBAL IN some_table) AS col3_shared,   "+
				"uniqCombined(col3) AS unique_col3 FROM   general_table_all PREWHERE   Event IN ('type2')   "+
				"AND EventDate <= '2016-12-20' WHERE   (EventDate, col1) GLOBAL IN some_table   "+
				"AND col4 GLOBAL IN some_table GROUP BY   EventDate, col1) USING EventDate, col1 "+
				"ORDER BY EventDate, col1 FORMAT CSVWithNames",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{
					Arr: []interface{}{
						"EventDate",
						"col1",
						"col2",
						"toUInt32(col1 > 0 ? col2 / col1 * 10000 : 0) / 100 AS percent",
					},
				},
				"from": &EvalAST{Obj: map[string]interface{}{
					"root": newEvalAST(false),
					"select": &EvalAST{Arr: []interface{}{
						"EventDate",
						"col1",
						"countIf(col2 GLOBAL IN some_table) AS col2_shared",
						"count() AS col_count",
						"uniqCombinedIf(col3, col3 GLOBAL IN some_table) AS col3_shared",
						"uniqCombined(col3) AS unique_col3",
					}},
					"from": &EvalAST{Arr: []interface{}{
						"general_table_all",
					}},
					"prewhere": &EvalAST{Arr: []interface{}{
						"Event IN ('type1')",
						"AND EventDate <= '2016-12-20'",
					}},
					"where": &EvalAST{Arr: []interface{}{
						"(EventDate, col1) GLOBAL IN some_table",
					}},
					"group by": &EvalAST{Arr: []interface{}{
						"EventDate",
						"col1",
					}},
				}},
				"join": &EvalAST{Arr: []interface{}{
					EvalAST{Obj: map[string]interface{}{
						"aliases": newEvalAST(false),
						"on":      newEvalAST(false),
						"source": &EvalAST{Obj: map[string]interface{}{
							"from": &EvalAST{Arr: []interface{}{
								"general_table_all",
							}},
							"group by": &EvalAST{Arr: []interface{}{
								"EventDate",
								"col1",
							}},
							"prewhere": &EvalAST{Arr: []interface{}{
								"Event IN ('type2')",
								"AND EventDate <= '2016-12-20'",
							}},
							"root": newEvalAST(false),
							"select": &EvalAST{Arr: []interface{}{
								"EventDate",
								"col1",
								"countIf(col2 GLOBAL IN some_table) AS col2_shared",
								"count() AS col_count",
								"uniqCombinedIf(col3, col3 GLOBAL IN some_table) AS col3_shared",
								"uniqCombined(col3) AS unique_col3",
							}},
							"where": &EvalAST{Arr: []interface{}{
								"(EventDate, col1) GLOBAL IN some_table",
								"AND col4 GLOBAL IN some_table",
							}},
						}},
						"type": "GLOBAL ANY LEFT JOIN",
						"using": &EvalAST{Arr: []interface{}{
							"EventDate",
							"col1",
						}},
					}},
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"EventDate",
					"col1",
				}},
				"format": &EvalAST{Arr: []interface{}{
					"CSVWithNames",
				}},
			}},
		),
		newASTTestCase(
			"AST case 2",
			"$rateColumns((AppType = '' ? 'undefined' : AppType) type, sum(Hits) hits) "+
				"FROM table_all  WHERE Event = 'request' AND (-1 IN ($template) OR col IN ($template)) HAVING hits > $interval",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"$rateColumns": &EvalAST{Arr: []interface{}{
					"(AppType = '' ? 'undefined' : AppType) type",
					"sum(Hits) hits",
				}},
				"select": newEvalAST(false),
				"from": &EvalAST{Arr: []interface{}{
					"table_all",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"Event = 'request'",
					"AND(- 1 IN ($template) OR col IN ($template))",
				}},
				"having": &EvalAST{Arr: []interface{}{
					"hits > $interval",
				}},
			}},
		),

		newASTTestCase(
			"AST case 3",
			"SELECT $timeSeries as t, count() AS `SMALL` FROM db.table "+
				"WHERE W0 <= 400 AND LastEvent>=1 AND $timeFilter GROUP BY t ORDER BY t",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"$timeSeries as t",
					"count() AS `SMALL`",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"db.table",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"W0 <= 400",
					"AND LastEvent >= 1",
					"AND $timeFilter",
				}},
				"group by": &EvalAST{Arr: []interface{}{
					"t",
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"t",
				}},
			}},
		),

		newASTTestCase(
			"AST case 4",
			"SELECT LogTime, Entity, Message FROM $table "+
				"ANY LEFT JOIN (SELECT * FROM default.log_events) USING EventCode "+
				"WHERE $timeFilter ORDER BY LogTime DESC LIMIT $__limit",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"LogTime",
					"Entity",
					"Message",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
				"join": &EvalAST{Arr: []interface{}{
					EvalAST{Obj: map[string]interface{}{
						"aliases": newEvalAST(false),
						"on":      EvalAST{},
						"source": &EvalAST{Obj: map[string]interface{}{
							"from": &EvalAST{Arr: []interface{}{
								"default.log_events",
							}},
							"root": newEvalAST(false),
							"select": &EvalAST{Arr: []interface{}{
								"*",
							}},
						}},
						"type": "ANY LEFT JOIN",
						"using": &EvalAST{Arr: []interface{}{
							"EventCode",
						}},
					}},
				}},
				"where": &EvalAST{Arr: []interface{}{
					"$timeFilter",
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"LogTime DESC",
				}},
				"limit": &EvalAST{Arr: []interface{}{
					"$__limit",
				}},
			}},
		),

		newASTTestCase(
			"AST case 5",
			"SELECT select FROM $table",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"select",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
			}},
		),

		newASTTestCase(
			"AST case 6",
			"SELECT 1, select FROM $table",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"1",
					"select",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
			}},
		),

		newASTTestCase(
			"AST case 7",
			"SELECT t, countIf(Format='1') FROM $table",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"t",
					"countIf(Format = '1')",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
			}},
		),

		newASTTestCase(
			"AST case 8",
			"SELECT from FROM from",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"from",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"from",
				}},
			}},
		),

		newASTTestCase(
			"AST case 9",
			"SELECT"+
				"  t, groupArray((process_name, duration)) as groupArr "+
				" FROM ("+
				"  SELECT"+
				"    (intDiv(toUInt32(event_datetime), 5) * 5) * 1000 as t,"+
				"    process_name,"+
				"    quantile(0.95)(duration) duration"+
				"  FROM xx "+
				"  WHERE event_date >= toDate(1514966917) AND event_datetime >= toDateTime(1514966917)"+
				"  GROUP BY t, process_name  ORDER BY t, process_name"+
				") GROUP BY t ORDER BY t FORMAT JSON",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"t",
					"groupArray((process_name, duration)) as groupArr",
				}},
				"from": &EvalAST{Obj: map[string]interface{}{
					"root": newEvalAST(false),
					"select": &EvalAST{Arr: []interface{}{
						"(intDiv(toUInt32(event_datetime), 5) * 5) * 1000 as t",
						"process_name",
						"quantile(0.95)(duration) duration",
					}},
					"from": &EvalAST{Arr: []interface{}{
						"xx",
					}},
					"where": &EvalAST{Arr: []interface{}{
						"event_date >= toDate(1514966917)",
						"AND event_datetime >= toDateTime(1514966917)",
					}},
					"group by": &EvalAST{Arr: []interface{}{
						"t",
						"process_name",
					}},
					"order by": &EvalAST{Arr: []interface{}{
						"t",
						"process_name",
					}},
				}},
				"group by": &EvalAST{Arr: []interface{}{
					"t",
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"t",
				}},
				"format": &EvalAST{Arr: []interface{}{
					"JSON",
				}},
			}},
		),

		newASTTestCase(
			"AST case 10(array)",
			"SELECT count() FROM $table WHERE type[1] = 'key' AND zone['City'] = 'Kyiv'",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"count()",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"type[1] = 'key'",
					"AND zone['City'] = 'Kyiv'",
				}},
			}},
		),

		newASTTestCase(
			"AST case 11(union all)",
			"SELECT a, b FROM table1 UNION ALL select c, d from table2 UNION ALL select e, f from table3",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"a",
					"b",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"table1",
				}},
				"union all": &EvalAST{Arr: []interface{}{
					EvalAST{Obj: map[string]interface{}{
						"root": newEvalAST(false),
						"select": &EvalAST{Arr: []interface{}{
							"c",
							"d",
						}},
						"from": &EvalAST{Arr: []interface{}{
							"table2",
						}},
					}},
					EvalAST{Obj: map[string]interface{}{
						"root": newEvalAST(false),
						"select": &EvalAST{Arr: []interface{}{
							"e",
							"f",
						}},
						"from": &EvalAST{Arr: []interface{}{
							"table3",
						}},
					}},
				}},
			}},
		),

		newASTTestCase(
			"AST case 12(union all closure)",
			"SELECT * FROM (select c, d from table2 UNION ALL select e, f from table3) ORDER BY c",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"*",
				}},
				"from": &EvalAST{Obj: map[string]interface{}{
					"root": newEvalAST(false),
					"select": &EvalAST{Arr: []interface{}{
						"c",
						"d",
					}},
					"from": &EvalAST{Arr: []interface{}{
						"table2",
					}},
					"union all": &EvalAST{Arr: []interface{}{
						EvalAST{Obj: map[string]interface{}{
							"root": newEvalAST(false),
							"select": &EvalAST{Arr: []interface{}{
								"e",
								"f",
							}},
							"from": &EvalAST{Arr: []interface{}{
								"table3",
							}},
						}},
					}},
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"c",
				}},
			}},
		),

		newASTTestCase(
			"AST case 13(partial statement match)",
			"SELECT $timeSeries as t, count() as formatt FROM $table WHERE $timeFilter GROUP BY t ORDER BY t",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"$timeSeries as t",
					"count() as formatt",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"$timeFilter",
				}},
				"group by": &EvalAST{Arr: []interface{}{
					"t",
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"t",
				}},
			}},
		),

		newASTTestCase(
			"AST case 14(quoted literals)",
			"SELECT $timeSeries as \"t\", count() as \"formatt\" FROM $table WHERE $timeFilter GROUP BY \"t\" ORDER BY \"t\"",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"$timeSeries as \"t\"",
					"count() as \"formatt\"",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"$timeFilter",
				}},
				"group by": &EvalAST{Arr: []interface{}{
					"\"t\"",
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"\"t\"",
				}},
			}},
		),

		newASTTestCase(
			"AST case 15 (escaped quotes inside quotes)",
			`SELECT now() AS t, 'test\'value' AS v FROM $table WHERE v="test\"field"`,
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"now() AS t",
					`'test\'value' AS v`,
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
				"where": &EvalAST{Arr: []interface{}{
					`v = "test\"field"`,
				}},
			}},
		),

		newASTTestCase(
			"AST case 16 (subquery + alias)",
			"SELECT t2.service_name, sum(1.05*rand()) AS test "+
				"FROM (SELECT event_time, service_name FROM default.test_grafana) AS t2 "+
				"WHERE $timeFilter "+
				"GROUP BY service_name "+
				"ORDER BY test DESC",
			&EvalAST{Obj: map[string]interface{}{
				"from": &EvalAST{Obj: map[string]interface{}{
					"root": newEvalAST(false),
					"select": &EvalAST{Arr: []interface{}{
						"event_time",
						"service_name",
					}},
					"from": &EvalAST{Arr: []interface{}{
						"default.test_grafana",
					}},
					"aliases": &EvalAST{Arr: []interface{}{
						"AS t2",
					}},
				}},
				"group by": &EvalAST{Arr: []interface{}{
					"service_name",
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"test DESC",
				}},
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"t2.service_name",
					"sum(1.05 * rand()) AS test",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"$timeFilter",
				}},
			}},
		),

		newASTTestCase(
			"AST case 17 (subquery + multiple joins)",
			"SELECT t1.service_name, sum(1.05*rand()) AS test "+
				"FROM (SELECT DISTINCT service_name FROM default.test_grafana) AS t2 "+
				"INNER JOIN $table AS t1 "+
				"ON (t2.service_name=t1.service_name AND 1=1) "+
				"CROSS JOIN (SELECT DISTINCT service_name FROM default.test_grafana) AS t3 "+
				"ON t3.service_name=t1.service_name AND 1=1 "+
				"ANY JOIN default.test_grafana AS t4 "+
				"USING service_name "+
				"WHERE $timeFilter "+
				"GROUP BY t1.service_name ORDER BY test DESC",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"t1.service_name",
					"sum(1.05 * rand()) AS test",
				}},
				"from": &EvalAST{Obj: map[string]interface{}{
					"from": &EvalAST{Arr: []interface{}{
						"default.test_grafana",
					}},
					"root": newEvalAST(false),
					"select": &EvalAST{Arr: []interface{}{
						"DISTINCT service_name",
					}},
					"aliases": &EvalAST{Arr: []interface{}{
						"AS t2",
					}},
				}},
				"join": &EvalAST{Arr: []interface{}{
					EvalAST{Obj: map[string]interface{}{
						"source": &EvalAST{Arr: []interface{}{
							"$table",
						}},
						"type": "INNER JOIN",
						"aliases": &EvalAST{Arr: []interface{}{
							"AS",
							"t1",
						}},
						"on": &EvalAST{Arr: []interface{}{
							"(t2.service_name=t1.service_name AND 1=1)",
						}},
						"using": newEvalAST(false),
					}},
					EvalAST{Obj: map[string]interface{}{
						"source": &EvalAST{Obj: map[string]interface{}{
							"root": newEvalAST(false),
							"select": &EvalAST{Arr: []interface{}{
								"DISTINCT service_name",
							}},
							"from": &EvalAST{Arr: []interface{}{
								"default.test_grafana",
							}},
						}},
						"type": "CROSS JOIN",
						"aliases": &EvalAST{Arr: []interface{}{
							"AS",
							"t3",
						}},
						"on": &EvalAST{Arr: []interface{}{
							"t3.service_name=t1.service_name AND 1=1",
						}},
						"using": newEvalAST(false),
					}},
					EvalAST{Obj: map[string]interface{}{
						"source": &EvalAST{Arr: []interface{}{
							"default.test_grafana",
						}},
						"type": "ANY JOIN",
						"aliases": &EvalAST{Arr: []interface{}{
							"AS",
							"t4",
						}},
						"on":    EvalAST{},
						"using": &EvalAST{Arr: []interface{}{"service_name"}},
					}},
				}},
				"where": &EvalAST{Arr: []interface{}{
					"$timeFilter",
				}},
				"group by": &EvalAST{Arr: []interface{}{
					"t1.service_name",
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"test DESC",
				}},
			}},
		),

		newASTTestCase(
			"AST case 18 (comment + macros)",
			"/* test comment1 */\n"+
				"-- test comment2\n"+
				"/* \n"+
				"  test multiline comment3\n"+
				"*/  \n"+
				"$rate(countIf(service_name='mysql' AND from_user='alice') AS mysql_alice, countIf(service_name='postgres') AS postgres) \n"+
				"FROM $table\n"+
				"WHERE from_user='bob' /* comment after query */",
			&EvalAST{Obj: map[string]interface{}{
				"root": &EvalAST{Arr: []interface{}{
					"/* test comment1 */\n" +
						"-- test comment2\n" +
						"/* \n" +
						"  test multiline comment3\n" +
						"*/\n",
				}},
				"select": newEvalAST(false),
				"$rate": &EvalAST{Arr: []interface{}{
					"countIf(service_name = 'mysql' AND from_user = 'alice') AS mysql_alice",
					"countIf(service_name = 'postgres') AS postgres",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"from_user = 'bob'/* comment after query */\n",
				}},
			}},
		),

		/* fix https://github.com/Altinity/clickhouse-grafana/issues/319 */
		newASTTestCase(
			"AST case 19 ($columns + union all + with + sub query)",
			"$columns(\n"+
				"  service_name,   \n"+
				"  sum(agg_value) as value\n"+
				")\n"+
				"FROM (\n"+
				"\n"+
				" SELECT\n"+
				"    $timeSeries as t,\n"+
				"    service_name,\n"+
				"    sum(too_big_value) as agg_value\n"+
				" FROM $table\n"+
				" WHERE $timeFilter\n"+
				" GROUP BY t,service_name\n"+
				" \n"+
				" UNION ALL\n"+
				" \n"+
				" WITH (SELECT sum(too_big_value) FROM $table) AS total_value\n"+
				" SELECT\n"+
				"    $timeSeries as t,\n"+
				"    service_name,\n"+
				"    sum(too_big_value) / total_value as agg_value\n"+
				" FROM $table\n"+
				" WHERE $timeFilter\n"+
				" GROUP BY t,service_name\n"+
				")",
			&EvalAST{Obj: map[string]interface{}{
				"root":   EvalAST{},
				"select": newEvalAST(false),
				"$columns": &EvalAST{Arr: []interface{}{
					"service_name",
					"sum(agg_value) as value",
				}},
				"from": &EvalAST{Obj: map[string]interface{}{
					"root": newEvalAST(false),
					"select": &EvalAST{Arr: []interface{}{
						"$timeSeries as t",
						"service_name",
						"sum(too_big_value) as agg_value",
					}},
					"from": &EvalAST{Arr: []interface{}{
						"$table",
					}},
					"group by": &EvalAST{Arr: []interface{}{
						"t",
						"service_name",
					}},
					"union all": &EvalAST{Arr: []interface{}{
						EvalAST{Obj: map[string]interface{}{
							"from": &EvalAST{Arr: []interface{}{
								"$table",
							}},
							"group by": &EvalAST{Arr: []interface{}{
								"t",
								"service_name",
							}},
							"root": newEvalAST(false),
							"select": &EvalAST{Arr: []interface{}{
								"$timeSeries as t",
								"service_name",
								"sum(too_big_value) / total_value as agg_value",
							}},
							"where": &EvalAST{Arr: []interface{}{
								"$timeFilter",
							}},
							"with": &EvalAST{Arr: []interface{}{
								"(SELECT sum(too_big_value) FROM $table) AS total_value",
							}},
						}},
					}},
					"where": &EvalAST{Arr: []interface{}{
						"$timeFilter",
					}},
				}},
			}},
		),

		/* fix https://github.com/Altinity/clickhouse-grafana/issues/374 */
		newASTTestCase(
			"AST case 20 (`--` inside of quotes)",
			"--test one line comment1\n"+
				"SELECT *\n"+
				"FROM $table\n"+
				"WHERE title='-- test not comment1' -- test inline comment1\n"+
				"AND user_info='test -- not comment2' -- test inline comment2",
			&EvalAST{Obj: map[string]interface{}{
				"root": &EvalAST{Arr: []interface{}{
					"--test one line comment1\n",
				}},
				"select": &EvalAST{Arr: []interface{}{
					"*",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"title = '-- test not comment1'-- test inline comment1\n",
					"AND user_info = 'test -- not comment2'-- test inline comment2\n",
				}},
			}},
		),
		/* fix https://github.com/Altinity/clickhouse-grafana/issues/422 */
		newASTTestCase(
			"AST case 21 (adhoc + ORDER BY ... WITH FILL)",
			"SELECT\n"+
				"    $timeSeries as t,\n"+
				"    sum(too_big_value) * 8 / $interval AS B\n"+
				"FROM $table\n"+
				"\n"+
				"WHERE\n"+
				"    event_time BETWEEN $from AND $to\n"+
				"    $adhoc \n"+
				"GROUP BY t\n"+
				"ORDER BY t WITH FILL STEP ($interval*1000*5)",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"select": &EvalAST{Arr: []interface{}{
					"$timeSeries as t", "sum(too_big_value) * 8 / $interval AS B",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"event_time BETWEEN $from",
					"AND $to $adhoc",
				}},
				"group by": &EvalAST{Arr: []interface{}{
					"t",
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"t WITH FILL STEP($interval * 1000 * 5)",
				}},
			}},
		),
		/* fix https://github.com/Altinity/clickhouse-grafana/issues/421 */
		newASTTestCase(
			"AST case 22 (WITH + adhoc + SELECT x IN ( ... )",
			"WITH topx AS (\n"+
				"   SELECT DISTINCT CASE WHEN service_name = '' THEN 'other' ELSE service_name END AS filter, count() AS cnt \n"+
				"   FROM $table WHERE $timeFilter AND $adhoc  GROUP BY service_name \n"+
				"   ORDER BY cnt DESC LIMIT 10\n"+
				")\n"+
				"\n"+
				"SELECT\n"+
				"    $timeSeries as t,\n"+
				"    CASE WHEN service_name IN (SELECT filter FROM topx) THEN service_name ELSE 'other' END AS spl,\n"+
				"    count()\n"+
				"FROM $table\n"+
				"\n"+
				"WHERE $timeFilter AND $adhoc\n"+
				"GROUP BY t, spl\n"+
				"ORDER BY t, spl\n",
			&EvalAST{Obj: map[string]interface{}{
				"root": newEvalAST(false),
				"with": &EvalAST{Arr: []interface{}{
					"topx AS(SELECT DISTINCT CASE WHEN service_name = '' THEN 'other' ELSE service_name END AS filter, count() AS cnt FROM $table WHERE $timeFilter AND $adhoc GROUP BY service_name ORDER BY cnt DESC LIMIT 10)",
				}},
				"select": &EvalAST{Arr: []interface{}{
					"$timeSeries as t",
					"CASE WHEN service_name IN (\n" +
						"    SELECT filter\n" +
						"\n" +
						"    FROM topx\n" +
						") THEN service_name ELSE 'other' END AS spl",
					"count()",
				}},
				"from": &EvalAST{Arr: []interface{}{
					"$table",
				}},
				"where": &EvalAST{Arr: []interface{}{
					"$timeFilter",
					"AND $adhoc",
				}},
				"group by": &EvalAST{Arr: []interface{}{
					"t", "spl",
				}},
				"order by": &EvalAST{Arr: []interface{}{
					"t", "spl",
				}},
			}},
		),
	}
	r := require.New(t)
	for _, tc := range testCases {
		ast, err := tc.scanner.toAST()
		r.NoError(err)
		check, err := tc.CheckASTEqual(tc.expectedAST, ast)
		r.NoError(err)

		expectedJSON, err := json.MarshalIndent(tc.expectedAST, "", "\t")
		r.NoError(err)
		actualJSON, err := json.MarshalIndent(ast, "", "\t")
		r.NoError(err)
		r.True(check, "%s: expected AST\n%+v\nactual AST\n%+v", tc.name, expectedJSON, actualJSON)
	}
	// advanced check TestCase AST 20
	tc := testCases[19]
	expected, err := tc.scanner.RemoveComments(tc.query)
	r.NoError(err)
	r.Equal(
		expected,
		"\n"+
			"SELECT *\n"+
			"FROM $table\n"+
			"WHERE title='-- test not comment1' \n"+
			"AND user_info='test -- not comment2' ",
	)
}

func TestEvalQueryTimeFilterByColumnAndRange(t *testing.T) {
	const description = "Query SELECT with $timeFilterByColumn and range with from and to"
	const query = "SELECT * FROM table WHERE $timeFilterByColumn(column_name)"
	r := require.New(t)
	from, err := time.Parse("2006-01-02 15:04:05Z", `2018-12-24 01:02:03Z`)
	r.NoError(err)
	to, err := time.Parse("2006-01-02 15:04:05Z", `2018-12-31 23:59:59Z`)
	r.NoError(err)
	q := EvalQuery{
		Query: query,
		From:  from,
		To:    to,
	}
	q.DateTimeType = "DATETIME"
	r.Equal(
		"SELECT * FROM table WHERE column_name >= toDateTime(1545613323) AND column_name <= toDateTime(1546300799)",
		q.replaceTimeFilters(query, 0),
		description+" unexpected results DATETIME",
	)

	q.DateTimeType = "DATETIME64"
	r.Equal(
		"SELECT * FROM table WHERE column_name >= toDateTime64(1545613323000/1000, 3) AND column_name <= toDateTime64(1546300799000/1000, 3)",
		q.replaceTimeFilters(query, 0),
		description+" unexpected results DATETIME64",
	)

}

func TestEvalQueryTimeFilter64ByColumnAndRangeMs(t *testing.T) {
	const description = "Query SELECT with $timeFilterByColumn, $timeFilter64ByColumn and range with from"
	const query = "SELECT * FROM table WHERE $timeFilterByColumn(column_name)"
	const query64 = "SELECT * FROM table WHERE $timeFilter64ByColumn(column_name)"
	r := require.New(t)
	from, err := time.Parse("2006-01-02 15:04:05.000Z", "2018-12-24 01:02:03.200Z")
	to := time.Now()
	r.NoError(err)
	eQ := EvalQuery{
		From: from,
		To:   to,
	}
	for _, q := range []string{query, query64} {
		eQ.Query = q
		eQ.DateTimeType = "DATETIME"
		expectedQ := fmt.Sprintf("SELECT * FROM table WHERE "+
			"column_name >= toDateTime(%d) AND "+
			"column_name <= toDateTime(%d)", from.Unix(), to.Unix())
		expectedQ64 := fmt.Sprintf("SELECT * FROM table WHERE "+
			"column_name >= toDateTime64(%d200/1000, 3) AND "+
			"column_name <= toDateTime64(%d/1000, 3)", from.Unix(), to.UnixMilli())
		if q == query64 {
			expectedQ = expectedQ64
		}
		r.Equal(expectedQ, eQ.replaceTimeFilters(q, 0), description+" unexpected DATETIME result")
		eQ.DateTimeType = "DATETIME64"
		r.Equal(expectedQ64, eQ.replaceTimeFilters(q, 0), description+" unexpected DATETIME64 result")
	}
}

func TestEvalQueryTimeSeriesTimeFilterAndDateTime64(t *testing.T) {
	const description = "Query SELECT with $timeSeries $timeFilter and DATETIME64"
	const query = "SELECT $timeSeries as t, sum(x) AS metric\n" +
		"FROM $table\n" +
		"WHERE $timeFilter\n" +
		"GROUP BY t\n" +
		"ORDER BY t"
	const expQuery = "SELECT (intDiv(toFloat64(\"d\") * 1000, (15 * 1000)) * (15 * 1000)) as t, sum(x) AS metric\n" +
		"FROM default.test_datetime64\n" +
		"WHERE \"d\" >= toDateTime64(1545613320, 3) AND \"d\" <= toDateTime64(1546300740, 3)\n" +
		"GROUP BY t\n" +
		"ORDER BY t"

	r := require.New(t)
	from, err := time.Parse("2006-01-02 15:04:05Z", `2018-12-24 01:02:03Z`)
	r.NoError(err)
	to, err := time.Parse("2006-01-02 15:04:05Z", `2018-12-31 23:59:59Z`)
	r.NoError(err)

	q := EvalQuery{
		Query:          query,
		From:           from,
		To:             to,
		Interval:       "15s",
		IntervalFactor: 1,
		SkipComments:   false,
		Table:          "test_datetime64",
		Database:       "default",
		DateTimeType:   "DATETIME64",
		DateCol:        "",
		DateTimeCol:    "d",
		Round:          "1m",
	}
	actualQuery, err := q.replace(query)
	r.NoError(err)

	r.Equal(expQuery, actualQuery, description+" unexpected result")
}

func TestUnescapeMacros(t *testing.T) {
	const query = "SELECT $unescape('count()'), " +
		"$unescape('if(runningDifference(max_0) < 0, nan, " +
		"runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate') " +
		"FROM requests WHERE $unescape('client_ID') = 5"
	const expQuery = "SELECT count(), if(runningDifference(max_0) < 0, " +
		"nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate " +
		"FROM requests WHERE client_ID = 5"
	q := EvalQuery{}
	r := require.New(t)
	unescapedQuery, err := q.unescape(query)
	r.NoError(err)
	r.Equal(expQuery, unescapedQuery)

}

func TestEscapeIdentifier(t *testing.T) {
	q := EvalQuery{}
	r := require.New(t)
	r.Equal("My_Identifier_33", q.escapeIdentifier("My_Identifier_33"), "Standard identifier - untouched")
	r.Equal("\"1nfoVista\"", q.escapeIdentifier("1nfoVista"), "Begining with number")
	r.Equal("\"My Identifier\"", q.escapeIdentifier("My Identifier"), "Containing spaces")

	for _, query := range []string{"a / 1000", "a + b", "b - c", "5*c", "a / 1000 + b - 5*c"} {
		r.Equal(query, q.escapeIdentifier(query), "Containing arithmetic operation special characters")
	}
	r.Equal("\"My\\\"Bad\\\"Identifier\"", q.escapeIdentifier("My\"Bad\"Identifier"), "Containing double-quote")

	r.Equal("toDateTime(someDate)", q.escapeIdentifier("toDateTime(someDate)"), "Containing function calls")

}

/* check https://github.com/Altinity/clickhouse-grafana/issues/284 */
func TestEvalQueryColumnsMacrosAndArrayJoin(t *testing.T) {
	const description = "check replace with $columns and concat and ARRAY JOIN"
	const query = "$columns(\n" +
		"substring(concat(JobName as JobName,' # ' , Metrics.Name as MetricName), 1, 50) as JobSource,\n" +
		"sum(Metrics.Value) as Kafka_lag_max)\n" +
		"FROM $table\n" +
		"ARRAY JOIN Metrics"
	// new lines was removed, because we don't use adhoc filters
	const expQuery = "SELECT t, groupArray((JobSource, Kafka_lag_max)) AS groupArr FROM ( SELECT (intDiv(toUInt32(dateTimeColumn), 15) * 15) * 1000 AS t, substring(concat(JobName as JobName, ' # ', Metrics.Name as MetricName), 1, 50) as JobSource, sum(Metrics.Value) as Kafka_lag_max FROM default.test_array_join_nested\n" +
		"ARRAY JOIN Metrics " +
		"WHERE dateTimeColumn >= toDate(1545613320) AND dateTimeColumn <= toDate(1546300740) AND dateTimeColumn >= toDateTime(1545613320) AND dateTimeColumn <= toDateTime(1546300740) GROUP BY t, JobSource ORDER BY t, JobSource) GROUP BY t ORDER BY t"
	r := require.New(t)
	from, err := time.Parse("2006-01-02 15:04:05Z", `2018-12-24 01:02:03Z`)
	r.NoError(err)
	to, err := time.Parse("2006-01-02 15:04:05Z", `2018-12-31 23:59:59Z`)
	r.NoError(err)
	q := EvalQuery{
		Query:          query,
		Interval:       "15s",
		IntervalFactor: 1,
		SkipComments:   false,
		Table:          "test_array_join_nested",
		Database:       "default",
		DateTimeType:   "DATETIME",
		DateCol:        "dateTimeColumn",
		DateTimeCol:    "dateTimeColumn",
		Round:          "1m",
		From:           from,
		To:             to,
	}
	actualQuery, err := q.replace(query)
	r.NoError(err)
	r.Equal(expQuery, actualQuery, description)
}

/* check https://github.com/Altinity/clickhouse-grafana/issues/294 */
func TestEvalQueryTimeFilterByColumnAndDateTimeCol(t *testing.T) {
	const description = "combine $timeFilterByColumn and $dateTimeCol"
	const query = "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter AND $timeFilterByColumn($dateTimeCol) AND $timeFilterByColumn(another_column) GROUP BY t"
	const expQuery = "SELECT (intDiv(toUInt32(tm), 15) * 15) * 1000 as t, count() FROM default.test_table " +
		"WHERE dt >= toDate(1545613320) AND dt <= toDate(1546300740) AND tm >= toDateTime(1545613320) AND tm <= toDateTime(1546300740) " +
		"AND tm >= toDateTime(1545613201) AND tm <= toDateTime(1546300859) " +
		"AND another_column >= toDateTime(1545613201) AND another_column <= toDateTime(1546300859) " +
		"GROUP BY t"

	r := require.New(t)
	from, err := time.Parse("2006-01-02 15:04:05Z", `2018-12-24 01:02:03Z`)
	r.NoError(err)
	to, err := time.Parse("2006-01-02 15:04:05Z", `2018-12-31 23:59:59Z`)
	r.NoError(err)
	q := EvalQuery{
		Query:          query,
		Interval:       "15s",
		IntervalFactor: 1,
		SkipComments:   false,
		Table:          "test_table",
		Database:       "default",
		DateTimeType:   "DATETIME",
		DateCol:        "dt",
		DateTimeCol:    "tm",
		Round:          "1m",
		From:           from,
		To:             to,
	}
	actualQuery, err := q.replace(query)
	r.NoError(err)
	r.Equal(expQuery, actualQuery, description)
}

/* check $naturalTimeSeries https://github.com/Altinity/clickhouse-grafana/pull/89 */
func TestEvalQueryNaturalTimeSeries(t *testing.T) {
	const description = "check $naturalTimeSeries"
	const query = "SELECT $naturalTimeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t"
	const expQuery = "SELECT toUInt32(toDateTime(toStartOfMonth(tm))) * 1000 as t, count() " +
		"FROM default.test_table WHERE dt >= toDate(1545613320) AND dt <= toDate(1640995140) " +
		"AND tm >= toDateTime(1545613320) AND tm <= toDateTime(1640995140) GROUP BY t"

	r := require.New(t)
	from, err := time.Parse("2006-01-02 15:04:05Z", `2018-12-24 01:02:03Z`)
	r.NoError(err)
	to, err := time.Parse("2006-01-02 15:04:05Z", `2021-12-31 23:59:59Z`)
	r.NoError(err)
	q := EvalQuery{
		Query:          query,
		Interval:       "15s",
		IntervalFactor: 1,
		SkipComments:   false,
		Table:          "test_table",
		Database:       "default",
		DateTimeType:   "DATETIME",
		DateCol:        "dt",
		DateTimeCol:    "tm",
		Round:          "1m",
		From:           from,
		To:             to,
	}

	actualQuery, err := q.replace(query)
	r.NoError(err)
	r.Equal(expQuery, actualQuery, description)

}

/* check $timeSeriesMs $timeFilterMs https://github.com/Altinity/clickhouse-grafana/issues/344, https://github.com/Altinity/clickhouse-grafana/issues/398 */
func TestEvalQueryTimeSeriesMsTimeFilterMsAndDateTime64(t *testing.T) {
	const description = "Query SELECT with $timeSeriesMs $timeFilterMs and DATETIME64"
	const query = "SELECT $timeSeriesMs as t, sum(x) AS metric\n" +
		"FROM $table\n" +
		"WHERE $timeFilterMs\n" +
		"GROUP BY t\n" +
		"ORDER BY t"
	const expQuery = "SELECT (intDiv(toFloat64(\"d\") * 1000, 100) * 100) as t, sum(x) AS metric\n" +
		"FROM default.test_datetime64\n" +
		"WHERE \"d\" >= toDateTime64(1545613323200/1000, 3) AND \"d\" <= toDateTime64(1546300799200/1000, 3)\n" +
		"GROUP BY t\n" +
		"ORDER BY t"

	r := require.New(t)
	from, err := time.Parse("2006-01-02 15:04:05.000Z", `2018-12-24 01:02:03.200Z`)
	r.NoError(err)
	to, err := time.Parse("2006-01-02 15:04:05.000Z", `2018-12-31 23:59:59.200Z`)
	r.NoError(err)

	q := EvalQuery{
		Query:          query,
		From:           from,
		To:             to,
		Interval:       "100ms",
		IntervalFactor: 1,
		SkipComments:   false,
		Table:          "test_datetime64",
		Database:       "default",
		DateTimeType:   "DATETIME64",
		DateCol:        "",
		DateTimeCol:    "d",
		Round:          "100ms",
	}
	actualQuery, err := q.replace(query)
	r.NoError(err)

	r.Equal(expQuery, actualQuery, description+" unexpected result")
}
