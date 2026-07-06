 SELECT
     service_name,
     count() as count
 FROM default.test_grafana

 GROUP BY service_name
