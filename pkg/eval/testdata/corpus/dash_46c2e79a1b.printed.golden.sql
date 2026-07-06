 SELECT
     $timeSeries as t,
     sum(x)
 FROM $table

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
