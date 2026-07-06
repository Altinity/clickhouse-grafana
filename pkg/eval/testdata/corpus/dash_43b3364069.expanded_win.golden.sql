SELECT
    (intDiv(toUInt32(event_time) * 1000, 30000) * 30000) as t,
    sum(value)
FROM default.test_grafana

WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045000/1000) AND event_time <= toDateTime(1735790706000/1000)
GROUP BY t

ORDER BY t