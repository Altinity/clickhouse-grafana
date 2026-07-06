SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    sum(x)
FROM default.test_grafana

WHERE d >= toDateTime(1735787045) AND d <= toDateTime(1735790706) AND d >= toDateTime(1735787045000/1000) AND d <= toDateTime(1735790706000/1000)

GROUP BY t

ORDER BY t