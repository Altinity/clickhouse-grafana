 SELECT
     $timeSeries as t,
     sum(value)
 FROM $table

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
