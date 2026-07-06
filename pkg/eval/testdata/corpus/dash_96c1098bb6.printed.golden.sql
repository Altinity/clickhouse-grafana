 SELECT
     $timeSeries as t,
     avg(value) as avg_value,
     max(value) as max_value
 FROM default.streaming_test

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
