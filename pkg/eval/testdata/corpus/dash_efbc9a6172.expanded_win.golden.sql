SELECT DISTINCT trace_id
FROM system.opentelemetry_span_log
WHERE parent_span_id = 0
    AND finish_date >= toDate(now() - 60)
    AND intDiv(finish_time_us, 1000000) >= toUInt32(now() - 60)
ORDER BY finish_time_us DESC
LIMIT 100