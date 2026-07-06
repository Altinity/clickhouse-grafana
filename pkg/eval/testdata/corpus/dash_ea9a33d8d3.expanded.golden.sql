SELECT 
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    'Receive ' || host as h,
    max(val) as v
FROM 
(
    SELECT 
        event_time,
        hostName() as host,
        anyIf(value, metric LIKE 'NetworkReceiveBytes%') / anyIf(value, metric = 'AsynchronousMetricsUpdateInterval')  as val
    FROM clusterAllReplicas('{cluster}', merge(system,'^asynchronous_metric_log'))
    WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
    $conditionalTest(AND hostName() in ($hostname),$hostname)
    AND (metric LIKE 'NetworkReceiveBytes%' OR metric = 'AsynchronousMetricsUpdateInterval')
    GROUP BY host,event_time
)
GROUP BY h,t
ORDER BY h,t
SETTINGS skip_unavailable_shards=1