-- [Default Config] SQL Context Patterns Test
-- These patterns should quote variables (except single config)
-- Check Query Inspector to see actual interpolation

SELECT * FROM system.one 
WHERE name = $test_default  -- Should be quoted: 'database1'
  AND id IN ($test_multi)    -- Should be CSV: 'api','web' 
  AND service = $test_single -- Single config: NEVER quoted!
  AND port = $test_numeric   -- Numeric: no quotes
LIMIT 1