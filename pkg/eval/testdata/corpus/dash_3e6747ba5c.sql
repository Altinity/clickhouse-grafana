with 
   (intDiv(toUInt32(event_time), $interval)) as query_finish,
   (intDiv(toUInt32(query_start_time), $interval)) as query_start,
   arrayMap( i -> ( query_start + i ) * $interval * 1000, range(query_finish - query_start + 1) ) as timestamps
SELECT 
    arrayJoin(timestamps) as t,
    initial_user as u,
    ${metric:raw} as m
FROM clusterAllReplicas('{cluster}', merge(system,'^query_log'))
WHERE 
    event_date BETWEEN toDate($__from / 1000) - INTERVAL 1 DAY AND toDate($__to / 1000) + INTERVAL 1 DAY
    AND event_time BETWEEN toDateTime($__from / 1000) - INTERVAL 20 MINUTE AND toDateTime($__to / 1000) + INTERVAL 20 MINUTE
    AND type!=1
    $conditionalTest(AND hostName() in ($hostname),$hostname)
    $conditionalTest(AND query_kind in ($query_kind),$query_kind)
    $conditionalTest(AND exception_code in ($exception_code),$exception_code)
    $conditionalTest(AND initial_user in ($user),$user)
    $conditionalTest(AND normalized_query_hash in [$query_hash],$query_hash)
    AND t BETWEEN $__from  AND $__to
GROUP BY u,t
ORDER BY count(t) OVER(PARTITION BY u) DESC, sum(m) OVER(PARTITION BY u) DESC 
LIMIT 100 BY t
SETTINGS skip_unavailable_shards=1