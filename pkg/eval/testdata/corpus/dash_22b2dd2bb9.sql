$columns(
  service_name,   
  sum(agg_value) as value
)
FROM (
 SELECT toDateTime(t/1000) AS event_time, service_name, agg_value
 FROM (
  SELECT
    $timeSeries as t,
    service_name,
    sum(too_big_value) as agg_value
  FROM $table
  WHERE $timeFilter
  GROUP BY t,service_name
 
  UNION ALL
 
  WITH (SELECT sum(too_big_value) FROM $table) AS total_value
  SELECT
    $timeSeries as t,
    service_name,
    sum(too_big_value) / total_value as agg_value
  FROM $table
  WHERE $timeFilter
  GROUP BY t,service_name
 )  
)