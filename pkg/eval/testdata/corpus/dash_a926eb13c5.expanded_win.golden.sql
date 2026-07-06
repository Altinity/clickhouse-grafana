SELECT
    event_time as t_orig,
    toUInt64(rand64() % 1000) AS t_UInt64
FROM default.test_grafana
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)