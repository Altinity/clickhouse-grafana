SELECT 
    $timeSeries as t,
    hostName() as host,
    max(CurrentMetric_Query) as QueriesRunning
FROM clusterAllReplicas('{cluster}', merge(system,'^metric_log'))
WHERE 
$timeFilter
$conditionalTest(AND hostName() in ($hostname),$hostname)
GROUP BY host,t
ORDER BY host,t
SETTINGS skip_unavailable_shards=1