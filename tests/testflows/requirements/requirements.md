# QA-SRS Altinity Grafana Datasource Plugin For ClickHouse
# Software Requirements Specification

## Table of Contents

* 1 [Revision History](#revision-history)
* 2 [Introduction](#introduction)
* 3 [Requirements](#requirements)
    * 3.1 [Plugin Installation](#plugin-installation)
        * 3.1.1 [Manual Plugin Installation](#manual-plugin-installation)
            * 3.1.1.1 [RQ.SRS.Plugin.ManualPluginInstallation](#rqsrsclickhousegrafanapluginmanualplugininstallation)
        * 3.1.2 [Grafana Cloud Plugin Installation](#grafana-cloud-plugin-installation)
            * 3.1.2.1 [RQ.SRS.Plugin.GrafanaCloudPluginInstallation](#rqsrsclickhousegrafanaplugingrafanacloudplugininstallation)
        * 3.1.3 [Docker Compose Environment Setup](#docker-compose-environment-setup)
            * 3.1.3.1 [RQ.SRS.Plugin.DockerComposeEnvironment](#rqsrsclickhousegrafanaplugindockercomposeenvironment)
    * 3.2 [Grafana Datasource Plugin For ClickHouse](#grafana-datasource-plugin-for-clickhouse)
        * 3.2.1 [RQ.SRS.ClickHouseGrafanaPlugin](#rqsrsclickhousegrafanaplugin)
    * 3.3 [Adding New Data Source](#adding-new-data-source)
        * 3.3.1 [RQ.SRS.Plugin.DataSourceSetupView ](#rqsrsclickhousegrafanaplugindatasourcesetupview-)
        * 3.3.2 [RQ.SRS.Plugin.DataSourceSetupView.SaveAndTestButton](#rqsrsclickhousegrafanaplugindatasourcesetupviewsaveandtestbutton)
    * 3.4 [Specifying Data Source Name](#specifying-data-source-name)
        * 3.4.1 [RQ.SRS.Plugin.DataSourceSetupView.DataSourceName](#rqsrsclickhousegrafanaplugindatasourcesetupviewdatasourcename)
    * 3.5 [Using Default Data Source](#using-default-data-source)
        * 3.5.1 [RQ.SRS.Plugin.DataSourceSetupView.DefaultDataSource](#rqsrsclickhousegrafanaplugindatasourcesetupviewdefaultdatasource)
    * 3.6 [Specifying HTTP Connection](#specifying-http-connection)
        * 3.6.1 [RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection](#rqsrsclickhousegrafanaplugindatasourcesetupviewhttpconnection)
    * 3.7 [Connecting to the Local Clickhouse Server](#connecting-to-the-local-clickhouse-server)
        * 3.7.1 [RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.ServerAccess](#rqsrsclickhousegrafanaplugindatasourcesetupviewhttpconnectionserveraccess)
    * 3.8 [Connecting to the Remote Clickhouse Server](#connecting-to-the-remote-clickhouse-server)
        * 3.8.1 [RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.BrowserAccess](#rqsrsclickhousegrafanaplugindatasourcesetupviewhttpconnectionbrowseraccess)
    * 3.9 [ClickHouse Authentification Setup](#clickhouse-authentification-setup)
        * 3.9.1 [RQ.SRS.Plugin.DataSourceSetupView.Auth](#rqsrsclickhousegrafanaplugindatasourcesetupviewauth)
    * 3.10 [ClickHouse Authentification Setup Using Username And Password](#clickhouse-authentification-setup-using-username-and-password)
        * 3.10.1 [RQ.SRS.Plugin.DataSourceSetupView.BasicAuth](#rqsrsclickhousegrafanaplugindatasourcesetupviewbasicauth)
    * 3.11 [ClickHouse Authentification Setup Using TLS/SSL Auth Details](#clickhouse-authentification-setup-using-tlsssl-auth-details)
        * 3.11.1 [RQ.SRS.Plugin.DataSourceSetupView.TLS/SSLAuthDetails](#rqsrsclickhousegrafanaplugindatasourcesetupviewtlssslauthdetails)
    * 3.12 [ClickHouse Authentification Using Forward OAuth Identity](#clickhouse-authentification-using-forward-oauth-identity)
        * 3.12.1 [RQ.SRS.Plugin.DataSourceSetupView.ForwardOAuthIdentity](#rqsrsclickhousegrafanaplugindatasourcesetupviewforwardoauthidentity)
    * 3.13 [Sending Credentials Setup](#sending-credentials-setup)
        * 3.13.1 [RQ.SRS.Plugin.DataSourceSetupView.WithCredentials](#rqsrsclickhousegrafanaplugindatasourcesetupviewwithcredentials)
    * 3.14 [ClickHouse Authentification With CA Certificate](#clickhouse-authentification-with-ca-certificate)
        * 3.14.1 [RQ.SRS.Plugin.DataSourceSetupView.Auth.WithCACert](#rqsrsclickhousegrafanaplugindatasourcesetupviewauthwithcacert)
    * 3.15 [Specifying Custom HTTP Headers](#specifying-custom-http-headers)
        * 3.15.1 [RQ.SRS.Plugin.DataSourceSetupView.CustomHTTPHeaders](#rqsrsclickhousegrafanaplugindatasourcesetupviewcustomhttpheaders)
        * 3.15.2 [RQ.SRS.Plugin.DataSourceSetupView.DeletingCustomHTTPHeaders](#rqsrsclickhousegrafanaplugindatasourcesetupviewdeletingcustomhttpheaders)
    * 3.16 [Connection To Managed Yandex.Cloud ClickHouse Database Setup](#connection-to-managed-yandexcloud-clickhouse-database-setup)
        * 3.16.1 [RQ.SRS.Plugin.DataSourceSetupView.UseYandexCloudAuthorizationHeaders](#rqsrsclickhousegrafanaplugindatasourcesetupviewuseyandexcloudauthorizationheaders)
    * 3.17 [Specifying Use CORS Flag In Requests](#specifying-use-cors-flag-in-requests)
        * 3.17.1 [RQ.SRS.Plugin.DataSourceSetupView.AddCORSFlagToRequests](#rqsrsclickhousegrafanaplugindatasourcesetupviewaddcorsflagtorequests)
    * 3.18 [Specifying Use POST Requests](#specifying-use-post-requests)
        * 3.18.1 [RQ.SRS.Plugin.DataSourceSetupView.UsePostRequests](#rqsrsclickhousegrafanaplugindatasourcesetupviewusepostrequests)
    * 3.19 [Specifying Default Database](#specifying-default-database)
        * 3.19.1 [RQ.SRS.Plugin.DataSourceSetupView.DefaultDatabase](#rqsrsclickhousegrafanaplugindatasourcesetupviewdefaultdatabase)
    * 3.20 [Creating Panels](#creating-panels)
        * 3.20.1 [RQ.SRS.Plugin.Panels](#rqsrsclickhousegrafanapluginpanels)
    * 3.21 [Query Setup](#query-setup)
        * 3.21.1 [RQ.SRS.Plugin.QuerySetup](#rqsrsclickhousegrafanapluginquerysetup)
    * 3.22 [Query Setup Interface](#query-setup-interface)
        * 3.22.1 [RQ.SRS.Plugin.QuerySetupInterface](#rqsrsclickhousegrafanapluginquerysetupinterface)
    * 3.23 [Raw SQL Editor](#raw-sql-editor)
        * 3.23.1 [RQ.SRS.Plugin.RawSQLEditorInterface](#rqsrsclickhousegrafanapluginrawsqleditorinterface)
    * 3.24 [Vizualization](#vizualization)
        * 3.24.1 [RQ.SRS.Plugin.Vizualization](#rqsrsclickhousegrafanapluginvizualization)
    * 3.25 [Macroces](#macroces)
        * 3.25.1 [RQ.SRS.Plugin.QuerySettings.Macroses](#rqsrsclickhousegrafanapluginquerysettingsmacroses)
    * 3.26 [Functions](#functions)
        * 3.26.1 [RQ.SRS.Plugin.Functions](#rqsrsclickhousegrafanapluginfunctions)
    * 3.27 [Supported types](#supported-types)
        * 3.27.1 [RQ.SRS.Plugin.SupportedTypes](#rqsrsclickhousegrafanapluginsupportedtypes)
    * 3.28 [Versions Compatibility](#versions-compatibility)
        * 3.28.1 [RQ.SRS.Plugin.VersionCompatibility](#rqsrsclickhousegrafanapluginversioncompatibility)

## Revision History

This document is stored in an electronic form using [Git] source control management software
hosted in a [GitHub Repository]. All the updates are tracked using the [Revision History].

## Introduction

This software requirements specification covers requirements related to [Altinity Grafana Datasource Plugin For ClickHouse]
that connects grafana to [ClickHouse] server.


## Plugin Installation

### Manual Plugin Installation

#### RQ.SRS.Plugin.ManualPluginInstallation
version 1.0

The [Plugin] SHALL be available to be installed using grafana-cli with the following command:

`grafana-cli plugins install vertamedia-clickhouse-datasource`. 

For installation, user need to install [Grafana] first.

### Grafana Cloud Plugin Installation

#### RQ.SRS.Plugin.GrafanaCloudPluginInstallation
version 1.0

The [Plugin] SHALL be available to be installed in Grafana Cloud with the following steps:
* Go to Grafana Cloud
* Go to Administration `>` Plugins And Data `>` Plugins
* Find `Altinity plugin for ClickHouse`
* Click Install

![configuration](https://github.com/antip00/clickhouse-grafana/assets/44409195/c4b748a8-fec7-46f5-8712-427ddf587293)
![filter](https://github.com/antip00/clickhouse-grafana/assets/44409195/41159aff-4802-4fe4-9b23-f262d42de143)
![add data source](https://github.com/antip00/clickhouse-grafana/assets/44409195/27462c9c-c3e9-4982-9a32-15fd74e4e7ee)

### Docker Compose Environment Setup

#### RQ.SRS.Plugin.DockerComposeEnvironment
version 1.0

The [Plugin] SHALL be available to be run using docker compose with the following commands:
```
docker-compose run --rm frontend_builder
docker-compose run --rm backend_builder
echo 'export GRAFANA_ACCESS_POLICY_TOKEN="glc_eyJvIjoiNDU1MDgiLCJuIjoicGx1Z2luLXNpZ25pbmctdG9rZW4tZm9yLXNpZ24tcGx1Z2luIiwiayI6IjU3UTI1VDMyT21FUmNhNDJYMnpPdmg1TSIsIm0iOnsiciI6InVzIn19"' > .release_env
docker-compose run --rm plugin_signer
docker-compose up -d grafana
docker-compose logs -f grafana
```

### Grafana Datasource Plugin For ClickHouse

#### RQ.SRS.Plugin
version 1.0

The [Plugin] SHALL support connecting the [ClickHouse] server to [Grafana].

### Adding New Data Source

#### RQ.SRS.Plugin.DataSourceSetupView 
version 1.0

The [Plugin] SHALL support creating a new [ClickHouse] data source by clicking the `Add new data source` button on the [Plugin] page.
The [Plugin] SHALL open the data source setup view by clicking the `Add new data source` button.
This view SHALL contain the following sections:
* `Name`
* `HTTP`
* `Auth toggles`
* `Custom HTTP Headers`
* `Additional`

![data source setup](https://github.com/antip00/clickhouse-grafana/assets/44409195/83798d29-35a3-480c-8e03-a25848649cc5)

#### RQ.SRS.Plugin.DataSourceSetupView.SaveAndTestButton
version 1.0

The [Plugin]'s data source setup view SHALL contain a `Save & test` button that SHALL save datasource and check if [ClickHouse]
datasource is connected to [Grafana] correctly.

### Specifying Data Source Name

#### RQ.SRS.Plugin.DataSourceSetupView.DataSourceName
version 1.0

The [Plugin] SHALL support specifying a data source name by using the `Name` text field in the data source setup view.

### Using Default Data Source

#### RQ.SRS.Plugin.DataSourceSetupView.DefaultDataSource
version 1.0

The [Plugin] SHALL support specifying the data source as default by using the `Default` toggle in the data source setup view.
The default data source SHALL be preselected in new pannels.

### Specifying HTTP Connection

#### RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection
version 1.0

The [Plugin] SHALL support specifying an HTTP connection using the following fields:

* The `URL` text field to specify [ClickHouse] URL
* The `Access` dropdown menu to specify `Server` or `Browser` access will be used
* The `Allowed cookies` text field to specify cookies that SHALL not be deleted
* The `Timeout` text field to specify the HTTP request timeout in seconds.

### Connecting to the Local Clickhouse Server

#### RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.ServerAccess
version 1.0

The [Plugin] SHALL support connecting to the local [ClickHouse] server by selecting the `Server` option in the `Access` dropdown menu
in the data source setup view. The [Plugin]'s data source setup view SHALL contain `Allowed cookies` and `Timeout` text fields 
if only the `Server` option is selected in the `Access` dropdown menu.

### Connecting to the Remote Clickhouse Server

#### RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.BrowserAccess
version 1.0

The [Plugin] SHALL support connecting to the remote [ClickHouse] server by selecting the `Browser` option` in the `Access` dropdown menu
in the data source setup view.

### ClickHouse Authentification Setup

#### RQ.SRS.Plugin.DataSourceSetupView.Auth
version 1.0

The [Plugin] SHALL support specifying authentication details by specifying the following toggles:

* `Basic auth`
* `TLS Client Auth`
* `Skip TLS Verify`
* `Forward OAuth Identity`
* `With Credentials`
* `With CA Cert`

### ClickHouse Authentification Setup Using Username And Password

#### RQ.SRS.Plugin.DataSourceSetupView.BasicAuth
version 1.0

The [Plugin] SHALL support specifying username and password for the [ClickHouse] server by turning on the `Basic auth` toggle
and specifying username and password in the `User` and `Password` text fields, respectively. The `Password` text field SHALL 
be able to be empty. The [Plugin] SHALL add the `Basic Auth Details` section to the data source setup view only if the `Basic auth`
toggle is on.

### ClickHouse Authentification Setup Using TLS/SSL Auth Details

#### RQ.SRS.Plugin.DataSourceSetupView.TLS/SSLAuthDetails
version 1.0

The [Plugin] SHALL support specifying server name, client certificate, and client key for the [ClickHouse] server by turning on 
the `TLS Client Auth` toggle and specifying these options in the `ServerName`, `Client Cert`, and `Client Key` text fields, respectively. 
The [Plugin] SHALL add `ServerName`, `Client Cert`, and `Client Key` text fields to the data source setup view only if the 
`TLS Client Auth` toggle is on.

### ClickHouse Authentification Using Forward OAuth Identity

#### RQ.SRS.Plugin.DataSourceSetupView.ForwardOAuthIdentity
version 1.0

The [Plugin] SHALL support Forward OAuth Identity by turning on the `Forward OAuth Identity` toggle.
The [Plugin] SHALL forward the user's upstream OAuth identity to the data source if this toggle is on.

### Sending Credentials Setup

#### RQ.SRS.Plugin.DataSourceSetupView.WithCredentials
version 1.0

The [Plugin] SHALL support sending credentials such as cookies or authentication headers with cross-site 
requests by turning on the `With Credentials` toggle.

### ClickHouse Authentification With CA Certificate

#### RQ.SRS.Plugin.DataSourceSetupView.Auth.WithCACert
version 1.0

The [Plugin] SHALL support specifying the CA certificate that will be used to access the [ClickHouse] server 
by turning on the `With CA Cert` toggle and specifying the `CA Cert` text field. The [Plugin] SHALL add the 
`CA Cert` text field to the data source setup view only if the `TLS Client Auth` toggle is on.

### Specifying Custom HTTP Headers

#### RQ.SRS.Plugin.DataSourceSetupView.CustomHTTPHeaders
version 1.0

The [Plugin] SHALL support custom HTTP headers that will be used for HTTP requests to the [ClickHouse] server 
by pressing the `Add Header` button and specifying the `Header` and `Value` text fields.

#### RQ.SRS.Plugin.DataSourceSetupView.DeletingCustomHTTPHeaders
version 1.0

The [Plugin] SHALL support deleting custom HTTP headers by clicking the bucket button nearby this header.

### Connection To Managed Yandex.Cloud ClickHouse Database Setup

#### RQ.SRS.Plugin.DataSourceSetupView.UseYandexCloudAuthorizationHeaders
version 1.0

The [Plugin] SHALL support connection to managed Yandex.Cloud [ClickHouse] database setup by turning on the 
`Use Yandex.Cloud authorization headers` toggle and specifying the `X-ClickHouse-User` and `X-ClickHouse-Key` 
text fields.

### Specifying Use CORS Flag In Requests

#### RQ.SRS.Plugin.DataSourceSetupView.AddCORSFlagToRequests
version 1.0

The [Plugin] SHALL support adding the [CORS] flag to requests by turning on the `Add CORS flag to requests` toggle.
If this toggle is on, the [Plugin] SHALL attach `add_http_cors_header=1` to requests.

### Specifying Use POST Requests

#### RQ.SRS.Plugin.DataSourceSetupView.UsePostRequests
version 1.0

The [Plugin] SHALL support specifying the use of POST requests to the [ClickHouse] server by turning on the 
`Use POST method to send queries` toggle.

### Specifying Default Database

#### RQ.SRS.Plugin.DataSourceSetupView.DefaultDatabase
version 1.0

The [Plugin] SHALL support specifying the default [ClickHouse] server database by using the `Default database` text field.
This database name SHALL be prefilled in the query builder.

### Creating Dashboards

#### RQ.SRS.Plugin.Dashboards
version 1.0

The [Plugin] SHALL support creating dashboards with panels that use the [ClickHouse] data source that was created using the [Plugin].

### Creating Panels

#### RQ.SRS.Plugin.Panels
version 1.0

The [Plugin] SHALL support creating panels for the [ClickHouse] data source if the [ClickHouse] data source 
was created using the [Plugin].

### Query Setup

#### RQ.SRS.Plugin.QuerySetup
version 1.0

The [Plugin] SHALL support creating grafana vizualizations using query setup interface and raw SQL editor.

### Query Setup Interface

#### RQ.SRS.Plugin.QuerySetupInterface
version 1.0

The [Plugin]'s query setup interface SHALL contain the following fields:

* `FROM` - `Database` and `Table` dropdown's that allow user to specify database and table for the query
* `Column timestamp type` - dropdown of types `DateTime`, `DateTime64` or `UInt32`
* `Timestamp Column` - dropdown of table's timestamp columns with type defined in `Column timestamp type`
* `Date column` - dropdown of table's data columns `Date` and `Date32` type
* `Go to Query` - button to switch to raw SQL editor
* `Add query` - button to add more that one query
* `Expression` - button to add expressions to the query.

![query settings](https://github.com/antip00/clickhouse-grafana/assets/44409195/dc28da9d-d170-4cc6-af6f-d80aaf87c92f)

### Query Options

#### RQ.SRS.Plugin.QueryOptions
version 1.0

The [Plugin] SHALL support the following options for the query:

* `Max data points` - text field that defines the maximum data points per series
* `Min interval` - text field that defines a lower limit for the interval
* `Interval` - invariable text field. It is the evaluated interval that is sent to data source and is used in $__interval and $__interval_ms
* `Relative time` - text field that overrides the relative time range for individual panel
* `Time shift` - text field that overrides the time range for individual panel by shifting its start and end relative to the time picker.

![query options](https://github.com/antip00/clickhouse-grafana/assets/44409195/8008c638-28bd-4ad6-ba02-1bf44a31b6de)

### Raw SQL Editor

#### RQ.SRS.Plugin.RawSQLEditorInterface
version 1.0

The [Plugin]'s raw SQL editor interface SHALL contain the following fields:

* Raw SQL editor - text field for SQL query
* `Extrapolation` - toggle that allows users to turn on and off extrapolation on graph
* `Skip Comments` - toggle that allows users to turn on and off sending comments to [ClickHouse] server
* `Step` - text field that allows users to change grid step on the graph
* `Round` - text field that allows users to set rounding for timestamps
* `Resolution` - dropdown menu that allows users to choose resolation for graph
* `Format As` - dropdown menu that allows users to choose vizualization type
* `Show help` - button that allows users to get information about macroces and functions
* `Show generated SQL` - button that allows users to get SQL query raw form without macroces and functions
* `Reformat Query` - button that allows user to reformat query.

![sql editor](https://github.com/antip00/clickhouse-grafana/assets/44409195/3225bfaa-4235-40ce-a02a-c7c53d3b87ea)

### Vizualization

#### RQ.SRS.Plugin.Vizualization
version 1.0

The [Plugin] SHALL display visualization on changing attention.

### Macroces

#### RQ.SRS.Plugin.QuerySettings.Macroses
version 1.0

The [Plugin] SHALL support the following macroces:

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

#### RQ.SRS.Plugin.Functions
version 1.0

The [Plugin] SHALL support the following functions in SQL query:???

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

https://github.com/Altinity/clickhouse-grafana?tab=readme-ov-file#functions

### Supported types

#### RQ.SRS.Plugin.SupportedTypes
version 1.0

The [Plugin] SHALL support data types that can be visualized. The following data types SHALL be supported:
* Integer types
* Floating-point numbers
* Boolean
* Dates
* Arrays
* Tuples

### Versions Compatibility

#### RQ.SRS.Plugin.VersionCompatibility
version 1.0

The [Plugin] 3.0 version SHALL support grafana versions 10+.

[SRS]: #srs
[ClickHouse]: https://clickhouse.tech
[Plugin]: https://github.com/Altinity/clickhouse-grafana
[GitHub Repository]: https://github.com/Altinity/clickhouse-grafana
[Altinity Grafana Datasource Plugin For ClickHouse]: https://github.com/Altinity/clickhouse-grafana
[Grafana]: https://grafana.com/
[CORS]: https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
