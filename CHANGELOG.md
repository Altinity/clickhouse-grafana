# 3.4.1 (2025-06-05)
## Enhancements:
* migrate from gopherjs to resource handlers for processing SQL with macros on browser


# 3.4.0 (2025-05-03)
## Enhancements:
* add query editor with syntax highlight and error handling to template variables UI, fix https://github.com/Altinity/clickhouse-grafana/issues/614
* move query parsing code to golang-only, now we use WASM on frontend, fix https://github.com/Altinity/clickhouse-grafana/issues/688
* improve Map(String, anytype) fields in logs panel, will convert as labels and allow adhoc filtering by `+` and `-` buttons, fix https://github.com/Altinity/clickhouse-grafana/issues/634
* add `$lttb` and `$lttbMs` macros to allow show down-sampled time series which will contains more outliers than avg or other kind of aggregation, fix https://github.com/Altinity/clickhouse-grafana/issues/500
* add UI option `Nullify sparce data` with this option, for multi-category requests, if some category miss value for some timestamp in response, then fill it as null, fix https://github.com/Altinity/clickhouse-grafana/pull/778
* pass WHERE filters for context window query in logs visualization, fix https://github.com/Altinity/clickhouse-grafana/issues/706
* re-implements flamegraph visualization, now `self` calculates properly, fix https://github.com/Altinity/clickhouse-grafana/issues/725
* add else condition to `$conditionalTest` macros, fix https://github.com/Altinity/clickhouse-grafana/issues/661
* multiple improvements e2e test with modern Grafana 11.x fixes and more cases coverage, thanks https://github.com/antip00
* implements time-series result parsing for format `DateTime-related type, category, metric value` with properly time-zone parsing, fix https://github.com/Altinity/clickhouse-grafana/issues/742
* improve support adhoc variables in logs format

## Fixes:
* fix corner cases for dashboards with `repeat by variable value` option, fix https://github.com/Altinity/clickhouse-grafana/issues/712
* some improvements for syntax highlight, fix https://github.com/Altinity/clickhouse-grafana/issues/746
* fix compatibility with new grafana 10.x table plugin, fix https://github.com/Altinity/clickhouse-grafana/issues/764
* fix ontime datasource example, fix https://github.com/Altinity/clickhouse-grafana/issues/763
* fix corner case for multi-value, template variables usage, fix https://github.com/Altinity/clickhouse-grafana/issues/762
* fix corner cases `Too many points to visualize properly.`, for time-series visualization in `time, category, value` format, fix https://github.com/Altinity/clickhouse-grafana/issues/705
* fix corner cases for data links, when got result with one time-series in format for multiple time-series, fix https://github.com/Altinity/clickhouse-grafana/issues/644
* fix security alerts, fix https://github.com/Altinity/clickhouse-grafana/issues/737
* fix corner cases for `transformations` in table format, fix https://github.com/Altinity/clickhouse-grafana/issues/758
* fix corner cases and simplify for `$adhoc` macros, fix https://github.com/Altinity/clickhouse-grafana/issues/779

# 3.3.1 (2024-12-27)
## Enhancements:
* Add using window functions instead of `runningDifference` and `neighbor` for macros, to avoid `allow_deprecated_error_prone_window_functions`, fix https://github.com/Altinity/clickhouse-grafana/issues/572
* Add public coverage report summary, fix https://github.com/Altinity/clickhouse-grafana/issues/660
* Add support `DateTime(timezone)` types to Annotations query, fix https://github.com/Altinity/clickhouse-grafana/issues/642
* Add single stat panel with categories, fix https://github.com/Altinity/clickhouse-grafana/issues/403
* Add log context windows size to connection settings, fix https://github.com/Altinity/clickhouse-grafana/issues/657
* Add `X-ClickHouse-SSL-Certificate-Auth` support, fix https://github.com/Altinity/clickhouse-grafana/issues/580
* Add `$columnsMs` macro, fix https://github.com/Altinity/clickhouse-grafana/issues/430
* Add `adhoc hide table names` connection settings option, fix https://github.com/Altinity/clickhouse-grafana/issues/456

