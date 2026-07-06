 SELECT
     $timeSeries as t,
     hostName() as host,
     max(value) as LoadAverage1
 FROM clusterAllReplicas('{cluster}', merge(system,'^asynchronous_metric_log'))

 WHERE
     $timeFilter $conditionalTest( AND hostName() in ($hostname), $hostname)
     AND metric = 'LoadAverage1'
 GROUP BY
     host,
     t
 ORDER BY
     host,
     t SETTINGS skip_unavailable_shards = 1