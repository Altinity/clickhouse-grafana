SELECT
    1 AS t, /* fake timestamp value */
    UserName,
    sum(req_count) AS req
FROM requests
GROUP BY t, UserName
ORDER BY req DESC
LIMIT 5,10000000000000 /* select some ridiculous number after first 5 */
