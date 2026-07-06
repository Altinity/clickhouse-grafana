SELECT
    $timeSeries as t,
    sum(x)
FROM $table

WHERE $timeFilterByColumn(d) AND $timeFilter64ByColumn(d)

GROUP BY t

ORDER BY t
