 SELECT normalized_query_hash

 FROM clusterAllReplicas('{cluster}', merge(system,'^query_log'))

 WHERE
     event_date BETWEEN toDate($__from / 1000)
     AND toDate($__to / 1000)
     AND event_time BETWEEN toDateTime($__from / 1000)
     AND toDateTime($__to / 1000)
     AND type != 1 $conditionalTest( AND hostName() in ($hostname), $hostname) $conditionalTest( AND query_kind in ($query_kind), $query_kind) $conditionalTest( AND exception_code in ($exception_code), $exception_code) $conditionalTest( AND(initial_user in ($user) OR user in ($user)), $user)
 GROUP BY normalized_query_hash

 ORDER BY ${metric:raw} DESC

 LIMIT 80 SETTINGS skip_unavailable_shards = 1
