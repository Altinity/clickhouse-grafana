SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    host,
    avg(memory_usage) as memory
FROM default.streaming_test
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
GROUP BY t, host
ORDER BY t