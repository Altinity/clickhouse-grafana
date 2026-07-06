 -- [Default Config] Database.Table Concatenation Test
-- Pattern: $test_default.$test_single  
-- Expected: database1.users (NO quotes)
-- Check Query Inspector to see actual interpolation

 SELECT *

 FROM $test_default.$test_single

 WHERE 1 = 1

 LIMIT 1
