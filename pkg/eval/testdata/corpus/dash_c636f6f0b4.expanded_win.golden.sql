SELECT
    toUInt64(event_time)*1000 as t_local,
    event_time as t_orig,
    count() c,
    sum(too_big_value) s
FROM default.test_grafana
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
GROUP BY t_local, t_orig
ORDER BY t_local