## Fixes:
* Add transposed table example, fix https://github.com/Altinity/clickhouse-grafana/issues/404
* Add "show DateTime As is" dashboard to avoid show DateTime fields in browser timezone, fix https://github.com/Altinity/clickhouse-grafana/issues/450
* Refactoring `Logs` visualization, add "config from query result" transformation, fix https://github.com/Altinity/clickhouse-grafana/issues/449
* Refactoring `adhoc` filters, add connection option to allow hide table names from field name, fix https://github.com/Altinity/clickhouse-grafana/issues/456
* Checked tooltip visualization in Grafana 11.x, fix https://github.com/Altinity/clickhouse-grafana/issues/478

# 3.3.0 (2024-12-02)
## Enhancements:
* Add dynamic filters to logs panel labels, fix https://github.com/Altinity/clickhouse-grafana/issues/487, https://github.com/Altinity/clickhouse-grafana/issues/672 
* Allow change SQL for adhoc queries which select values, default query could be slow for generic use cases, depends on data, fix https://github.com/Altinity/clickhouse-grafana/issues/330
* Allow change log context window size for Logs panel in Query Editor, fix https://github.com/Altinity/clickhouse-grafana/issues/652
* Add coverage report, current line coverage is ~80%, fix https://github.com/Altinity/clickhouse-grafana/pull/663
* Add logs context window size to default values in connection settings, fix https://github.com/Altinity/clickhouse-grafana/pull/670
* Add `copy` button to `Generated SQL` area, fix https://github.com/Altinity/clickhouse-grafana/issues/659
* Add support for the float and timestamp64(X) timestamps fix https://github.com/Altinity/clickhouse-grafana/issues/626, fix https://github.com/Altinity/clickhouse-grafana/issues/371
* Resolve security dependabot alerts remove unused cypress/e2e test

## Fixes:
* extrapolation works properly on NaN
* e2e test cover more use cases

# 3.2.4 (2024-10-28)

## Enhancements:

* implements support custom http headers in alerts, fix https://github.com/Altinity/clickhouse-grafana/issues/483, thanks @addshore
* improve Logs support add Log Context and Log adhoc filters, fix https://github.com/Altinity/clickhouse-grafana/issues/646
* improve support DateTime(timezone) more consistent, fix https://github.com/Altinity/clickhouse-grafana/issues/625
* switch to go 1.23
* add more e2e test for unified and legacy alerts
* made e2e tests more stable

## Fixes:

* fix corner case in AST parsing to properly count open and close brackets, fix https://github.com/Altinity/clickhouse-grafana/issues/648
* fix bug in connection settings, when turn on `default values`, then Default field values drop down selectors do not work with BasicAuth,
  fix https://github.com/Altinity/clickhouse-grafana/issues/624, https://github.com/Altinity/clickhouse-grafana/issues/632
* fix bug in connection settings, when turn on `default values`, then Default field values drop down doesn't show DateTime64 fields,
  fix https://github.com/Altinity/clickhouse-grafana/issues/630

# 3.2.3 (2024-09-03)
## Fixes:
* fix default values in connection editor behavior when changing fields, also change URL, fix https://github.com/Altinity/clickhouse-grafana/issues/615

# 3.2.2 (2024-08-11)
## Enhancements:
* improve e2e tests, more scenarios covered
* if query is filled then switched to Query Editor instead of Query Settings, fix https://github.com/Altinity/clickhouse-grafana/issues/605 

## Fixes: 
* remove `information_schema` from adhoc system.columns drop down query
* fix issues with `use defaul values` option in connection settings dialog, fix https://github.com/Altinity/clickhouse-grafana/issues/600  
* fix query reset error when edit multiple queries panel, fix https://github.com/Altinity/clickhouse-grafana/issues/604
* properly handle empty response with 502 status code, fix https://github.com/Altinity/clickhouse-grafana/issues/595

# 3.2.1 (2024-06-25)
## Fixes:
* fix wrong time series conversion when custom GROUP BY clause, fix https://github.com/Altinity/clickhouse-grafana/issues/583

