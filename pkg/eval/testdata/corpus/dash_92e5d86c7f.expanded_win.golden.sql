SELECT 
  'Backend Macro Tests' as category,
  '' as test_case,
  '' as pattern,
  '' as note
UNION ALL
SELECT '', 'Table Macro Mix', 'SELECT * FROM default.test_grafana WHERE event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706)', 'User var vs macro'
UNION ALL
SELECT '', 'Adhoc Mix', 'WHERE $adhoc AND service = $test_default', 'Macro + user var'
UNION ALL
SELECT '', 'Partial Replace', 'mydb.$test_single WHERE db = $test_default', 'One var replaced'
UNION ALL
SELECT '', 'Multi Replace', '$test_default.$test_single.$test_dangerous', 'Sequential replace'
UNION ALL
SELECT '', 'Rate Macro', 'SELECT $rate(value, EventTime) FROM $test_default.$test_single', 'Macro function'