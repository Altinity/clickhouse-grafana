SELECT
    $timeSeries as t,
    country,
    sum(too_big_value) AS value
FROM $table
WHERE $timeFilter
GROUP BY t,country
ORDER BY t,country