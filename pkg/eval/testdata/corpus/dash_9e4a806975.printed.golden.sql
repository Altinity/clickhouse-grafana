 SELECT
     'Test Pattern' as pattern,
     'Variable Config' as config,
     'Expected Result' as expected

 UNION ALL

 SELECT
     'prefix.$test_default',
     'Default Config',
     'prefix.database1 (no quotes)'