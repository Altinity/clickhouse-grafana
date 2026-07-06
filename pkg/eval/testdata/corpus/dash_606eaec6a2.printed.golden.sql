 -- [Complex Mix] URL Path Concatenation Test
-- Pattern: https://$test_default/$test_single/api
-- Expected: https://database1/users/api (NO quotes)
-- Check Query Inspector to see actual interpolation

 SELECT *

 FROM system.one

 WHERE url = 'https://$test_default/$test_single/api'

 LIMIT 1
