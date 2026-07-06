with 
   (intDiv(toUInt32(event_time), 30)) as query_finish,
   (intDiv(toUInt32(query_start_time), 30)) as query_start,
   arrayMap( i -> ( query_start + i ) * 30 * 1000, range(query_finish - query_start + 1) ) as timestamps
SELECT 
    arrayJoin(timestamps) as t,
    hostName() as host,
    ${metric:raw} as m
FROM clusterAllReplicas('{cluster}', merge(system,'^query_log'))
WHERE 
    event_date BETWEEN toDate(1735787045000 / 1000) - INTERVAL 1 DAY AND toDate(1735790706000 / 1000) + INTERVAL 1 DAY
    AND event_time BETWEEN toDateTime(1735787045000 / 1000) - INTERVAL 20 MINUTE AND  toDateTime(1735790706000 / 1000) + INTERVAL 20 MINUTE
    AND type!=1
    $conditionalTest(AND hostName() in ($hostname),$hostname)
    $conditionalTest(AND query_kind in ($query_kind),$query_kind)
    $conditionalTest(AND exception_code in ($exception_code),$exception_code)
    $conditionalTest(AND initial_user in ($user),$user)
    $conditionalTest(AND normalized_query_hash in ($query_hash),$query_hash)
    AND t BETWEEN 1735787045000  AND 1735790706000
GROUP BY host,t
ORDER BY host,t
SETTINGS skip_unavailable_shards=1