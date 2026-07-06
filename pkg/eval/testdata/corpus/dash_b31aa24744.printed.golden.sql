 /* panel alerts dashboard=$__dashboard, user=$__user */

 SELECT
     $timeSeries AS t,
     sum(Value * 10.01) c
 FROM $table

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
