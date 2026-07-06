SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    sum(too_big_value) * 8 / 30 AS B
FROM default.test_grafana

WHERE
    event_time BETWEEN 1735787045 AND 1735790706
 AND   $adhoc 
GROUP BY t
ORDER BY t WITH FILL STEP (30*1000*5)