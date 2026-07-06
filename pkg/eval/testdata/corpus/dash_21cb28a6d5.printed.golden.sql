 /* UI alerts with `from` and `to` */

 SELECT
     $timeSeries as t,
     count()
 FROM $table

 WHERE
     EventTime >= $from
     AND EventTime <= $to
 GROUP BY t

 ORDER BY t
