 WITH topx AS(SELECT DISTINCT CASE WHEN ${split:text} = '' THEN 'other' ELSE ${split:text} END AS filter, count() AS cnt FROM $table WHERE $timeFilter AND $adhoc GROUP BY ${split:text} ORDER BY cnt DESC LIMIT 10)
 SELECT
     $timeSeries as t,
     CASE WHEN ${split:text} IN (
    SELECT filter

    FROM topx
) THEN ${split:text} ELSE 'other' END AS spl,
     count()
 FROM $table

 WHERE
     $timeFilter
     AND $adhoc
 GROUP BY
     t,
     spl
 ORDER BY
     t,
     spl