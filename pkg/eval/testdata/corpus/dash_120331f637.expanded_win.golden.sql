SELECT * FROM (
  SELECT
      (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
      count() as c
  FROM default.test_grafana
  WHERE service_name IN ($repeated_service) AND event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
  GROUP BY t
)
ORDER BY t