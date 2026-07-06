 SELECT
     toStartOfMinute(tm) as t,
     sum(v)
 FROM $table

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
