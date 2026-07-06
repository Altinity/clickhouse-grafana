SELECT 
  'Advanced Concatenation' as category,
  '' as test_case,
  '' as pattern,
  '' as expected
UNION ALL
SELECT '', 'Numeric Suffix', '$test_single.8090', 'No quotes (bug test)'
UNION ALL
SELECT '', 'Port Pattern', '$test_default.8090.svc', 'No quotes'
UNION ALL
SELECT '', 'Identifier Suffix', '$test_single.identifier', 'No quotes'
UNION ALL
SELECT '', 'Multiple Dots', '$test_default..$test_single', 'No quotes'
UNION ALL
SELECT '', 'Three Level', '$test_default.$test_single.$test_dangerous', 'No quotes'