# 3.2.0 (2024-06-24)
## Enhancements:
* add ability to setup default values for query builder in connection properties to avoid unnecessary duplicated UI actions, fix https://github.com/Altinity/clickhouse-grafana/issues/495 
* add example dashboard for Histogram support, fix https://github.com/Altinity/clickhouse-grafana/issues/497
* add properly visualization for Map and JSON ClickHouse types, fix https://github.com/Altinity/clickhouse-grafana/issues/486 and https://github.com/Altinity/clickhouse-grafana/issues/189
* add e2e test which cover basic happy path scenarios

## Fixes:
* fixed wrong time range reset after query editing in explore mode, fix https://github.com/Altinity/clickhouse-grafana/issues/566
* fixed wrong behavior for $columns + subqueries, fix https://github.com/Altinity/clickhouse-grafana/issues/565

# 3.1.1 (2024-05-20)
## Fixes:
* fixed wrong encoding messages in golang part of plugin
* fixed wrong screenshots reference in plugin.json
* fixed wrong alerts query editor behavior, fix https://github.com/Altinity/clickhouse-grafana/issues/560 (affected 3.1.0)
* fixed syntax highlight when auto-complete items sql query failed, fix https://github.com/Altinity/clickhouse-grafana/issues/559
* fixed drop-down fields values clean when datasource changed https://github.com/Altinity/clickhouse-grafana/issues/561

# 3.1.0 (2024-05-10)

## Enhancements:
* add additional auto-complete functions the same as `clickhouse-client`, fix https://github.com/Altinity/clickhouse-grafana/issues/509
* add support for Flamegraph and Tracing, fix https://github.com/Altinity/clickhouse-grafana/issues/508
* enhanced support for Annotations Query builder.
* added support for HTTP Compression in Connection Settings, fix https://github.com/Altinity/clickhouse-grafana/issues/494 
* switched to go 1.22
* updated README with grafana 10 screenshots
* added $rateColumnsAggregated, $perSecondsColumnsAggregated, $increaseColumnsAggregated, $deltaColumnsAggregated macros for aggregating per-second rates - fix https://github.com/Altinity/clickhouse-grafana/issues/386
* added `Add metadata` option which added SQL comment to allow detection which dashboard and user is source of query on ClickHouse server side, fix https://github.com/Altinity/clickhouse-grafana/issues/435

## Fixes:
* fixed support grafana cloud fix https://github.com/Altinity/clickhouse-grafana/issues/517, fix https://github.com/Altinity/clickhouse-grafana/issues/516
* multiple UI fixes for QueryEditor component, fix https://github.com/Altinity/clickhouse-grafana/issues/551, https://github.com/Altinity/clickhouse-grafana/issues/546, https://github.com/Altinity/clickhouse-grafana/issues/555, https://github.com/Altinity/clickhouse-grafana/issues/547, https://github.com/Altinity/clickhouse-grafana/issues/540, https://github.com/Altinity/clickhouse-grafana/issues/542,
* fixed tlsSkipVerify was ignored when empty tlsCARoot or tlsClientCert and tlsClientKey, fix https://github.com/Altinity/clickhouse-grafana/issues/532
* fixed multiple issues for format `As table`, fix https://github.com/Altinity/clickhouse-grafana/issues/515, https://github.com/Altinity/clickhouse-grafana/issues/529
* fixed Annotations setup page don't contain Query textfield, fix https://github.com/Altinity/clickhouse-grafana/issues/518
* refactored processing macros and whole query on client side, fix https://github.com/Altinity/clickhouse-grafana/issues/524
* fixed legacy alerting when use $from and $to macros in query, fix https://github.com/Altinity/clickhouse-grafana/issues/458
* fixed corner case for WHERE field IN ('value1','value2') vs WHERE field IN ['value1','value2'], fix https://github.com/Altinity/clickhouse-grafana/issues/506
* fixed corner case for $conditionalTest macro, fix https://github.com/Altinity/clickhouse-grafana/issues/524

