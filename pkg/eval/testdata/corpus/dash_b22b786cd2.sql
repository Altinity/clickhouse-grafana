SELECT
    $timeSeriesMs as t,
    count()
FROM $table

WHERE $timeFilterMs

GROUP BY t

ORDER BY t
