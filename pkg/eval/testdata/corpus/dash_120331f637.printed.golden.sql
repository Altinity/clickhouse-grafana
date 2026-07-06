 SELECT *

 FROM
(
     SELECT
         $timeSeries as t,
         count() as c
     FROM $table

     WHERE
         service_name IN ($repeated_service)
         AND $timeFilter
     GROUP BY t

)
 ORDER BY t
