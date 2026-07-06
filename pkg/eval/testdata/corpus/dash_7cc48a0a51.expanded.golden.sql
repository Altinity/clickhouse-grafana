SELECT 
  'Test Pattern' as pattern,
  'Variable Config' as config,
  'Expected Result' as expected
UNION ALL
SELECT 
  '$test_default:$test_numeric',
  'Default + Numeric',
  'database1:8080,8081 (no quotes)'