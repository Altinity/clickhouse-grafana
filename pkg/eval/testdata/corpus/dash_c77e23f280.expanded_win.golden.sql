SELECT 
  'Edge Case Tests' as category,
  '' as test_case,
  '' as pattern,
  '' as issue
UNION ALL
SELECT '', 'Empty Variable', 'WHERE name = $test_empty', 'Empty string handling'
UNION ALL
SELECT '', 'Null Variable', 'WHERE id = $test_null', 'Null handling'
UNION ALL
SELECT '', 'Dots in Value', 'FROM $test_dots.$test_single', 'Value: my.host.com'
UNION ALL
SELECT '', 'Empty Multi', 'WHERE id IN ($test_multi)', 'Empty () breaks SQL'
UNION ALL
SELECT '', 'Unicode Names', 'WHERE 名前 = $test_unicode', 'Unicode handling'
UNION ALL
SELECT '', 'Long Variable', '$test_very_long_variable_name_that_exceeds_normal_length', 'Long names'
UNION ALL
SELECT '', 'Regex Pattern', 'WHERE path REGEXP $test_regex', 'Pattern: /^prefix_.*/'