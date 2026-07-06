SELECT t, arraySort(groupArray((key, val))) AS groupArr
FROM
(
	SELECT (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t, propId, avg(value) val, T.key
	FROM (
		  SELECT toDateTime(1735787045+toUInt32(number)*60) as event_time, propId propId, null value
		  FROM numbers(toUInt32((1735790706-1735787045)/60)) TNums
		  JOIN
		  (
		    SELECT 'mysql' propId UNION ALL
		    SELECT 'postgresql' propId
		  ) TProps
		  ON 1=1
		  UNION ALL
		  SELECT event_time, default.test_grafana.service_name AS propId, too_big_value AS value FROM default.test_grafana
		  WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)
			  AND default.test_grafana.service_name IN ('mysql','postgresq')
		) TData
	JOIN (
	  SELECT 'mysql' propId, '0 exit.temp' key UNION ALL
	  SELECT 'postgresql' propId, '2 mid.temp' key UNION ALL
	  SELECT 'mysql' propId, '3 bottom.temp' key UNION ALL
	  SELECT 'postgresql' propId, '1 top.temp' key
	) T USING propId
	GROUP BY t, propId, T.key
	ORDER BY t, T.key
) TR
GROUP BY t
ORDER BY t