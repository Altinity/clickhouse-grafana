SELECT    
  (intDiv(toUInt32(event_time), $interval)) * $interval * 1000 as t,
  'Fetch ' || host as h,
  avg(m)
FROM 
(
SELECT 
    event_time,
    hostName() as host,
    sum(CurrentMetric_ReplicatedFetch) AS m
FROM clusterAllReplicas('{cluster}', merge(system,'^metric_log'))
WHERE $timeFilter
$conditionalTest(AND hostName() in ($hostname),$hostname)
GROUP BY host,event_time
)
GROUP BY h,t
ORDER BY h,t
SETTINGS skip_unavailable_shards=1