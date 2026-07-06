 SELECT
     event_time as _time,
     content as _content,
     level as _level
 FROM default.test_logs

 WHERE $timeFilter

 ORDER BY _time DESC

 LIMIT 100
