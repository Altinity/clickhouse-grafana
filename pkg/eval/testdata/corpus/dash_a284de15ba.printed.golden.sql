 SELECT
     $timeSeries as t,
     host,
     avg(memory_usage) as memory
 FROM default.streaming_test

 WHERE $timeFilter

 GROUP BY
     t,
     host
 ORDER BY t
