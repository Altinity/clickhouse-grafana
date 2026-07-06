SELECT 
  'Test Pattern' as pattern,
  'Variable Config' as config,
  'Expected Result' as expected
UNION ALL
SELECT 
  '${test_default}.${test_single}',
  'Braced Syntax',
  'database1.users (no quotes)'