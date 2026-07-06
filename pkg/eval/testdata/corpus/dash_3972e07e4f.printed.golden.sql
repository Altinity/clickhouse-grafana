 SELECT
     $timeSeries as t,
     count()
 FROM $table

 WHERE
     $timeFilter
     AND service_name IN ($group_array_var)
 GROUP BY t

 ORDER BY t
