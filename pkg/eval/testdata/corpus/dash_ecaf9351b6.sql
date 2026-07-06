SELECT
    $timeSeries as t,
    sum(too_big_value) as v,
    service_name
FROM $table

WHERE $timeFilter
$conditionalTest(AND service_name IN ($service_name), $service_name)
GROUP BY t, service_name
ORDER BY t
