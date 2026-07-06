 SELECT
     $timeSeries AS t,
     service_name,
     _table,
     count() c
 FROM merge('default','^test_grafana$')

 WHERE
     service_name IN (${repeated_service})
     AND $timeFilter
 GROUP BY
     t,
     service_name,
     _table
 ORDER BY t
