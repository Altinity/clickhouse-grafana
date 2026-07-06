 $columns(
     service_name,
     count() c) SELECT
 FROM remote('${remote_host}',default.test_grafana)

 WHERE
     [service_name, ' test array'] IN (${array_var})
     AND $timeFilter