# 3.0.0 (2024-01-19)
## Enhancements:
* rewrite plugin from scratch for Grafana 10+ compatibility using react instead of angular
* if you provision datasource from YAML, now `xHeaderKey` move from `jsonData` to `secureJsonData`, and you need to add `dataSourceUrl` to `jsonData`, look https://github.com/Altinity/clickhouse-grafana/issues/348 and `docker/grafana/provisioning/datasources/clickhouse-x-auth.yaml` for details

# 2.5.4 (2023-09-13)
## Enhancements:
* switch to go 1.21

## Fixes:
* fix `$conditionalTest` macro behavior when drop-down template variable doesn't have `All value`, have `Multi value` and zero values is selected, fix https://github.com/Altinity/clickhouse-grafana/issues/485
* fix some function descriptions in ACE query editor

# 2.5.3 (2022-11-22)
## Enhancements:
* add secureJsonData description for datasource in README, fix https://github.com/Altinity/clickhouse-grafana/issues/452
* add $delta, $deltaColumns, $increase, $increaseColumns, fix https://github.com/Altinity/clickhouse-grafana/issues/455

## Fixes:
* add CGO_ENABLED=0 when build plugin, fix https://github.com/Altinity/clickhouse-grafana/issues/447

# 2.5.2 (2022-09-05)
## Enhancements:
* add Node graph example, fix https://github.com/Altinity/clickhouse-grafana/issues/352

## Fixes:
* properly escaping database and table identifiers on client-side, fix https://github.com/Altinity/clickhouse-grafana/issues/440, add more tests

# 2.5.1 (2022-08-24)
## Enhancements:
* Switch to go1.19, update go package dependencies

## Fixes:
* properly escaping database and table identifiers, fix https://github.com/Altinity/clickhouse-grafana/issues/440

# 2.5.0 (2022-05-31)
## Enhancements:
* Add support for Logs visualization, fix https://github.com/Altinity/clickhouse-grafana/issues/331, thanks @Fiery-Fenix and @pixelsquared
* Add $conditionalTest to editor auto-complete
* Add support $__searchFilter to template variable queries, fix https://github.com/Altinity/clickhouse-grafana/issues/354
* Add allow sub-seconds time resolution with $timeSeriesMs and $timeFilterMs support, fix https://github.com/Altinity/clickhouse-grafana/issues/344, fix https://github.com/Altinity/clickhouse-grafana/issues/398
* Expand template variable values when open context menu `Explore`, fix https://github.com/Altinity/clickhouse-grafana/issues/346

## Fixes:
* remove legacy binaries in dist folder, fix https://github.com/Altinity/clickhouse-grafana/issues/419
* allow Nullable types in alert label name in backend part, fix https://github.com/Altinity/clickhouse-grafana/issues/405
* remove INFORMATION_SCHEMA from adhoc control, fix https://github.com/Altinity/clickhouse-grafana/issues/426
* legacy binaries in dist folder after 2.4.4 release plugin name changed, fix https://github.com/Altinity/clickhouse-grafana/issues/419
* resolve corner case for `SELECT x IN (SELECT ...)`, fix https://github.com/Altinity/clickhouse-grafana/issues/421
* tested textbox variables with `${variable:sqlstring}` format, fix https://github.com/Altinity/clickhouse-grafana/issues/125

# 2.4.4 (2022-04-01)

## Fixes:
* replace Vertamedia Altinity logo

# 2.4.3 (2022-03-02)

## Fixes:
* change ClickHouse logo to Altinity logo


# 2.4.2 (2021-12-29)

## Fixes:
* fix unified alerts interval https://github.com/Altinity/clickhouse-grafana/issues/400

# 2.4.1 (2021-12-20)

## Enhancements:
* update dependencies, try to fix critical nodejs dependencies issues

## Fixes:
* fix unnecessary warning Logging message on backend part
* fix https://github.com/Altinity/clickhouse-grafana/issues/366
* fix https://github.com/Altinity/clickhouse-grafana/issues/357
* fix https://github.com/Altinity/clickhouse-grafana/issues/345
* fix https://github.com/Altinity/clickhouse-grafana/issues/342
* fix https://github.com/Altinity/clickhouse-grafana/issues/385
* fix https://github.com/Altinity/clickhouse-grafana/issues/317
* fix https://github.com/Altinity/clickhouse-grafana/issues/336
* fix https://github.com/Altinity/clickhouse-grafana/issues/320
* fix https://github.com/Altinity/clickhouse-grafana/issues/326

