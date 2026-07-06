 WITH cte2 as(select cte2_field, blatenant "Alias" FROM cte2_table WHERE 1 $conditionalTest(AND cte2_tenant in ($Tenant), AND cte2_tenant = 'default_tenant', $Tenant))
 SELECT * EXCEPT("excluded_column")

 FROM cte2
