SELECT
    $timeSeries as t,
    count(),
    id,
    attributes
FROM $table
WHERE $timeFilter
GROUP BY
    t,
    id,
    attributes
ORDER BY t