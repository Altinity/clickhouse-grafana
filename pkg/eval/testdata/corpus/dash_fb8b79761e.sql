$rateColumns(
    'User.' || toString(from_user) || ', Serv.' || toString(service_name) as key,
    sum(count) as value
) FROM
(
    SELECT
        toStartOfMinute(event_time) AS event_time,
        service_name,
        from_user,
        count() as count
    FROM $table

    WHERE
        $timeFilter
    GROUP BY
        event_time,
        from_user,
        service_name
)