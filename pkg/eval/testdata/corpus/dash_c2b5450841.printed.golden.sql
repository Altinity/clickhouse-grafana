 SELECT
     $timeSeries as t,
     service_name,
     count()
 FROM $table

 WHERE $timeFilter $conditionalTest( AND service_name IN ($service_name), $service_name)

 GROUP BY
     t,
     service_name
 ORDER BY t
