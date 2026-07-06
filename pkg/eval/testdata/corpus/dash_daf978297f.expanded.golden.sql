SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    count()
FROM default.test_grafana
WHERE event_time >= toDateTime(intDiv(1735787045000,1000)) AND event_time <= toDateTime(intDiv(1735790706000,1000))
GROUP BY t
ORDER BY t