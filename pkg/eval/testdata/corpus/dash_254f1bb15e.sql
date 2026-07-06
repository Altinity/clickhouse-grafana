-- Test concatenated variables (should work without quotes)
SELECT 
  '$container.$selectednamespace.8090.svc' as concatenated_host,
  '$container' as container_only,
  '$selectednamespace' as namespace_only,
  'Expected: containervalue.namespacevalue.8090.svc' as expected_result