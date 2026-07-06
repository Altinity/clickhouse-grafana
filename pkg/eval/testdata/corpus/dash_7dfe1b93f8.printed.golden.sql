 -- [Single Config] Variable.Suffix Concatenation Test
-- Pattern: $test_single.suffix
-- Expected: users.suffix (NO quotes) - Single config never quotes!
-- Check Query Inspector to see actual interpolation

 SELECT *

 FROM $test_single.suffix

 WHERE 1 = 1

 LIMIT 1
