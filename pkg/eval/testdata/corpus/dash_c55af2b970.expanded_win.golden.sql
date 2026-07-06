SELECT initial_user
FROM clusterAllReplicas('{cluster}',merge(system,'^query_log'))
WHERE
 event_date BETWEEN toDate(1735787045000 / 1000) AND toDate(1735790706000 / 1000)
 AND event_time BETWEEN toDateTime(1735787045000 / 1000) AND  toDateTime(1735790706000 / 1000)
 AND type <> 1
 $conditionalTest(AND hostName() in ($hostname),$hostname)
 $conditionalTest(AND query_kind in ($query_kind),$query_kind)
GROUP BY initial_user
ORDER BY count() DESC
SETTINGS skip_unavailable_shards=1