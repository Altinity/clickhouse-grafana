 SELECT
     toUInt64(event_time) * 1000 AS time,
     (toUInt64(event_time) +(rand() % 600)) * 1000 AS time_end,
     if(rand() % 2 = 1, '[alert] title', '[annotation] title') AS title,
     if(rand() % 2 = 1, '[alert] description', '[annotation] description') AS text,
     arrayStringConcat(['test1', 'test2', service_name], ',') AS tags
 FROM default.test_grafana

 WHERE
     rand() % 100 IN (150)
     AND toUInt64(event_time) >= $from
     AND toUInt64(event_time) < $to