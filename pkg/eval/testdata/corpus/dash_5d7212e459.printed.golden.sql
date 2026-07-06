 SELECT
     $timeSeries as t,
     count()
 FROM default.test_grafana

 WHERE
     $timeFilter
     AND service_name = 'mysql'
 GROUP BY t

 ORDER BY t
