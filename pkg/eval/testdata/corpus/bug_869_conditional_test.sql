-- corpus: tags=macro,known-bug,issue-869
SELECT $conditionalTest(field = 'a', field, 'b') FROM default.test_grafana
