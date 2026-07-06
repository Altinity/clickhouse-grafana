 SELECT
     $timeSeries as t,
     count()
 FROM $table

 WHERE
     event_time >= toDateTime(intDiv($__from, 1000))
     AND event_time <= toDateTime(intDiv($__to, 1000))
 GROUP BY t

 ORDER BY t
