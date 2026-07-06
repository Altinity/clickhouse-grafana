with 
   (intDiv(toUInt32(event_time), 30)) as query_finish,
   (intDiv(toUInt32(query_start_time), 30)) as query_start,
   arrayMap( i -> ( query_start + i ) * 30 * 1000, range(query_finish - query_start + 1) ) as timestamps
SELECT 
    arrayJoin(timestamps) as t,
    normalized_query_hash,
    ${metric:raw} as m
FROM merge(system,'^query_log')
WHERE 
    event_date BETWEEN toDate(1735787045000 / 1000) - INTERVAL 1 DAY AND toDate(1735790706000 / 1000) + INTERVAL 1 DAY
    AND event_time BETWEEN toDateTime(1735787045000 / 1000) - INTERVAL 20 MINUTE AND  toDateTime(1735790706000 / 1000) + INTERVAL 20 MINUTE
    AND type!=1
    $conditionalTest(AND hostName() in ($hostname),$hostname)
    $conditionalTest(AND query_kind in ($query_kind),$query_kind)
    $conditionalTest(AND exception_code in ($exception_code),$exception_code)
    $conditionalTest(AND initial_user in ($user),$user)
    AND normalized_query_hash in [$query_hash]
    AND t BETWEEN 1735787045000  AND 1735790706000
GROUP BY normalized_query_hash, t
ORDER BY count(t) OVER(PARTITION BY normalized_query_hash) DESC, sum(m) OVER(PARTITION BY normalized_query_hash) DESC
LIMIT 200 BY t