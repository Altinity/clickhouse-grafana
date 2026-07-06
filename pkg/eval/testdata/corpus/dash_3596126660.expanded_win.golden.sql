SELECT    
  (intDiv(toUInt32(event_time), 30)) * 30 * 1000 as t,
  host,
  avg(m)
FROM 
(
SELECT 
    event_time,
    hostName() as host,
    sum(CurrentMetric_MemoryTracking) AS m
FROM clusterAllReplicas('{cluster}', merge(system,'^metric_log'))
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
$conditionalTest(AND hostName() in ($hostname),$hostname)
GROUP BY host,event_time
)
GROUP BY host,t
ORDER BY host,t
SETTINGS skip_unavailable_shards=1