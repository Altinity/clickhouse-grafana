 -- Test user's original issue query pattern

 SELECT
     1 as test_value,
     '$container.$selectednamespace.8090.svc' as host_pattern,
     CASE WHEN position('$container.$selectednamespace.8090.svc', '.') > 0 THEN 'SUCCESS: Concatenation worked - contains dots' ELSE 'FAILED: Variables not properly concatenated' END as status,
     -- Simulate a real query that would use this pattern
 concat('http://', '$container.$selectednamespace.8090.svc', '/metrics') as endpoint_url