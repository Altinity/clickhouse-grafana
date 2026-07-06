SELECT
    $timeSeries as t,
    rand() / 100 AS total
FROM $table
WHERE $timeFilter
GROUP BY t
ORDER BY t