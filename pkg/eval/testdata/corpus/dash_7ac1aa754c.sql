SELECT
    $timeSeries as t,
    ${columns:csv},
    count()
FROM $table
WHERE $timeFilter
GROUP BY t, ${columns:csv}
ORDER BY t