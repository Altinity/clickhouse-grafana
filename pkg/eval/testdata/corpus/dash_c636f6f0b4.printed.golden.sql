 SELECT
     toUInt64(event_time) * 1000 as t_local,
     event_time as t_orig,
     count() c,
     sum(too_big_value) s
 FROM $table

 WHERE $timeFilter

 GROUP BY
     t_local,
     t_orig
 ORDER BY t_local
