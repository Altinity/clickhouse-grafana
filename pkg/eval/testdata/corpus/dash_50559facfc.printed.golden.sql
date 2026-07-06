 WITH
     splitByChar('(', user_metadata_map['rp_prescreenStep'])[1] as prescreen,
     user_metadata_map['rocketStage'] AS stage,
     stage AS keys SELECT
     (intDiv(toUInt32(_time), 3600) * 3600) * 1000 as t,
     keys,
     sum(alloc_cost) as cost
 FROM default.test_barchart

 WHERE
     cluster NOT LIKE '%-sleep'
     AND cluster NOT LIKE '%_test'
     AND hpcod_resource_name != 'INTERACTIVE'
 GROUP BY
     keys,
     t
 ORDER BY
     keys,
     t