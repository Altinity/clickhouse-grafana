 SELECT
     (intDiv(toUInt32(event_time), $interval)) * $interval * 1000 as t,
     host,
     max(_metric) as metric
 FROM
(
     WITH arrayJoin([(CurrentMetric_TCPConnection, 'TCP'), (CurrentMetric_HTTPConnection, 'HTTP'), (CurrentMetric_InterserverConnection, 'Interserver'), (CurrentMetric_MySQLConnection, 'MySQL')]) as m
     SELECT
         event_time,
         m .2 || ' ' || hostName() as host,
         sum(m .1) AS _metric
     FROM clusterAllReplicas('{cluster}', merge(system,'^metric_log'))

     WHERE $timeFilter $conditionalTest( AND hostName() in ($hostname), $hostname)

     GROUP BY
         host,
         event_time
)
 GROUP BY
     host,
     t
 ORDER BY
     host,
     t SETTINGS skip_unavailable_shards = 1