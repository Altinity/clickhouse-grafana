SELECT 
    $timeSeries as t,
    'Receive ' || host as h,
    max(val) as v
FROM 
(
    SELECT 
        event_time,
        hostName() as host,
        anyIf(value, metric LIKE 'NetworkReceiveBytes%') / anyIf(value, metric = 'AsynchronousMetricsUpdateInterval')  as val
    FROM clusterAllReplicas('{cluster}', merge(system,'^asynchronous_metric_log'))
    WHERE $timeFilter
    $conditionalTest(AND hostName() in ($hostname),$hostname)
    AND (metric LIKE 'NetworkReceiveBytes%' OR metric = 'AsynchronousMetricsUpdateInterval')
    GROUP BY host,event_time
)
GROUP BY h,t
ORDER BY h,t
SETTINGS skip_unavailable_shards=1