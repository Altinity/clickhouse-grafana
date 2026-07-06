SELECT
    $timeSeries as t,
    service_name,
    round((count() / max(too_big_value)) * 100, 2) AS percent
FROM $table
WHERE $timeFilter
GROUP BY t, service_name
ORDER BY t, service_name