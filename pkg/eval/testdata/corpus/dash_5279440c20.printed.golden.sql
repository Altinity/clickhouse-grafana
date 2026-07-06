 SELECT
     $timeSeries as t,
     count() as events
 FROM default.streaming_test

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
