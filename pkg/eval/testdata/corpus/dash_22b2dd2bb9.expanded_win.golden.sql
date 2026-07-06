SELECT t, groupArray((service_name, value)) AS groupArr FROM ( SELECT (intDiv(toUInt32(event_time), 30) * 30) * 1000 AS t, service_name, sum(agg_value) as value FROM (
 SELECT toDateTime(t/1000) AS event_time, service_name, agg_value
 FROM (
  SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    service_name,
    sum(too_big_value) as agg_value
  FROM default.test_grafana
  WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) AND event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
  GROUP BY t,service_name
 
  UNION ALL
 
  WITH (SELECT sum(too_big_value) FROM default.test_grafana) AS total_value
  SELECT
    (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
    service_name,
    sum(too_big_value) / total_value as agg_value
  FROM default.test_grafana
  WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) AND event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
  GROUP BY t,service_name
 )  
) GROUP BY t, service_name ORDER BY t, service_name) GROUP BY t ORDER BY t