 SELECT
     trace_id AS traceID,
     span_id AS spanID,
     operation_name AS operationName,
     parent_span_id AS parentSpanID,
     'clickhouse' AS serviceName,
     intDiv(finish_time_us - start_time_us, 1000) AS duration,
     intDiv(start_time_us, 1000) AS startTime,
     attribute AS tags,
     map('hostName', hostname) AS serviceTags
 FROM $table

 WHERE
     $timeFilter
     AND trace_id = '${trace_id}'
 ORDER BY startTime
