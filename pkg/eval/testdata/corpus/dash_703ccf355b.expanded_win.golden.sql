WITH topx AS (
   SELECT DISTINCT CASE WHEN ${split:text} = '' THEN 'other' ELSE ${split:text} END AS filter, count() AS cnt 
   FROM default.test_grafana WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) AND $adhoc  GROUP BY ${split:text} 
   ORDER BY cnt DESC LIMIT 10
)

SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    CASE WHEN ${split:text} IN (SELECT filter FROM topx) THEN ${split:text} ELSE 'other' END AS spl,
    count()
FROM default.test_grafana

WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) AND $adhoc
GROUP BY t, spl

ORDER BY t, spl