 SELECT
     event_time as t_orig,
     toUInt64(rand64() % 1000) AS t_UInt64
 FROM $table

 WHERE $timeFilter
