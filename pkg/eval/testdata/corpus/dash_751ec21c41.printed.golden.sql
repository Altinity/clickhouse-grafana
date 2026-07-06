 SELECT
     $timeSeries as t,
     count()
 FROM $template_db.$template_table

 WHERE $timeFilter

 GROUP BY t

 ORDER BY t
