 SELECT
     $timeSeries as t,
     count()
 FROM default.test_grafana

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
