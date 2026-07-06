SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    sum(too_big_value) as v,
    service_name
FROM default.test_grafana

WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
$conditionalTest(AND service_name IN ($service_name), AND service_name IN ('mysql'), $service_name)
GROUP BY t, service_name
ORDER BY t