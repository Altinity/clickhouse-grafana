 -- Parameter Reference: This query demonstrates variable interpolation
-- Check Query Inspector to see how variables are interpolated
-- Variables used: $test_default, $test_single, $test_multi, $test_numeric

 SELECT
     'Variable Configuration' as config_type,
     'Concatenation Example' as concat_example,
     'SQL Context Example' as sql_example,
     'Risk Level' as risk_level
 FROM system.one

 WHERE 1 = 1-- Examples of different contexts:
-- Concatenation (no quotes): FROM $test_default.$test_single  
-- SQL context (quoted): WHERE name = $test_default
-- Multi-value (CSV): WHERE id IN ($test_multi)
-- Numeric (no quotes): WHERE port = $test_numeric

