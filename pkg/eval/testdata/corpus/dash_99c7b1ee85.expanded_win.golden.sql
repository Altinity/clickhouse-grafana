SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    service_name,
    round((count() / max(too_big_value)) * 100, 2) AS percent
FROM default.test_grafana
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
GROUP BY t, service_name
ORDER BY t, service_name