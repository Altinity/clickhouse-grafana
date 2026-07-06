 SELECT
     $timeSeries as t,
     service_name,
     count()
 FROM default.test_grafana

 WHERE $timeFilter

 GROUP BY
     t,
     service_name
 ORDER BY t
