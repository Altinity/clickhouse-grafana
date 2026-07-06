SELECT
    $timeSeries as t,
    host,
    avg(cpu_usage) as cpu
FROM default.streaming_test
WHERE $timeFilter
GROUP BY t, host
ORDER BY t