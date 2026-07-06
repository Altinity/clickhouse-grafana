SELECT 
  'Complex Scenarios' as category,
  '' as test_case,
  '' as pattern,
  '' as behavior
UNION ALL
SELECT '', 'Quoted Multi-Var', "WHERE host = '$test_default.$test_single.$test_dangerous.local'", 'All unquoted'
UNION ALL
SELECT '', 'Mixed Contexts', 'FROM $test_default.$test_single WHERE db = $test_default', 'Context differs'
UNION ALL
SELECT '', 'Nested Quotes', "WHERE path = '/$test_default/$test_single' AND host = '$test_default'", 'Quote contexts'
UNION ALL
SELECT '', 'Array Access', 'SELECT $test_array[$test_numeric]', 'Array pattern'
UNION ALL
SELECT '', 'Math Operations', 'WHERE value = $test_numeric + $test_numeric', 'Math context'
UNION ALL
SELECT '', 'Function Call', 'SELECT $test_func($test_default, $test_single)', 'Function args'