# QA-SRS Altinity Grafana Datasource Plugin For ClickHouse
# Software Requirements Specification

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

This software requirements specification covers requirements related to [Altinity Grafana Datasource Plugin For ClickHouse]
that connects grafana to [ClickHouse] server.

## Requirements

### Plugin Installation

#### Manual Plugin Installation

##### RQ.SRS.ClickHouseGrafanaPlugin.ManualPluginInstallation
version 1.0

The [Plugin] SHALL be available to be installed using grafana-cli with following command:

`grafana-cli plugins install vertamedia-clickhouse-datasource`. 

For installation user need to install [Grafana] first.

#### Grafana Cloud Plugin Installation

##### RQ.SRS.ClickHouseGrafanaPlugin.GrafanaCloudPluginInstallation
version 1.0

The [Plugin] SHALL be available to be installed in grafana cloud with the following steps:
* Go to Grafana Cloud
* Go to Administration `>` Plugins And Data `>` Plugins
* Find `Altinity plugin for ClickHouse`
* Click Install

#### Docker Compose Environment Setup

##### RQ.SRS.ClickHouseGrafanaPlugin.DockerComposeEnvironment
version 1.0

The [Plugin] SHALL be available to be run using docker compose with the following comands:
```
docker-compose run --rm frontend_builder
docker-compose run --rm backend_builder
echo 'export GRAFANA_ACCESS_POLICY_TOKEN="glc_eyJvIjoiNDU1MDgiLCJuIjoicGx1Z2luLXNpZ25pbmctdG9rZW4tZm9yLXNpZ24tcGx1Z2luIiwiayI6IjU3UTI1VDMyT21FUmNhNDJYMnpPdmg1TSIsIm0iOnsiciI6InVzIn19"' > .release_env
docker-compose run --rm plugin_signer
## Need to stap aplications that uses 3000 and 9000 ports.
docker-compose up -d grafana
docker-compose logs -f grafana # check logs
```

### General

#### RQ.SRS.ClickHouseGrafanaPlugin
version 1.0

The [Plugin] SHALL support connecting [ClickHouse] server to [Grafana].

### Adding New Data Source

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView 
version 1.0

The [Plugin] SHALL support creating new [ClickHouse] data source by clicking `Add new data source` button on the The [Plugin] page.
The [Plugin] SHALL open data source setup view by clicking the `Add new data source` button
This view SHALL have the following sections:
* `Name`
* `HTTP`
* `Auth toggles`
* `Custom HTTP Headers`
* `Additional`

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.SaveAndTestButton
version 1.0

The [Plugin]'s data source setup view SHALL contain `Save & test` button that SHALL save datasource and check if [ClickHouse] 
datasource is connected to [Grafana] correctly.

### Specifying Data Source Name

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.DataSourceName
version 1.0

The [Plugin] SHALL support specifying data source name by using `Name` text field in data source setup view.


### Using Default Data Source

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.DefaultDataSource
version 1.0

The [Plugin] SHALL support specifying data source as default by using `Default` toggle in data source setup view.
Default data source SHALL be preselected in new pannels.

### Specifying HTTP Connection

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.HTTPConnection
version 1.0

The [Plugin] SHALL support specifying HTTP connection using the following fields:

* `URL` text field to specify [ClickHouse] URL 
* `Access` dropdown menu to specify `Server` or `Browser` access will be used
* `Allowed cookies` text field to specify cookies that SHALL not be deleted
* `Timeout` text field to specify HTTP request timeout in seconds.

### Connecting to the Local Clickhouse Server

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.HTTPConnection.ServerAccess
version 1.0

The [Plugin] SHALL support connecting to the local [ClickHouse] server by selecting `Server` option` in `Access` dropdown menu
in data source setup view. The [Plugin]'s data source setup view SHALL contain `Allowed cookies` and `Timeout` text fields 
if only `Server` is selected in `Access` dropdown menu.

### Connecting to the Remote Clickhouse Server

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.HTTPConnection.BrowserAccess
version 1.0

The [Plugin] SHALL support connecting to the remote [ClickHouse] server by selecting `Browser` option` in `Access` dropdown menu
in data source setup view. 

### ClickHouse Authentification Setup

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.Auth
version 1.0

The [Plugin] SHALL support specifying authentification details by specifying the following toggles:

* `Basic auth`
* `TLS Client Auth`
* `Skip TLS Verify`
* `Forward OAuth Identity`
* `With Credentials`
* `With CA Cert`

