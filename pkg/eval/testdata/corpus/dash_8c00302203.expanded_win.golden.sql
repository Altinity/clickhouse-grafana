SELECT 
  toUInt64(addMonths(toDateTime('2017-12-01'),Month))*1000 as t,
  count() AS Flights2018
FROM datasets.ontime
WHERE Year=2018
GROUP BY t, Month
ORDER BY t