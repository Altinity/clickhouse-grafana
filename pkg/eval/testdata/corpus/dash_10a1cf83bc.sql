SELECT
    $timeSeries as t,
    count() AS b,
    sum(t % 100000) AS a
FROM $table

WHERE $timeFilter

GROUP BY t

ORDER BY t
