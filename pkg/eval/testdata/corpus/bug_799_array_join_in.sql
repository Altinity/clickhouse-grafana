-- corpus: tags=subquery,arrayjoin,known-bug,issue-799
SELECT a FROM default.test_grafana WHERE name IN (SELECT Names FROM (SELECT Names FROM default.t) ARRAY JOIN Names)
