SELECT
  (arrayMap(
    x -> if(addressToSymbol(x) != '', demangle(addressToSymbol(x)), 'unknown'),
    arrayJoin(
      arrayPopFront(
      arrayMap(
        x -> arraySlice(reverse(trace), 1, x),
        range(length(trace) - 1)
      )
      )
    )
  ) AS trace_level)[-1] AS label,
  count() AS value,
  length(trace_level) AS level,
  countIf(length(trace)-2 = length(trace_level)) AS self
FROM default.test_grafana
WHERE trace_type='Real' AND event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) 
GROUP BY trace_level
ORDER BY trace_level,level SETTINGS allow_introspection_functions=1