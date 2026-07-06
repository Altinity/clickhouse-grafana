SELECT t, mysql_bob/runningDifference(t/1000) mysql_bobRate, postgres/runningDifference(t/1000) postgresRate FROM ( SELECT (intDiv(toUInt32(event_time), 30) * 30) * 1000 AS t, countIf(service_name = 'mysql' AND from_user = 'bob') AS mysql_bob, countIf(service_name = 'postgres') AS postgres FROM default.test_grafana
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) AND from_user IN ('bob','alice')
 GROUP BY t
 ORDER BY t)