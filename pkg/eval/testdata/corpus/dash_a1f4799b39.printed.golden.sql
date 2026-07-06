 SELECT
     UserName,
     sum(req_count) req
 FROM $table

 WHERE $timeFilter

 GROUP BY UserName
