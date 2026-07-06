 SELECT toString(exception_code) || '__' || errorCodeToName(exception_code)

 FROM clusterAllReplicas('{cluster}', merge(system,'^query_log'))

 WHERE
     event_date BETWEEN toDate($__from / 1000)
     AND toDate($__to / 1000)
     AND event_time BETWEEN toDateTime($__from / 1000)
     AND toDateTime($__to / 1000)
     AND type != 1 $conditionalTest( AND hostName() in ($hostname), $hostname) $conditionalTest( AND query_kind in ($query_kind), $query_kind) $conditionalTest( AND(initial_user in ($user) OR user in ($user)), $user)
 GROUP BY exception_code

 ORDER BY count() DESC

 LIMIT 100 SETTINGS skip_unavailable_shards = 1
