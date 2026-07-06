 SELECT *

 FROM
(
     SELECT
         $timeSeries as t,
         count() as c
     FROM $table

     WHERE $timeFilter

     GROUP BY t

)
 ORDER BY t
