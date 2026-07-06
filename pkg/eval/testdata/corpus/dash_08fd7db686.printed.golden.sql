 SELECT
     1 AS t,
     concat('Category ', toString(cat)) AS cat,
     count(idx) AS errors
 FROM
(
     SELECT
         rand() % 4 + 1 AS cat,
         /* Random category */
 rand() % 100 AS idx/* Random idx values */

     FROM
         numbers(1000)
         /* More rows for higher variability */
 subquery

)
 GROUP BY
     t,
     cat