SELECT 
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    hostName() as host,
    max(value) as LoadAverage1
FROM clusterAllReplicas('{cluster}', merge(system,'^asynchronous_metric_log'))
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
$conditionalTest(AND hostName() in ($hostname),$hostname)
AND metric = 'LoadAverage1'
GROUP BY host,t
ORDER BY host,t
SETTINGS skip_unavailable_shards=1