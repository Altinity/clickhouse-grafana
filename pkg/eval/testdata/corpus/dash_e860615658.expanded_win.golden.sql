SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    Name,
    sum(Value) v
FROM default.test_grafana

WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) AND Name in ($template_variable)

GROUP BY t, Name

ORDER BY t, Name