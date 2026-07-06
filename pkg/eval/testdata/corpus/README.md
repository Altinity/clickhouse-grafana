# Golden Corpus (#733)

Frozen snapshot of the current SQL engine's behavior. Each `<name>.sql` is a
query; its goldens are the current outputs:

- `<name>.ast.golden.json`     — `ToAST()` result, JSON.
- `<name>.printed.golden.sql`  — `PrintAST(ast, " ")`.
- `<name>.expanded.golden.sql` — `ApplyMacrosAndTimeRangeToQuery()`, window=false.
- `<name>.expanded_win.golden.sql` — same, window=true.
- `<name>.error.golden.txt`    — for cases tagged `expect=error`.

First line of a `.sql` may be a directive:
`-- corpus: expect=error tags=macro,subquery,issue-565`

## Commands
- Verify (CI): `go test ./pkg/eval -run TestGoldenCorpus`
- Regenerate after an INTENTIONAL change: `go test ./pkg/eval -run TestGoldenCorpus -args -update`
- Re-extract dashboards: `go test ./pkg/eval -run TestExtractDashboardCorpus -args -update`
- Oracle (advisory): `go test -tags corpusoracle ./pkg/eval -run TestOracle -v`

## Rule
Never hand-edit a `.golden.*` file. If a code change alters a golden, that is a
behavior change — regenerate with `-update` and justify the diff in the PR.

## Gotchas
- `go mod tidy` run WITHOUT `-tags corpusoracle` will STRIP the
  `github.com/AfterShip/clickhouse-sql-parser` require — it is only referenced
  from the build-tagged `oracle_test.go`. Always run `go mod tidy` with the tag
  (`go mod tidy -tags corpusoracle`), or don't run it against this dependency.
- The dashboard-extraction generator (`TestExtractDashboardCorpus`) only runs
  under `-args -update` and is a no-op otherwise, so normal CI never regenerates
  corpus files.
