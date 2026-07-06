 SELECT
     trace_id AS traceID,
     span_id AS spanID,
     operation_name AS operationName,
     parent_span_id AS parentSpanID,
     'clickhouse' AS serviceName,
     intDiv(finish_time_us - start_time_us, 1000) AS duration,
     toDateTime64(start_time_us / 1000000, 3, 'Europe/Moscow') AS startTime,
     attribute AS tags,
     map('hostName', hostname) AS serviceTags
 FROM $table

 WHERE $timeFilter

 ORDER BY
     traceID,
     startTime