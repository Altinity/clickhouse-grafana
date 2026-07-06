 SELECT
     $timeSeries as t,
     count(x) * $custom_interval
 FROM $table t

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
