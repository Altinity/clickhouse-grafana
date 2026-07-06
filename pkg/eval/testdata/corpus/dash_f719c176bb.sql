SELECT 
 $timeSeries AS t,
 Name,
 sum(Value) c
FROM $table
WHERE $timeFilter
GROUP BY t, Name
ORDER BY t