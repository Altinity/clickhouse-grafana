SELECT a FROM default.test_grafana WHERE id IN (SELECT id FROM default.other WHERE flag = 1 LIMIT 10)