### ClickHouse Authentification Setup Using Username And Password

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.BasicAuth
version 1.0

The [Plugin] SHALL support specifying username and password for [ClickHouse] server by turning on `Basic auth` toggle
and specifying username and password in `User` and `Password` textfields respectively. `Password` textfield SHALL 
be able to be empty. The [Plugin] SHALL add `Basic Auth Details` section to data source setup view only if `Basic auth`
toggle is on.

### ClickHouse Authentification Setup Using TLS/SSL Auth Details

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.TLS/SSLAuthDetails
version 1.0

The [Plugin] SHALL support specifying server name, client certificate, client key for [ClickHouse] server by turning on 
`TLS Client Auth` toggle and specifying this options in `ServerName`, `Client Cert` and `Client Key` textfields 
respectively. The [Plugin] SHALL add `ServerName`, `Client Cert` and `Client Key` textfields to data source setup view
only if `TLS Client Auth` toggle is on.

### ClickHouse Authentification Using Forward OAuth Identity

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.ForwardOAuthIdentity
version 1.0

The [Plugin] SHALL support Forward OAuth Identity by turning on `Forward OAuth Identity` toggle.
The [Plugin] SHALL forward the user's upstream OAuth identity to the data source if this toggle is on.

### Sending Credentials Setup

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.WithCredentials
version 1.0

The [Plugin] SHALL support sending credentials such as cookies or authentication headers with cross-site 
request by turning on `With Credentials` toggle.

### ClickHouse Authentification With CA Certificate

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.Auth.WithCACert
version 1.0

The [Plugin] SHALL support specifying ca certificate that will be used to access to [ClickHouse] server by turning on
`With CA Cert` toggle and specifying `CA Cert` textfield. The [Plugin] SHALL add `CA Cert` textfield to data source setup 
view only if `TLS Client Auth` toggle is on.

### Specifying Custom HTTP Headers

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.CustomHTTPHeaders
version 1.0

The [Plugin] SHALL support custom HTTP Headers that will be used for HTTP requests to [ClickHouse] server by
pressing `Add Header` button and specifying `Header` and `Value` textfields.

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.DeletingCustomHTTPHeaders
version 1.0

The [Plugin] SHALL support deleting custom HTTP Headers by clicking buсket button nearby this Header.

### Connection To Managed Yandex.Cloud ClickHouse Database Setup

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.UseYandexCloudAuthorizationHeaders
version 1.0

The [Plugin] SHALL support connection to managed Yandex.Cloud [ClickHouse] database setup by
turning on `Use Yandex.Cloud authorization headers` toggle and specifying `X-ClickHouse-User` 
and `X-ClickHouse-Key` textfields.

### Specifying Use CORS Flag In Requests

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.AddCORSFlagToRequests
version 1.0

The [Plugin] SHALL support adding [CORS] flag to requests by turning on `Add CORS flag to requests` toggle.
If this toggle is on The [Plugin] SHALL attach `add_http_cors_header=1` to requests.

### Specifying Use POST Requests

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.AddCORSFlagToRequests
version 1.0

The [Plugin] SHALL support specifying the use of POST requests to [ClickHouse] server by turning on 
`Use POST method to send queries` toggle.

### Specifying Default Database

#### RQ.SRS.ClickHouseGrafanaPlugin.DataSourceSetupView.DefaultDatabase
version 1.0

The [Plugin] SHALL support specifying the default [ClickHouse] server database by using `Default database` textfield. 
This database name SHALL be prefilled in the query builder.

### Creating Panels

#### RQ.SRS.ClickHouseGrafanaPlugin.Panels
version 1.0

[ClickHouse Grafana Plugin] SHALL support creating Panels for the [ClickHouse] data source if [ClickHouse] data source is connected to grafana.

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

The [Plugin] SHALL support data types that can be visualized. ??? (The following types:)

### Versions Compatibility

#### RQ.SRS.ClickHouseGrafanaPlugin.VersionCompatibility
version 1.0

The [Plugin] 2.2 - 3.0 SHALL support grafana versions 10+. ???



[SRS]: #srs
[ClickHouse]: https://clickhouse.tech
The [Plugin]: https://github.com/Altinity/clickhouse-grafana
[GitHub Repository]: https://github.com/Altinity/clickhouse-grafana
[Altinity Grafana Datasource Plugin For ClickHouse]: https://github.com/Altinity/clickhouse-grafana
[Grafana]: https://grafana.com/
[CORS]: https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
