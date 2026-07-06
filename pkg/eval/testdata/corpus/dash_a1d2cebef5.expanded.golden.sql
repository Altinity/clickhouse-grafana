SELECT *
FROM default.test_grafana

WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) AND $adhoc
$conditionalTest(AND content ILIKE ${filter:sqlstring},$filter)