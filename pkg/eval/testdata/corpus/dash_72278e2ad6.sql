SELECT
    $timeSeries t, 
    sum(Cancelled)/count(*) cancelled_flights, 
    sum(DepDel15)/count(*) delayed_15min_or_more
FROM $table
WHERE $timeFilter
GROUP BY t
ORDER BY t