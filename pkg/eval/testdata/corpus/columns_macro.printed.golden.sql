 $columns(
     service_name,
     sum(agg_value) as value) SELECT
 FROM $table

 WHERE $timeFilter

 GROUP BY service_name
