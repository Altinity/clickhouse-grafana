 SELECT
     $timeSeries as t,
     sum(too_big_value) AS v
 FROM $table

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
