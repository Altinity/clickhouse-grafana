 SELECT
     service_name,
     count() as count
 FROM default.test_grafana

 WHERE service_name IN ($service_filter)

 GROUP BY service_name

 ORDER BY count DESC
