$columns(service_name,
    count() c
)
FROM $table  WHERE [service_name, ' test array'] IN (${array_var}) AND $timeFilter
