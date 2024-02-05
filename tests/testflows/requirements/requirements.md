# QA-SRS Altinity clickhouse grafana plugin
# Software Requirements Specification

(c) 2021 Altinity Inc. All Rights Reserved.

**Document status:** Confidential

**Author:** -

**Date:** -

## Approval

**Status:** -

**Version:** -

**Approved by:** -

**Date:** -

## Table of Contents

* 1 [Revision History](#revision-history)
* 2 [Introduction](#introduction)
* 3 [Requirements](#requirements)
    * 3.1 [General](#general)
        * 3.1.1 [RQ.SRS.ClickHouseGrafanaPlugin](#rqsrsclickhousegrafanaplugin)
    * 3.2 [Connecting](#connecting)
        * 3.2.1 [RQ.SRS.ClickHouseGrafanaPlugin.ClickhouseConnecting](#rqsrsclickhousegrafanapluginclickhouseconnecting)
    * 3.3 [Adding New Data Source](#adding-new-data-source)
        * 3.3.1 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSource ](#rqsrsclickhousegrafanapluginaddingdatasource-)
        * 3.3.2 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView](#rqsrsclickhousegrafanapluginaddingdatasourceview)
        * 3.3.3 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.SaveAndTestButton](#rqsrsclickhousegrafanapluginaddingdatasourceviewsaveandtestbutton)
    * 3.4 [Adding Data Source Name Section](#adding-data-source-name-section)
        * 3.4.1 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Name](#rqsrsclickhousegrafanapluginaddingdatasourceviewname)
    * 3.5 [Adding Data Source HTTP Section](#adding-data-source-http-section)
        * 3.5.1 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.HTTP](#rqsrsclickhousegrafanapluginaddingdatasourceviewhttp)
        * 3.5.2 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.HTTP.Access](#rqsrsclickhousegrafanapluginaddingdatasourceviewhttpaccess)
    * 3.6 [Adding Data Source Auth Section](#adding-data-source-auth-section)
        * 3.6.1 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth](#rqsrsclickhousegrafanapluginaddingdatasourceviewauth)
        * 3.6.2 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.BasicAuth](#rqsrsclickhousegrafanapluginaddingdatasourceviewauthbasicauth)
        * 3.6.3 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.TLSClientAuth](#rqsrsclickhousegrafanapluginaddingdatasourceviewauthtlsclientauth)
        * 3.6.4 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.WithCACert](#rqsrsclickhousegrafanapluginaddingdatasourceviewauthwithcacert)
    * 3.7 [Adding Data Source Basic Auth Details Section](#adding-data-source-basic-auth-details-section)
        * 3.7.1 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.BasicAuthDetails](#rqsrsclickhousegrafanapluginaddingdatasourceviewauthbasicauthdetails)
    * 3.8 [Adding Data Source TLS/SSL Auth Details Section](#adding-data-source-tlsssl-auth-details-section)
        * 3.8.1 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.TLS/SSLAuthDetails](#rqsrsclickhousegrafanapluginaddingdatasourceviewauthtlssslauthdetails)
    * 3.9 [Adding Data Source Custom HTTP Headers Section](#adding-data-source-custom-http-headers-section)
        * 3.9.1 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.CustomHTTPHeaders](#rqsrsclickhousegrafanapluginaddingdatasourceviewauthcustomhttpheaders)
        * 3.9.2 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.CustomHTTPHeaders.AddHeader](#rqsrsclickhousegrafanapluginaddingdatasourceviewauthcustomhttpheadersaddheader)
        * 3.9.3 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.CustomHTTPHeaders.UseYandexCloudAuthorizationHeaders](#rqsrsclickhousegrafanapluginaddingdatasourceviewauthcustomhttpheadersuseyandexcloudauthorizationheaders)
    * 3.10 [Adding Data Source Additional Section](#adding-data-source-additional-section)
        * 3.10.1 [RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.Additional](#rqsrsclickhousegrafanapluginaddingdatasourceviewauthadditional)
    * 3.11 [Panels](#panels)
        * 3.11.1 [RQ.SRS.ClickHouseGrafanaPlugin.Panels](#rqsrsclickhousegrafanapluginpanels)
    * 3.12 [Query Setup](#query-setup)
        * 3.12.1 [RQ.SRS.ClickHouseGrafanaPlugin.QuerySetup](#rqsrsclickhousegrafanapluginquerysetup)
    * 3.13 [Query Setup Interface](#query-setup-interface)
        * 3.13.1 [RQ.SRS.ClickHouseGrafanaPlugin.QuerySetupInterface](#rqsrsclickhousegrafanapluginquerysetupinterface)
    * 3.14 [Raw SQL Editor](#raw-sql-editor)
        * 3.14.1 [RQ.SRS.ClickHouseGrafanaPlugin.RawSQLEditorInterface](#rqsrsclickhousegrafanapluginrawsqleditorinterface)
    * 3.15 [Vizualization](#vizualization)
        * 3.15.1 [RQ.SRS.ClickHouseGrafanaPlugin.Vizualization](#rqsrsclickhousegrafanapluginvizualization)
    * 3.16 [Macroces](#macroces)
        * 3.16.1 [RQ.SRS.ClickHouseGrafanaPlugin.QuerySettings.Macroses](#rqsrsclickhousegrafanapluginquerysettingsmacroses)
    * 3.17 [Functions](#functions)
        * 3.17.1 [RQ.SRS.ClickHouseGrafanaPlugin.Functions](#rqsrsclickhousegrafanapluginfunctions)
    * 3.18 [Supported types](#supported-types)
        * 3.18.1 [RQ.SRS.ClickHouseGrafanaPlugin.SupportedTypes](#rqsrsclickhousegrafanapluginsupportedtypes)
    * 3.19 [Versions Compatibility](#versions-compatibility)
        * 3.19.1 [RQ.SRS.ClickHouseGrafanaPlugin.VersionCompatibility](#rqsrsclickhousegrafanapluginversioncompatibility)


## Revision History

This document is stored in an electronic form using [Git] source control management software
hosted in a [GitHub Repository]. All the updates are tracked using the [Revision History].

## Introduction

This software requirements specification covers requirements related to [Altinity Grafana datasource plugin for ClickHouse]
that connects grafana to [ClickHouse] server.

## Requirements

### General

#### RQ.SRS.ClickHouseGrafanaPlugin
version 1.0

[ClickHouse Grafana Plugin] SHALL support connecting [ClickHouse] server to [Grafana].

### Plugin Installation

#### RQ.SRS.ClickHouseGrafanaPlugin.PluginInstallation
version 1.0

[ClickHouse Grafana Plugin] SHALL be available at {grafana_url}/plugins as `Altinity plugin for ClickHouse`.

### Manual Plugin Installation

#### RQ.SRS.ClickHouseGrafanaPlugin.ManualPluginInstallation
version 1.0

[ClickHouse Grafana Plugin] SHALL be available to be installed using grafana-cli with following command:
`grafana-cli plugins install vertamedia-clickhouse-datasource`. 
For installation user need to install grafana first.

### Grafana Cloud Plugin Installation

#### RQ.SRS.ClickHouseGrafanaPlugin.ManualPluginInstallation
version 1.0

[ClickHouse Grafana Plugin] SHALL be available to be installed using grafana-cli with following command:

### Docker Compose Environment

#### RQ.SRS.ClickHouseGrafanaPlugin.DockerComposeEnvironment
version 1.0

[ClickHouse Grafana Plugin] SHALL be available to 

### Adding New Data Source

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSource 
version 1.0

[ClickHouse Grafana Plugin] SHALL support creating new [ClickHouse] data source by clicking `Add new data source` button.

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView
version 1.0

[Clickhouse Grafana Plugin] SHALL open adding data source view on clicking `Add new data source` button.
This view SHALL have the following sections:
* `Name`
* `HTTP`
* `Auth toggles`
* `Custom HTTP Headers`
* `Additional`

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.SaveAndTestButton
version 1.0

[ClickHouse Grafana Plugin] adding data source view SHALL contain `Save & test` button that shall save and check if datasource is connected correctly. ???

### Adding Data Source Name Section

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Name
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `Name` section SHALL contain the following fields:

* `Name` text field to specify [ClickHouse] data source name
* `Default` toggle. Default data source SHALL be preselected in new pannels.

### Adding Data Source HTTP Section

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.HTTP
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `HTTP` section SHALL contain the following fields:

* `URL` text field to specify [ClickHouse] URL 
* `Access` dropdown menu to specify `Server` or `Browser` access will be used
* `Allowed cookies` text field to specify cookies that SHALL not be deleted
* `Timeout` text field to specify HTTP request timeout in seconds.

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.HTTP.Access
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `HTTP` section SHALL contain `Allowed cookies` and `Timeout` text fields 
if only `Server` is selected in `Access` dropdown menu.

### Adding Data Source Auth Section

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `Auth` section SHALL contain the following fields:

* `Basic auth` toggle
* `TLS Client Auth` toggle
* `Skip TLS Verify` toggle
* `Forward OAuth Identity` toggle
* `With Credentials` toggle
* `With CA Cert` toggle

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.BasicAuth
version 1.0

[Clickhouse Grafana Plugin] SHALL add `Basic Auth Details` section to adding data source view only if `Basic auth` toggle is on.

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.TLSClientAuth
version 1.0

[Clickhouse Grafana Plugin] SHALL add `TLS/SSL Auth Details` section to adding data source view if `TLS Client Auth` toggle is on.

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.WithCACert
version 1.0

[Clickhouse Grafana Plugin] SHALL add `TLS/SSL Auth Details` section to adding data source view if `With CA Cert` toggle is on.

### Adding Data Source Basic Auth Details Section

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.BasicAuthDetails
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `Basic Auth Details` section SHALL contain the following fields:

* `User` text field to specify [ClickHouse] user
* `Password` text field to specify password for [ClickHouse] user.

### Adding Data Source TLS/SSL Auth Details Section

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.TLS/SSLAuthDetails
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `TLS/SSLAuthDetails` section SHALL contain the following fields:

* `CA Cert` text field. This field SHALL be displayed only if `With CA Cert` toggle is on. ???
* `ServerName` text field. This field SHALL be displayed only if `TLS Client Auth` toggle is on.
* `Client Cert` text field. This field SHALL be displayed only if `TLS Client Auth` toggle is on.
* `Client Key` text field. This field SHALL be displayed only if `TLS Client Auth` toggle is on.

### Adding Data Source Custom HTTP Headers Section

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.CustomHTTPHeaders
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `Custom HTTP Headers` section SHALL contain the following fields:

* `Add header` button
* `Use Yandex.Cloud authorization headers` toggle.

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.CustomHTTPHeaders.AddHeader
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `Add header` button SHALL add the following fields on click:

* `Header` text field
* `Value` text field
* `busket` button.

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.CustomHTTPHeaders.UseYandexCloudAuthorizationHeaders
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `Use Yandex.Cloud authorization headers` button SHALL 
add the following fields if toggle is on:

* `X-ClickHouse-User` text field
* `X-ClickHouse-Key` text field.

### Adding Data Source Additional Section

#### RQ.SRS.ClickHouseGrafanaPlugin.AddingDataSourceView.Auth.Additional
version 1.0

[Clickhouse Grafana Plugin]'s adding Data Source view's `Additional` section SHALL contain the following fields:

* `Add CORS flag to requests` toggle
* `Use POST method to send queries` toggle
* `Default database` text field.

### Panels

#### RQ.SRS.ClickHouseGrafanaPlugin.Panels
version 1.0

[ClickHouse Grafana Plugin] SHALL support creating Panels for the [ClickHouse] data source if [ClickHouse] data source is connected to grafana. ???

### Query Setup

#### RQ.SRS.ClickHouseGrafanaPlugin.QuerySetup
version 1.0

[ClickHouse Grafana Plugin] SHALL support creating grafana vizualizations using query setup interface and raw SQL editor.

### Query Setup Interface

#### RQ.SRS.ClickHouseGrafanaPlugin.QuerySetupInterface
version 1.0

[ClickHouse Grafana Plugin]'s query setup interface SHALL contain the following fields:

* `FROM` - `Database` and `Table` dropdown's that allow user to specify database and table for the query
* `Column timestamp type` - dropdown of types `DateTime`, `DateTime64` or `UInt32`
* `Timestamp Column` - dropdown of table's timestamp columns with type defined in `Column timestamp type`
* `Date column` - dropdown of table's data columns??? `Date` and `Date32`
* `Go to Query` - button to switch to raw SQL editor
* `Add query` button ???
* `Expression` button ???

### Raw SQL Editor

#### RQ.SRS.ClickHouseGrafanaPlugin.RawSQLEditorInterface
version 1.0

[ClickHouse Grafana Plugin]'s raw SQL editor interface SHALL contain the following fields:

* Raw SQL editor - text field for SQL query
* `Extrapolation` - toggle that allows users to turn on and off extrapolation on graph
* `Skip Comments` - toggle that allows users to turn on and off sending comments to [ClickHouse] server
* `Step` - text field that allows users to change grid step on the graph
* `Round` - text field that allows users to set rounding for timestamps
* `Resolution` - dropdown menu that allows users to choose resolation for graph
* `Format As` - dropdown menu that allows users to choose vizualization type
* `Show help` - button that allows users to get information about macroces and functions
* `Show generated SQL` - button that allows users to get SQL query raw form without macroces and functions
* `Reformat Query` - button.???

### Vizualization

#### RQ.SRS.ClickHouseGrafanaPlugin.Vizualization
version 1.0

[ClickHouse Grafana Plugin] SHALL display visualization on changing attention.????

### Macroces

#### RQ.SRS.ClickHouseGrafanaPlugin.QuerySettings.Macroses
version 1.0

[ClickHouse Grafana Plugin] SHALL support the following macroces:

* `$table` - replaced with selected table name from query setup interface
* `$dateCol` - replaced with Column:Date value from query setup interface
* `$dateTimeCol` - replaced with Column:DateTime or Column:TimeStamp value from query setup interface
* `$from` - replaced with (timestamp with ms)/1000 value of UI selected "Time Range:From"
* `$to` - replaced with (timestamp with ms)/1000 value of UI selected "Time Range:To"
* `$interval` - replaced with selected "Group by a time interval" value in seconds
* `$timeFilter` - replaced with currently selected "Time Range". Requires Column:Date and Column:DateTime or Column:TimeStamp to be selected.
* `$timeFilterByColumn($column)` - replaced with currently selected "Time Range" for a column passed as $column argument.
* `$timeSeries` - replaced with special [ClickHouse] construction to convert results as time-series data.
* `$naturalTimeSeries` - replaced with special [ClickHouse] construction to convert results as time-series with in a logical/natural breakdown.
* `$unescape` - unescapes variable value by removing single quotes.
* `$adhoc` - replaced with a rendered ad-hoc filter expression, or "1" if no ad-hoc filters exist.

A description of macros SHALL be available by typing their names in raw SQL editor interface.

https://github.com/Altinity/clickhouse-grafana?tab=readme-ov-file#macros-support


### Functions

#### RQ.SRS.ClickHouseGrafanaPlugin.Functions
version 1.0

[ClickHouse Grafana Plugin] SHALL support the following functions in SQL query:???

* `$rate` 
* `$columns`
* `$rateColumns`
* `$perSecond`
* `$perSecondColumns`
* `$delta`
* `$deltaColumns`
* `$increase`
* `$increaseColumns`

This functions are templates of SQL queries. User SHALL be allowed to check query in the expanded format in raw SQL editor interface.
Only one function per query allowed.

https://github.com/Altinity/clickhouse-grafana?tab=readme-ov-file#functions ???

### Supported types

#### RQ.SRS.ClickHouseGrafanaPlugin.SupportedTypes
version 1.0

[ClickHouse Grafana Plugin] SHALL support data types that can be visualized. ??? (The following types:)

### Versions Compatibility

#### RQ.SRS.ClickHouseGrafanaPlugin.VersionCompatibility
version 1.0

[ClickHouse Grafana Plugin] 2.2 - 3.0 SHALL support grafana versions 10+. ???



[SRS]: #srs
[ClickHouse]: https://clickhouse.tech
[Plugin]: https://github.com/Altinity/clickhouse-grafana
[GitHub Repository]:
[Altinity Grafana datasource plugin for ClickHouse]: https://github.com/Altinity/clickhouse-grafana
[Grafana]: 
