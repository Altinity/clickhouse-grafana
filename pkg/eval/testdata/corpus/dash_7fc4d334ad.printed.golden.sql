 SELECT count() as count

 FROM default.test_grafana

 WHERE service_name IN (${repeated_service})

 GROUP BY service_name

 ORDER BY count DESC
