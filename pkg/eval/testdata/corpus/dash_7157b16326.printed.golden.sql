 SELECT
     country,
     count() as count
 FROM default.test_grafana

 GROUP BY country

 ORDER BY count DESC

 LIMIT 10
