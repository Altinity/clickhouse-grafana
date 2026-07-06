SELECT query_kind
FROM clusterAllReplicas('{cluster}',merge(system,'^query_log'))
WHERE
event_date BETWEEN toDate($__from / 1000) AND toDate($__to / 1000)
AND event_time BETWEEN toDateTime($__from / 1000) AND  toDateTime($__to / 1000)
    AND type!=1
$conditionalTest(AND hostName() in ($hostname),$hostname)
GROUP BY query_kind 
ORDER BY count() DESC
SETTINGS skip_unavailable_shards=1