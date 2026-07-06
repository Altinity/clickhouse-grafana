SELECT
    trace_id AS `Trace ID`,
    min(operation_name) AS `Operation`,
    count() AS `Spans`,
    intDiv(max(finish_time_us) - min(start_time_us), 1000) AS `Duration ms`,
    intDiv(min(start_time_us), 1000) AS `Start Time`
FROM default.test_grafana
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
GROUP BY trace_id
ORDER BY `Duration ms` DESC
LIMIT 100