with
cte2 as (
  select cte2_field,
         blatenant "Alias"
  FROM
    cte2_table
  WHERE 1
    $conditionalTest(AND cte2_tenant in ($Tenant), $Tenant)
)
select * EXCEPT ("excluded_column")
FROM cte2