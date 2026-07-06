select toInt32(now()-300)*1000 as t, groupArray((label, value))
from (
  select 'test' as label, 1 as value
  union all
  select NULL as label, 2 as value
)