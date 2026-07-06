SELECT    
  (intDiv(toUInt32(event_time), $interval)) * $interval * 1000 as t,
  host,
  avg(m)
FROM 
(
SELECT 
    event_time,
    hostName() as host,
    sum(CurrentMetric_DistributedSend) AS m
FROM clusterAllReplicas('{cluster}', merge(system,'^metric_log'))
WHERE $timeFilter
$conditionalTest(AND hostName() in ($hostname),$hostname)
GROUP BY host,event_time
)
GROUP BY host,t
ORDER BY host,t
SETTINGS skip_unavailable_shards=1