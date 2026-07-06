SELECT *
FROM $table

WHERE $timeFilter AND $adhoc
$conditionalTest(AND content ILIKE ${filter:sqlstring},$filter)