 SELECT
     (arrayJoin(variable) as x) .1 AS __text,
     x .2 AS __value
 FROM
(
     SELECT arrayMap((x, y) ->(x, y), splitByChar(',', '1m,10m,30m,1h,6h,12h,1d,7d,14d,30d'), splitByChar(',', '60,600,1800,3600,21600,43200,86400,604800,1209600,2592000')) AS variable

)