# 2.4.0 (2021-11-29)

## Enhancement:
* Add support for Grafana 8.x unified alerts, fix https://github.com/Altinity/clickhouse-grafana/issues/380
* Add TLS support for backend alerts part of plugin https://github.com/Altinity/clickhouse-grafana/issues/356#issuecomment-906732530
* Add $naturalTimeSeries macro, look details in https://github.com/Altinity/clickhouse-grafana/pull/89/files#diff-cd9133eda7b58ef9c9264190db4534a1be53216edbda9ac57256fbd800368c03R383-R412
* Update golang-plugin-sdk-go to latest version
* Properly format Value in Table format, look details https://github.com/Altinity/clickhouse-grafana/pull/379
* Remove toDateTime64 casting for column when time column is already DateTime64 to improve performance. Change test to ensure the casting is removed from the query, fix https://github.com/Altinity/clickhouse-grafana/issues/360
* implements `$timeFilter64ByColumn(column_name)` macro, fix https://github.com/Altinity/clickhouse-grafana/issues/343

## Fixes:

* implements properly GET and POST support for alert queries, fix https://github.com/Altinity/clickhouse-grafana/issues/353
* SQL syntax highlight now works always, fix https://github.com/Altinity/clickhouse-grafana/issues/174, fix https://github.com/Altinity/clickhouse-grafana/issues/381
* fix https://github.com/Altinity/clickhouse-grafana/issues/376,
* fix negative behavior for $perSecondColumns https://github.com/Altinity/clickhouse-grafana/issues/337
* fix https://github.com/Altinity/clickhouse-grafana/issues/374, ignore `--` inside quotas as comment

# 2.3.1 (2021-04-23)
## Breaking changes

* On latest Grafana 7.x releases, template variables SQL queries shall return only scalar types of values, see https://github.com/Altinity/clickhouse-grafana/issues/328

## Enhancement:

* add support Apple M1 ;)
* switch to new grafana plugin Golang SDK, thanks to @bmanth60 and @valeriakononenko for help
* add BasicAuth support for alerts, see https://github.com/Altinity/clickhouse-grafana/issues/267

## Fixes:

* fix github actions backend build
* fix UNION ALL parsing, see https://github.com/Altinity/clickhouse-grafana/issues/319
* fix many issues with alerting
    * https://github.com/Altinity/clickhouse-grafana/issues/305
    * https://github.com/Altinity/clickhouse-grafana/issues/327
    * https://github.com/Altinity/clickhouse-grafana/issues/334
    * https://github.com/Altinity/clickhouse-grafana/issues/335




# 2.2.3 (2021-02-17)
## Enhancement:

* automate plugin sign process via github actions, fix wrong executable file permissions

# 2.2.0 (2020-11-30)
## Enhancement:

* add region support to annotation query, try to fix wrong column orders for table format, fix https://github.com/Altinity/clickhouse-grafana/issues/303
* add plugin sign process, fix https://github.com/Altinity/clickhouse-grafana/issues/212
* add `DateTime64` support, fix https://github.com/Altinity/clickhouse-grafana/issues/292
* add `linux\arm64` backend plugin build
* improve ARRAY JOIN parsing, fix https://github.com/Altinity/clickhouse-grafana/issues/284
* improve `docker-compose.yaml` add ability to redefine `GRAFANA_VERSION` and `CLICKHOUSE_VERSION` via environment variables `latest` by default

## Fixes:
* add `*.js.map` and `*.js` from src and spec folder to .gitignore
* don't apply adhoc filters twice when used $adhoc macros, fix https://github.com/Altinity/clickhouse-grafana/issues/282
* fix corner case for table format with wrong columns order between meta and data response section, fix https://github.com/Altinity/clickhouse-grafana/issues/281
* add trickster to docker-compose environment
* actualize links in README.md

# 2.1.0 (2020-08-13)

