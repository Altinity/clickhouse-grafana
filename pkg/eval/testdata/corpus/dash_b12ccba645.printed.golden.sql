 SELECT
     trace_id AS `Trace ID`,
     min(operation_name) AS `Operation`,
     count() AS `Spans`,
     intDiv(max(finish_time_us) - min(start_time_us), 1000) AS `Duration ms`,
     intDiv(min(start_time_us), 1000) AS `Start Time`
 FROM $table

 WHERE $timeFilter

 GROUP BY trace_id

 ORDER BY `Duration ms` DESC

 LIMIT 100
