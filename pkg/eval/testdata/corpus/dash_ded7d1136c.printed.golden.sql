 SELECT
     (intDiv(toUInt32(event_time), $interval)) * $interval * 1000 as t,
     'Read ' || host as h,
     avg(m)
 FROM
(
     SELECT
         event_time,
         hostName() as host,
         sum(ProfileEvent_OSReadBytes) AS m
     FROM clusterAllReplicas('{cluster}', merge(system,'^metric_log'))

     WHERE $timeFilter $conditionalTest( AND hostName() in ($hostname), $hostname)

     GROUP BY
         host,
         event_time
)
 GROUP BY
     h,
     t
 ORDER BY
     h,
     t SETTINGS skip_unavailable_shards = 1