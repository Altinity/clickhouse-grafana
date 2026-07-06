SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    count()
FROM $template_db.$template_table
WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
GROUP BY t
ORDER BY t