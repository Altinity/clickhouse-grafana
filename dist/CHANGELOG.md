# 1.8.1 (2019-02-01)

## New features:

* Add `timeFilterByColumn` macro (thx to @simPod) #68

## Fixes:

* add requestId to queries so that abandoned one are cancelled (thx to @nvartolomei)
* bug with parentheses in `$unescape` macros #90
* bug with treating string as numbers in table view #97


# 1.8.0 (2018-11-07)

## New features

* new $perSecond and $perSecondColumns macros (thx to @simPod) #78 #80
* Date column is now optional #48

## Fixes:

* extend queried timerange for queries with round option to provide a graph without gaps in the rightmost and leftmost points #84
* adhocs: check whether it is possibly to apply filters by comparing with parsed query or query builder settings #86


# 1.7.0 (2018-09-05)

## New Features

* provide $adhoc macros for using ad-hoc filters in inner queries (thx to @vavrusa)
* allow to set custom query for ad-hoc filter via `adhoc_query_filter` variable
* provide new `Round` value `$step` for auto-rounding according to graph resolution changes


# 1.6.0 (2018-08-07)

## New Features

* annotations support (txh to @atsirin)
* allow to use `$from` and `$to` macroses in variable queries
* provisioning config example in README


# 1.5.1 (2018-06-05)

## Fixes

* optimize memory use for range time series (thx to @vavrusa)
* apply ad-hoc filters on inner subqueries (thx to @vavrusa)


# 1.5.0 (2018-05-31)

## New Features

* new datasource setting - `default database`. If set it will be prefilled in the query builder, and used to make ad-hoc filters more convenient (thx to @vavrusa)
* support wildcard ad-hoc filters for dashboards using multiple tables (thx to @vavrusa)
* parse dimensions from GROUP BY to simplify querying (see [piechart](https://github.com/Vertamedia/clickhouse-grafana#piechart-httpsgrafanacompluginsgrafana-piechart-panel) and [worldmap](https://github.com/Vertamedia/clickhouse-grafana#worldmap-panel-httpsgithubcomgrafanaworldmap-panel) examples) (thx to @vavrusa)
* `$timeCol` to `$dateCol` renamed to be more clear with column types (thx to @simPod)


# 1.4.3 (2018-04-09)

## Fixes

* fix broken AST when using nested `SELECT` without `FROM` statement (#45)
* strict statement matching (#44)
* rebuild queries from AST only if adhoc filters were applied


# 1.4.2 (2018-03-18)

## Fixes

* support `UNION ALL` statements
* proper format for `LIMIT N,M` construction (thx to @shankerwangmiao)
* update `Show Help` section with $unescape description


# 1.4.1 (2018-03-12)

## New Features

* $unescape - unescapes variable value by removing single quotes. Used for multiple-value string variables: "SELECT $unescape($column) FROM requests WHERE $unescape($column) = 5"

## Fixes

* labmda-operator `->` no more breaks while reformatting query


# 1.4.0 (2018-03-08)

## New Features

Ad-hoc filters support:
* If there is an Ad-hoc variable, plugin will fetch all columns of all tables of all databases (except system database) as tags.
So in dropdown menu will be options like `database.table.column`
* If there are ENUM columns, plugin will fetch their options and use them as tag values
* Plugin will apply Ad-hoc filters to all queries on the dashboard if their settings `$database` and `$table` are the same
as Ad-hoc's `database.table`
* There are no option to apply OR operator for multiple Ad-hoc filters - see grafana/grafana#10918
* There are no option to use IN operator for Ad-hoc filters due to Grafana limitations

# 1.3.1 (2018-02-12)

## Fixes

* support array indexing int AST


# 1.3.0 (2018-02-07)

## New Features
* columns autocompletion in ace-editor

# 1.2.7 (2018-01-05)

## Fixes

* properly format query with reserved names
* fix #31


# 1.2.6 (2017-12-13)

## Fixes
* allow rounding with `round` option both time filters: $from and $to


# 1.2.5 (2017-12-05)

## Fixes
* support template variables with different `text` and `value` values [#27](https://github.com/Vertamedia/clickhouse-grafana/issues/27)
* fix visual glitches [#29](https://github.com/Vertamedia/clickhouse-grafana/issues/29)


# 1.2.4 (2017-11-22)

## Fixes
* apply proper value formatting for table format


# 1.2.3 (2017-11-20)

## Fixes
* commit generated files


# 1.2.2 (2017-11-20)

## Fixes
* fix error with absent `getCollapsedText` [#24](https://github.com/Vertamedia/clickhouse-grafana/issues/24)
* suppress errors while parsing AST [#24](https://github.com/Vertamedia/clickhouse-grafana/issues/24)
* show generated SQL in textarea [#24](https://github.com/Vertamedia/clickhouse-grafana/issues/24)
* do not round timestamp after converting [#25](https://github.com/Vertamedia/clickhouse-grafana/issues/25)
* increase max-height of query editor


# 1.2.1 (2017-11-17)

## Fixes
* add forgotten completions
* process NULL values [#19](https://github.com/Vertamedia/clickhouse-grafana/issues/19)
* sort by key value in `$columns` macro [#16](https://github.com/Vertamedia/clickhouse-grafana/issues/16)


# 1.2.0 (2017-11-15)

## New Features
* Ace editor
* ClickHouse function completion (thx to https://github.com/smi2/tabix.ui)


# 1.1.0 (2017-11-13)

## New Features
* Allow `UInt32` as Timestamp column [#15](https://github.com/Vertamedia/clickhouse-grafana/issues/15)
* Add `Format as Table` format [#17](https://github.com/Vertamedia/clickhouse-grafana/issues/17)