SELECT
    $timeSeriesMs as t,
    sum(value)
FROM $table

WHERE $timeFilterMs
GROUP BY t

ORDER BY t

