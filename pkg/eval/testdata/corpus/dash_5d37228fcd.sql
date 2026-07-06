$columns(service_name,
    count() c
)
FROM cluster('${cluster_name}',default.test_grafana)  WHERE [service_name, ' test array'] IN (${array_var}) AND $timeFilter
