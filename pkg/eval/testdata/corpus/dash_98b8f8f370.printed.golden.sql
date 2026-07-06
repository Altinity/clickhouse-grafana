 SELECT
     source AS id,
     source AS title,
     count() AS mainStat
 FROM $table

 GROUP BY id


 UNION ALL

 SELECT
     target AS id,
     target AS title,
     count() AS mainStat
 FROM $table

 GROUP BY id
