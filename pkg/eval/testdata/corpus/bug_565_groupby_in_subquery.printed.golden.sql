 $columns(
     cat,
     sum(v) value) SELECT
 FROM $table

 WHERE (a, b) IN (
    SELECT
        a,
        b
    FROM default.other

    LIMIT 10
)
