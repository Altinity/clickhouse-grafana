 $columns(
     dataMap.key AS key,
     sum(dataMap.value) AS value) SELECT
 FROM default.nested_array_join_example

 ARRAY JOIN
(
 dataMap

) 
    WHERE 
    $timeFilter