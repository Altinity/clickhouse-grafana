SELECT t, arraySort(groupArray((key, val))) AS groupArr
FROM
(
	SELECT $timeSeries as t, propId, avg(value) val, T.key
	FROM (
		  SELECT toDateTime($from+toUInt32(number)*60) as event_time, propId propId, null value
		  FROM numbers(toUInt32(($to-$from)/60)) TNums
		  JOIN
		  (
		    SELECT 'mysql' propId UNION ALL
		    SELECT 'postgresql' propId
		  ) TProps
		  ON 1=1
		  UNION ALL
		  SELECT event_time, $table.service_name AS propId, too_big_value AS value FROM $table
		  WHERE $timeFilter
			  AND $table.service_name IN ('mysql','postgresq')
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