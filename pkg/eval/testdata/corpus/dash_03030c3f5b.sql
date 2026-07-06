SELECT
    $timeSeries as t,
    sum(too_big_value) AS v
FROM $table
WHERE $timeFilter AND service_name IN (${service_name})
GROUP BY t
ORDER BY t