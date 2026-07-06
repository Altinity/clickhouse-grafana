 $lttbMs(
     auto,
     category,
     event_time,
     requests) SELECT
 FROM $table

 WHERE $timeFilter

 GROUP BY category
