 SELECT
     1 AS t,
     UserName,
     sum(req_count * randUniform(40, 100)) req
 FROM $table

 WHERE $timeFilter

 GROUP BY UserName

 ORDER BY req DESC

 LIMIT 5
