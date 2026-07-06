 SELECT
     $timeSeries as t,
     count()
 FROM $table

 WHERE $timeFilter $conditionalTest( AND country = ${country:sqlstring}, $country)

 GROUP BY t

 ORDER BY t
