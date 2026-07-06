 SELECT
     service_name,
     country,
     count() as count
 FROM default.test_grafana

 GROUP BY
     service_name,
     country
 ORDER BY count DESC

 LIMIT 20
