-- corpus: tags=macro,subquery,known-bug,issue-565
$columns(cat, sum(v) value) FROM $table WHERE (a, b) IN (SELECT a, b FROM default.other LIMIT 10)
