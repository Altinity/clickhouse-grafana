 SELECT
     $timeSeries as t,
     sum(too_big_value) * 8 / $interval AS B
 FROM $table

 WHERE
     event_time BETWEEN $from
     AND $to
     AND $adhoc
 GROUP BY t

 ORDER BY t WITH FILL STEP($interval * 1000 * 5)
