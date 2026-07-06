SELECT initial_user
FROM clusterAllReplicas('{cluster}',merge(system,'^query_log'))
WHERE
 event_date BETWEEN toDate($__from / 1000) AND toDate($__to / 1000)
 AND event_time BETWEEN toDateTime($__from / 1000) AND  toDateTime($__to / 1000)
 AND type <> 1
 $conditionalTest(AND hostName() in ($hostname),$hostname)
 $conditionalTest(AND query_kind in ($query_kind),$query_kind)
GROUP BY initial_user
ORDER BY count() DESC
SETTINGS skip_unavailable_shards=1