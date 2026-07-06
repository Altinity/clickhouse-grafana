$columns(OSName, sum(req_count) c)
FROM requests
INNER JOIN oses USING (OS)
