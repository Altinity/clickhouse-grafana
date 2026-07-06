SELECT t, arrayMap(a -> (a.1, a.2/(t/1000 - lagInFrame(t/1000,1,0) OVER ())), groupArr) FROM (SELECT t, groupArray((key, value)) AS groupArr FROM ( SELECT (intDiv(toUInt32(event_time), 30) * 30) * 1000 AS t, 'User.' || toString(from_user) || ', Serv.' || toString(service_name) as key, sum(count) as value FROM
(
    SELECT
        toStartOfMinute(event_time) AS event_time,
        service_name,
        from_user,
        count() as count
    FROM default.test_grafana

    WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) AND
        event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
    GROUP BY
        event_time,
        from_user,
        service_name
) GROUP BY t, key ORDER BY t, key) GROUP BY t ORDER BY t)