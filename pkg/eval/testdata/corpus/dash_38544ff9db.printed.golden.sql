 SELECT
     $timeSeries as t,
     sum(too_big_value) as metric
 FROM $table

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
