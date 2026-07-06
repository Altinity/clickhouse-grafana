 $rateColumnsAggregated(
     Name,
     if(today() % 2, 'subTest1', 'subTest2') AS SubName,
     sum,
     Value) SELECT
 FROM $table
