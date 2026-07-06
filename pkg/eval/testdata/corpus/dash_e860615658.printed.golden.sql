 SELECT
     $timeSeries as t,
     Name,
     sum(Value) v
 FROM $table

 WHERE
     $timeFilter
     AND Name in ($template_variable)
 GROUP BY
     t,
     Name
 ORDER BY
     t,
     Name