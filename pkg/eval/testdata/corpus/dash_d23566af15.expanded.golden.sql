SELECT 
       event_time AS time,
       event_time + INTERVAL (random % 600) SECONDS AS time_end,
       if(random % 2 = 1, '[alert] title', '[annotation] title') AS title,
       if(random % 2 = 1, '[alert] description', '[annotation] description') AS text,
       arrayStringConcat(['test1', 'test2', service_name],',') AS tags
FROM default.test_grafana_random
WHERE
  random % 100 IN (1,50) AND
  toUInt64(event_time) >= 1735787045 AND toUInt64(event_time) < 1735790706