## Enhancement:
* add "Skip comments" checkbox to query editor to pass SQL comments to server, fix https://github.com/Altinity/clickhouse-grafana/issues/265
* add setup notes for Grafana 7.x to README
* add SQL preprocessing logic on browser side with <% js code subset %>, https://github.com/Altinity/clickhouse-grafana/pull/186, thanks @fgbogdan
* improve alerts query processing for use case when `query(query_name, from, to)` time range is less than visible dashboard time range, see https://github.com/Altinity/clickhouse-grafana/issues/237
* improve alerts json parsing in golang part for case when we have string fields in response which interprets as series name, see https://github.com/Altinity/clickhouse-grafana/issues/230
* properly parsing POST queries in golang part of plugin, https://github.com/Altinity/clickhouse-grafana/pull/228, thanks @it1804

## Fixes:
* fix corner cases for $macro + subquery, see https://github.com/Altinity/clickhouse-grafana/issues/276 and https://github.com/Altinity/clickhouse-grafana/issues/277
* fix parallel query execution, see https://github.com/Altinity/clickhouse-grafana/pull/273
* fix identifiers quotes, see https://github.com/Altinity/clickhouse-grafana/issues/276, https://github.com/Altinity/clickhouse-grafana/issues/277
* fix plugin.json for pass `grafana-plugin-repository` plugin validator
* fix multi-value variables behavior - https://github.com/Altinity/clickhouse-grafana/issues/252
* add Vagrantfile for statefull environment and allow to upgrade scenario like  grafana 7.1.0 + grafana-cli upgrade-all
    * fix https://github.com/Altinity/clickhouse-grafana/issues/244
    * fix https://github.com/Altinity/clickhouse-grafana/issues/243
* add multiple dashboard examples for github issues:
    * fix https://github.com/Altinity/clickhouse-grafana/issues/240
    * fix https://github.com/Altinity/clickhouse-grafana/issues/135
    * fix https://github.com/Altinity/clickhouse-grafana/issues/245
    * fix https://github.com/Altinity/clickhouse-grafana/issues/238
    * fix https://github.com/Altinity/clickhouse-grafana/issues/232
    * fix https://github.com/Altinity/clickhouse-grafana/issues/127
    * fix https://github.com/Altinity/clickhouse-grafana/issues/141

# 2.0.2 (2020-07-06)

## Enhancements:
* add alerts support for Windows and MacOSX
* improve ad-hoc filters for query field values as `SELECT DISTINCT field AS value FROM db.table LIMIT 300`, https://github.com/Altinity/clickhouse-grafana/pull/222
* add ability to multiple JOIN parsing https://github.com/Altinity/clickhouse-grafana/pull/206
* multiple improvements for docker-compose environments, add automatic dashboards and datasource provisions which help to reproduce most of the corner cases which happens in Grafana + ClickHouse

## Fixes:
* apply a workaround for UTC timezone for Date and DateTime columns in grafana dashboards https://github.com/Altinity/clickhouse-grafana/issues/117
* clear documentation about timestamp term for $from and $to https://github.com/Altinity/clickhouse-grafana/issues/115
* fix AST parsing corner case in `WHERE [test, 'test']` "," was skipped, fix ah-doc ast FROM recursive parsing https://github.com/Altinity/clickhouse-grafana/issues/99
* fix corner cases for table functions parsing when adhoc filter applied https://github.com/Altinity/clickhouse-grafana/issues/130
* fix multiple grammar issues in README.md
* fix convert rules for Float, Decimal columns from Clickhouse to Grafana Table plugin https://github.com/Altinity/clickhouse-grafana/issues/199
* fix corner cases when Grafana Template variable value represented as array of strings https://github.com/Altinity/clickhouse-grafana/issues/169
* fix AST parsing corner cases for $macroFunctions correct position for FROM statement https://github.com/Altinity/clickhouse-grafana/issues/187

# 2.0.1 (2020-06-19)

## Fixes:
* fix golang alerts for $columns, $perSecond, $perSecondColumns macros https://github.com/Altinity/clickhouse-grafana/pull/200

# 2.0.0 (2020-06-17)

