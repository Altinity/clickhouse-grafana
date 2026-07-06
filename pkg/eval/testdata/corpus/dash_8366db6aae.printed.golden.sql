 SELECT
     toInt32(now() - 300) * 1000 as t,
     groupArray((label, value))
 FROM
(
     SELECT
         'test' as label,
         1 as value

     UNION ALL

     SELECT
         NULL as label,
         2 as value
)