 SELECT a

 FROM default.test_grafana

 WHERE name IN (
    SELECT Names

    FROM
(
        SELECT Names

        FROM default.t

)
    ARRAY JOIN
(
 Names

) )
