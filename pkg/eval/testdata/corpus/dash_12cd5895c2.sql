$rate(
 countIf(service_name='mysql' AND from_user='bob') AS mysql_bob, countIf(service_name='postgres') AS postgres
) 
FROM $table
WHERE from_user IN ('bob','alice')