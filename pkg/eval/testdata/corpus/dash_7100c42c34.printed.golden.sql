 $columns(
     service_name,
     count() c) SELECT
 FROM $table

 WHERE
     service_name IN (${repeated_service})
     AND $timeFilter