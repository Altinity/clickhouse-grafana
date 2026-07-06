SELECT
    $timeSeries as t,
    count() AS v
FROM $table

WHERE $timeFilter

GROUP BY t

ORDER BY t
