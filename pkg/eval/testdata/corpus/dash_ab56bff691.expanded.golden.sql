SELECT 1 AS t, UserName, sum(req_count*randUniform(40,100)) req
FROM default.test_grafana
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
GROUP BY UserName
ORDER BY req DESC
LIMIT 5