## Enhancements:
* compatibility with grafana 7.x, please use environment variable `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=vertamedia-clickhouse-datasource` or `allow_loading_unsigned_plugins=vertamedia-clickhouse-datasource` in plugins section of `grafana.ini` https://github.com/Altinity/clickhouse-grafana/pull/192
* add grafana 7.x alerting support thanks to Brian Thai https://github.com/bmanth60
* add alias support to $perSecondColumns macro https://github.com/Altinity/clickhouse-grafana/pull/193
* Support `custom` variable type and empty values for `$conditionalTest` macro https://github.com/Altinity/clickhouse-grafana/pull/178
* add docker-compose.yaml to improve local development

## Fixes:
* fix AST for corner case when quotes escaped inside quotes https://github.com/Altinity/clickhouse-grafana/pull/123, https://github.com/Altinity/clickhouse-grafana/pull/195
* fix https://github.com/Altinity/clickhouse-grafana/issues/179,  add "Extrapolation" checkbox to Query Editor

# 1.9.5 (2020-01-15)

## Fixes:
* Comments not supported by sql language parser #95

# 1.9.4 (2019-11-27)

## Fixes:
* Ad Hoc Filters small adjustments for numeric values
* UI optimizations within Metric builder

# 1.9.3 (2019-10-18)

## Fixes:
* Ad Hoc Filters improvements for complex usage

# 1.9.2 (2019-10-10)

## Fixes:
* Compatibility fix to support grafana 6.4.x
* Ad Hoc Filters fix
* $conditionalTest ALL value option fix


# 1.9.0 (2019-08-12)

## New features:

* Add macro `conditionalTest` (thx to @TH-HA) #122
* Add support for connect to Yandex.Cloud ClickHouse (thx to @negasus) #106

## Fixes:

* Fix identifier back quoting when there is a function call
* Fix AST parser errors for quotes (thx to @Fiery-Fenix) #128
* Added default database to all requests from datasource options (thx to @Fiery-Fenix) #126
* Drop lodash fcn composition (thx to @simPod) #110
* Cleanup build (thx to @simPod) #112


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
* parse dimensions from GROUP BY to simplify querying (see [piechart](https://github.com/Altinity/clickhouse-grafana#piechart-httpsgrafanacompluginsgrafana-piechart-panel) and [worldmap](https://github.com/Altinity/clickhouse-grafana#worldmap-panel-httpsgithubcomgrafanaworldmap-panel) examples) (thx to @vavrusa)
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
* support template variables with different `text` and `value` values [#27](https://github.com/Altinity/clickhouse-grafana/issues/27)
* fix visual glitches [#29](https://github.com/Altinity/clickhouse-grafana/issues/29)


# 1.2.4 (2017-11-22)

## Fixes
* apply proper value formatting for table format


# 1.2.3 (2017-11-20)

## Fixes
* commit generated files


# 1.2.2 (2017-11-20)

## Fixes
* fix error with absent `getCollapsedText` [#24](https://github.com/Altinity/clickhouse-grafana/issues/24)
* suppress errors while parsing AST [#24](https://github.com/Altinity/clickhouse-grafana/issues/24)
* show generated SQL in textarea [#24](https://github.com/Altinity/clickhouse-grafana/issues/24)
* do not round timestamp after converting [#25](https://github.com/Altinity/clickhouse-grafana/issues/25)
* increase max-height of query editor


# 1.2.1 (2017-11-17)

## Fixes
* add forgotten completions
* process NULL values [#19](https://github.com/Altinity/clickhouse-grafana/issues/19)
* sort by key value in `$columns` macro [#16](https://github.com/Altinity/clickhouse-grafana/issues/16)


# 1.2.0 (2017-11-15)

## New Features
* Ace editor
* ClickHouse function completion (thx to https://github.com/smi2/tabix.ui)


# 1.1.0 (2017-11-13)

## New Features
* Allow `UInt32` as Timestamp column [#15](https://github.com/Altinity/clickhouse-grafana/issues/15)
* Add `Format as Table` format [#17](https://github.com/Altinity/clickhouse-grafana/issues/17)
