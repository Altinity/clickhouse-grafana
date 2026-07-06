select t,
       array((os, count))
from (
  select toDateTime(toStartOfWeek(now(), 1)) as t, 'macOS' os, 1 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) as t, 'Linux' os, 3 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 1 week as t, 'macOS' os, 15 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 1 week as t, 'Linux' os, 25 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 2 week as t, 'macOS' os, 14 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 2 week as t, 'Linux' os, 10 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 3 week as t, 'macOS' os, 24 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 3 week as t, 'Linux' os, 18 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 4 week as t, 'macOS' os, 17 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 4 week as t, 'Linux' os, 15 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 5 week as t, 'macOS' os, 11 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 5 week as t, 'Linux' os, 22 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 6 week as t, 'macOS' os, 13 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 6 week as t, 'Linux' os, 31 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 7 week as t, 'macOS' os, 11 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 7 week as t, 'Linux' os, 19 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 8 week as t, 'macOS' os, 11 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 8 week as t, 'Linux' os, 19 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 9 week as t, 'macOS' os, 17 count
  union all
  select toDateTime(toStartOfWeek(now(), 1)) - interval 9 week as t, 'Linux' os, 24 count
)
order by t