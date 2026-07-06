$columns(
 service_name,
 count() as sum_req
) FROM $table  
WHERE
    $timeFilter
    AND service_name != 'deprecated'
GROUP BY t, service_name
ORDER BY service_name, t WITH FILL STEP 6000
