# QA-SRS Altinity Grafana Datasource Plugin For ClickHouse
# Software Requirements Specification

## Table of Contents

* 1 [Revision History](#revision-history)
* 2 [Introduction](#introduction)
* 3 [Plugin Installation](#plugin-installation)
    * 3.1 [Manual Plugin Installation](#manual-plugin-installation)
        * 3.1.1 [RQ.SRS.Plugin.ManualPluginInstallation](#rqsrspluginmanualplugininstallation)
    * 3.2 [Grafana Cloud Plugin Installation](#grafana-cloud-plugin-installation)
        * 3.2.1 [RQ.SRS.Plugin.GrafanaCloudPluginInstallation](#rqsrsplugingrafanacloudplugininstallation)
    * 3.3 [Docker Compose Environment Setup](#docker-compose-environment-setup)
        * 3.3.1 [RQ.SRS.Plugin.DockerComposeEnvironment](#rqsrsplugindockercomposeenvironment)
* 4 [Grafana Datasource Plugin For ClickHouse](#grafana-datasource-plugin-for-clickhouse)
    * 4.1 [RQ.SRS.Plugin](#rqsrsplugin)
* 5 [Adding New Data Source](#adding-new-data-source)
    * 5.1 [RQ.SRS.Plugin.DataSourceSetupView](#rqsrsplugindatasourcesetupview)
    * 5.2 [RQ.SRS.Plugin.DataSourceSetupView.SaveAndTestButton](#rqsrsplugindatasourcesetupviewsaveandtestbutton)
* 6 [Specifying Data Source Name](#specifying-data-source-name)
    * 6.1 [RQ.SRS.Plugin.DataSourceSetupView.DataSourceName](#rqsrsplugindatasourcesetupviewdatasourcename)
* 7 [Using Default Data Source](#using-default-data-source)
    * 7.1 [RQ.SRS.Plugin.DataSourceSetupView.DefaultDataSource](#rqsrsplugindatasourcesetupviewdefaultdatasource)
* 8 [Specifying HTTP Connection](#specifying-http-connection)
    * 8.1 [RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection](#rqsrsplugindatasourcesetupviewhttpconnection)
* 9 [Connecting to the Clickhouse Server Using Grafana Backend Server ](#connecting-to-the-clickhouse-server-using-grafana-backend-server-)
    * 9.1 [RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.ServerAccess](#rqsrsplugindatasourcesetupviewhttpconnectionserveraccess)
* 10 [Connecting to the Clickhouse Server Without Using Grafana Backend Server ](#connecting-to-the-clickhouse-server-without-using-grafana-backend-server-)
    * 10.1 [RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.BrowserAccess](#rqsrsplugindatasourcesetupviewhttpconnectionbrowseraccess)
* 11 [ClickHouse Authentication Setup](#clickhouse-authentication-setup)
    * 11.1 [RQ.SRS.Plugin.DataSourceSetupView.Auth](#rqsrsplugindatasourcesetupviewauth)
* 12 [ClickHouse Authentication Setup Using Username And Password](#clickhouse-authentication-setup-using-username-and-password)
    * 12.1 [RQ.SRS.Plugin.DataSourceSetupView.BasicAuth](#rqsrsplugindatasourcesetupviewbasicauth)
* 13 [ClickHouse Authentication Setup Using TLS/SSL Auth Details](#clickhouse-authentication-setup-using-tlsssl-auth-details)
    * 13.1 [RQ.SRS.Plugin.DataSourceSetupView.TLS/SSLAuthDetails](#rqsrsplugindatasourcesetupviewtlssslauthdetails)
* 14 [ClickHouse Authentication Using Forward OAuth Identity](#clickhouse-authentication-using-forward-oauth-identity)
    * 14.1 [RQ.SRS.Plugin.DataSourceSetupView.ForwardOAuthIdentity](#rqsrsplugindatasourcesetupviewforwardoauthidentity)
* 15 [Sending Credentials Setup](#sending-credentials-setup)
    * 15.1 [RQ.SRS.Plugin.DataSourceSetupView.WithCredentials](#rqsrsplugindatasourcesetupviewwithcredentials)
* 16 [ClickHouse Authentication With CA Certificate](#clickhouse-authentication-with-ca-certificate)
    * 16.1 [RQ.SRS.Plugin.DataSourceSetupView.Auth.WithCACert](#rqsrsplugindatasourcesetupviewauthwithcacert)
* 17 [ClickHouse Authentication Without CA Certificate](#clickhouse-authentication-without-ca-certificate)
    * 17.1 [RQ.SRS.Plugin.DataSourceSetupView.Auth.SkipTLSVerify](#rqsrsplugindatasourcesetupviewauthskiptlsverify)
* 18 [Specifying Custom HTTP Headers](#specifying-custom-http-headers)
    * 18.1 [RQ.SRS.Plugin.DataSourceSetupView.CustomHTTPHeaders](#rqsrsplugindatasourcesetupviewcustomhttpheaders)
    * 18.2 [RQ.SRS.Plugin.DataSourceSetupView.DeletingCustomHTTPHeaders](#rqsrsplugindatasourcesetupviewdeletingcustomhttpheaders)
* 19 [Connection To Managed Yandex.Cloud ClickHouse Database Setup](#connection-to-managed-yandexcloud-clickhouse-database-setup)
    * 19.1 [RQ.SRS.Plugin.DataSourceSetupView.UseYandexCloudAuthorizationHeaders](#rqsrsplugindatasourcesetupviewuseyandexcloudauthorizationheaders)
* 20 [Specifying Use CORS Flag In Requests](#specifying-use-cors-flag-in-requests)
    * 20.1 [RQ.SRS.Plugin.DataSourceSetupView.AddCORSFlagToRequests](#rqsrsplugindatasourcesetupviewaddcorsflagtorequests)
* 21 [Specifying Use POST Requests](#specifying-use-post-requests)
    * 21.1 [RQ.SRS.Plugin.DataSourceSetupView.UsePostRequests](#rqsrsplugindatasourcesetupviewusepostrequests)
* 22 [Specifying Default Database](#specifying-default-database)
    * 22.1 [RQ.SRS.Plugin.DataSourceSetupView.DefaultDatabase](#rqsrsplugindatasourcesetupviewdefaultdatabase)
* 23 [Specifying HTTP compression](#specifying-http-compression)
    * 23.1 [RQ.SRS.Plugin.DataSourceSetupView.HTTPCompression](#rqsrsplugindatasourcesetupviewhttpcompression)
* 24 [Creating Dashboards](#creating-dashboards)
    * 24.1 [RQ.SRS.Plugin.Dashboards](#rqsrsplugindashboards)
* 25 [Creating Panels](#creating-panels)
    * 25.1 [RQ.SRS.Plugin.Panels](#rqsrspluginpanels)
    * 25.2 [RQ.SRS.Plugin.Panels.Repeated](#rqsrspluginpanelsrepeated)
* 26 [Multi-user Usage](#multi-user-usage)
    * 26.1 [RQ.SRS.Plugin.MultiUserUsage](#rqsrspluginmultiuserusage)
    * 26.2 [RQ.SRS.Plugin.MultiUserUsage.SamePanel](#rqsrspluginmultiuserusagesamepanel)
    * 26.3 [RQ.SRS.Plugin.MultiUserUsage.DifferentPanels](#rqsrspluginmultiuserusagedifferentpanels)
    * 26.4 [RQ.SRS.Plugin.MultiUserUsage.SameDashboard](#rqsrspluginmultiuserusagesamedashboard)
    * 26.5 [RQ.SRS.Plugin.MultiUserUsage.DifferentDashboards](#rqsrspluginmultiuserusagedifferentdashboards)
* 27 [Query Setup](#query-setup)
    * 27.1 [RQ.SRS.Plugin.QuerySetup](#rqsrspluginquerysetup)
* 28 [Query Setup Interface](#query-setup-interface)
    * 28.1 [RQ.SRS.Plugin.QuerySetupInterface](#rqsrspluginquerysetupinterface)
* 29 [Query Options](#query-options)
    * 29.1 [RQ.SRS.Plugin.QueryOptions](#rqsrspluginqueryoptions)
* 30 [Raw SQL Editor](#raw-sql-editor)
    * 30.1 [RQ.SRS.Plugin.RawSQLEditorInterface](#rqsrspluginrawsqleditorinterface)
    * 30.2 [RQ.SRS.Plugin.RawSQLEditorInterface.SQLEditor](#rqsrspluginrawsqleditorinterfacesqleditor)
    * 30.3 [RQ.SRS.Plugin.RawSQLEditorInterface.Extrapolation](#rqsrspluginrawsqleditorinterfaceextrapolation)
    * 30.4 [RQ.SRS.Plugin.RawSQLEditorInterface.SkipComments](#rqsrspluginrawsqleditorinterfaceskipcomments)
    * 30.5 [RQ.SRS.Plugin.RawSQLEditorInterface.Step](#rqsrspluginrawsqleditorinterfacestep)
    * 30.6 [RQ.SRS.Plugin.RawSQLEditorInterface.Round](#rqsrspluginrawsqleditorinterfaceround)
    * 30.7 [RQ.SRS.Plugin.RawSQLEditorInterface.Resolution](#rqsrspluginrawsqleditorinterfaceresolution)
    * 30.8 [RQ.SRS.Plugin.RawSQLEditorInterface.FormatAs](#rqsrspluginrawsqleditorinterfaceformatas)
    * 30.9 [RQ.SRS.Plugin.RawSQLEditorInterface.ShowHelp](#rqsrspluginrawsqleditorinterfaceshowhelp)
    * 30.10 [RQ.SRS.Plugin.RawSQLEditorInterface.ShowGeneratedSQL](#rqsrspluginrawsqleditorinterfaceshowgeneratedsql)
    * 30.11 [RQ.SRS.Plugin.RawSQLEditorInterface.ReformatQuery](#rqsrspluginrawsqleditorinterfacereformatquery)
* 31 [Auto-complete In Queries](#auto-complete-in-queries)
    * 31.1 [RQ.SRS.Plugin.AutoCompleteInQueries](#rqsrspluginautocompleteinqueries)
* 32 [Time range selector](#time-range-selector)
    * 32.1 [RQ.SRS.Plugin.TimeRangeSelector](#rqsrsplugintimerangeselector)
    * 32.2 [RQ.SRS.Plugin.TimeRangeSelector.Zoom](#rqsrsplugintimerangeselectorzoom)
* 33 [Сhanging The Size Of The Graph](#hanging-the-size-of-the-graph)
    * 33.1 [RQ.SRS.Plugin.FillActual](#rqsrspluginfillactual)
* 34 [Refresh Databoard](#refresh-databoard)
    * 34.1 [RQ.SRS.Plugin.RefreshDataboard](#rqsrspluginrefreshdataboard)
* 35 [Inspecting Query](#inspecting-query)
    * 35.1 [RQ.SRS.Plugin.QueryInspector](#rqsrspluginqueryinspector)
    * 35.2 [RQ.SRS.Plugin.QueryInspector.QueryTab](#rqsrspluginqueryinspectorquerytab)
* 36 [Visualization](#visualization)
    * 36.1 [RQ.SRS.Plugin.Visualization](#rqsrspluginvisualization)
    * 36.2 [RQ.SRS.Plugin.Visualization.Legends](#rqsrspluginvisualizationlegends)
    * 36.3 [Table View](#table-view)
        * 36.3.1 [RQ.SRS.Plugin.Visualization.Table](#rqsrspluginvisualizationtable)
    * 36.4 [Visualization Types](#visualization-types)
        * 36.4.1 [RQ.SRS.Plugin.Visualization.VisualizationTypes](#rqsrspluginvisualizationvisualizationtypes)
* 37 [Macros](#macros)
    * 37.1 [RQ.SRS.Plugin.QuerySettings.Macros](#rqsrspluginquerysettingsmacros)
    * 37.2 [RQ.SRS.Plugin.QuerySettings.Macros.Table](#rqsrspluginquerysettingsmacrostable)
    * 37.3 [RQ.SRS.Plugin.QuerySettings.Macros.DateCol](#rqsrspluginquerysettingsmacrosdatecol)
    * 37.4 [RQ.SRS.Plugin.QuerySettings.Macros.DateTimeCol](#rqsrspluginquerysettingsmacrosdatetimecol)
    * 37.5 [RQ.SRS.Plugin.QuerySettings.Macros.From](#rqsrspluginquerysettingsmacrosfrom)
    * 37.6 [RQ.SRS.Plugin.QuerySettings.Macros.To](#rqsrspluginquerysettingsmacrosto)
    * 37.7 [RQ.SRS.Plugin.QuerySettings.Macros.Interval](#rqsrspluginquerysettingsmacrosinterval)
    * 37.8 [RQ.SRS.Plugin.QuerySettings.Macros.TimeFilterByColumn](#rqsrspluginquerysettingsmacrostimefilterbycolumn)
    * 37.9 [RQ.SRS.Plugin.QuerySettings.Macros.TimeSeries](#rqsrspluginquerysettingsmacrostimeseries)
    * 37.10 [RQ.SRS.Plugin.QuerySettings.Macros.NaturalTimeSeries](#rqsrspluginquerysettingsmacrosnaturaltimeseries)
    * 37.11 [RQ.SRS.Plugin.QuerySettings.Macros.Unescape](#rqsrspluginquerysettingsmacrosunescape)
    * 37.12 [RQ.SRS.Plugin.QuerySettings.Macros.Adhoc](#rqsrspluginquerysettingsmacrosadhoc)
* 38 [Variables Setup](#variables-setup)
    * 38.1 [RQ.SRS.Plugin.Variables](#rqsrspluginvariables)
* 39 [Annotations Setup](#annotations-setup)
    * 39.1 [RQ.SRS.Plugin.Annotations](#rqsrspluginannotations)
* 40 [Setaping Alerts](#setaping-alerts)
    * 40.1 [RQ.SRS.Plugin.Alerts](#rqsrspluginalerts)
    * 40.2 [RQ.SRS.Plugin.Alerts.AlertSetupPage](#rqsrspluginalertsalertsetuppage)
    * 40.3 [RQ.SRS.Plugin.Alerts.RuleType.GrafanaManaged](#rqsrspluginalertsruletypegrafanamanaged)
    * 40.4 [RQ.SRS.Plugin.Alerts.RuleType.DataSourceManaged](#rqsrspluginalertsruletypedatasourcemanaged)
* 41 [Functions](#functions)
    * 41.1 [RQ.SRS.Plugin.Functions](#rqsrspluginfunctions)
    * 41.2 [RQ.SRS.Plugin.Functions.Rate](#rqsrspluginfunctionsrate)
    * 41.3 [RQ.SRS.Plugin.Functions.Columns](#rqsrspluginfunctionscolumns)
    * 41.4 [RQ.SRS.Plugin.Functions.RateColumns](#rqsrspluginfunctionsratecolumns)
    * 41.5 [RQ.SRS.Plugin.Functions.PerSecond](#rqsrspluginfunctionspersecond)
    * 41.6 [RQ.SRS.Plugin.Functions.PerSecondColumns](#rqsrspluginfunctionspersecondcolumns)
    * 41.7 [RQ.SRS.Plugin.Functions.Delta](#rqsrspluginfunctionsdelta)
    * 41.8 [RQ.SRS.Plugin.Functions.DeltaColumns](#rqsrspluginfunctionsdeltacolumns)
    * 41.9 [RQ.SRS.Plugin.Functions.Increase](#rqsrspluginfunctionsincrease)
    * 41.10 [RQ.SRS.Plugin.Functions.IncreaseColumns](#rqsrspluginfunctionsincreasecolumns)
    * 41.11 [RQ.SRS.Plugin.Functions.Lttb](#rqsrspluginfunctionslttb)
    * 41.12 [RQ.SRS.Plugin.Functions.SubQuery](#rqsrspluginfunctionssubquery)
* 42 [Supported ClickHouse Datatypes](#supported-clickhouse-datatypes)
    * 42.1 [RQ.SRS.Plugin.SupportedDataTypes](#rqsrspluginsupporteddatatypes)
    * 42.2 [RQ.SRS.Plugin.SupportedDataTypes.LimitValues](#rqsrspluginsupporteddatatypeslimitvalues)
* 43 [Versions Compatibility](#versions-compatibility)
    * 43.1 [RQ.SRS.Plugin.VersionCompatibility](#rqsrspluginversioncompatibility)


## Revision History

This document is stored in an electronic form using [Git] source control management software
hosted in a [GitHub Repository]. All the updates are tracked using the [Revision History].

## Introduction

This software requirements specification covers requirements related to [Altinity Grafana Datasource Plugin For ClickHouse]
that connects grafana to [ClickHouse] server.


## Plugin Installation

### Manual Plugin Installation

#### RQ.SRS.Plugin.ManualPluginInstallation
version: 1.0

The [Plugin] SHALL be available to be installed using grafana-cli with the following command:

`grafana-cli plugins install vertamedia-clickhouse-datasource`. 

For installation, user need to install [Grafana] first.

### Grafana Cloud Plugin Installation

#### RQ.SRS.Plugin.GrafanaCloudPluginInstallation
version: 1.0

The [Plugin] SHALL be available to be installed in Grafana Cloud with the following steps:
* Go to Grafana Cloud
* Go to Administration `>` Plugins And Data `>` Plugins
* Find `Altinity plugin for ClickHouse`
* Click Install

![configuration](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/configuration.png)
![filter](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/filter.png)
![add data source](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/add%20data%20source.png)

### Docker Compose Environment Setup

#### RQ.SRS.Plugin.DockerComposeEnvironment
version: 1.0

The [Plugin] SHALL be available to be run using docker compose with the following commands:
```
docker compose run --rm frontend_builder
docker compose run --rm backend_builder
echo 'export GRAFANA_ACCESS_POLICY_TOKEN="{grafana_token}"' > .release_env
docker compose run --rm plugin_signer
docker compose up -d grafana
```

## Grafana Datasource Plugin For ClickHouse

### RQ.SRS.Plugin
version: 1.0

The [Plugin] SHALL support connecting the [ClickHouse] server to [Grafana].

## Adding New Data Source

### RQ.SRS.Plugin.DataSourceSetupView
version: 1.0

The [Plugin] SHALL support creating a new [ClickHouse] data source by clicking the `Add new data source` button on the [Plugin] page.
The [Plugin] SHALL open the data source setup view by clicking the `Add new data source` button.
This view SHALL contain the following sections:
* `Name`
* `HTTP`
* `Auth toggles`
* `Custom HTTP Headers`
* `Additional`

![data source setup](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/data%20source%20setup.png)

### RQ.SRS.Plugin.DataSourceSetupView.SaveAndTestButton
version: 1.0

The [Plugin]'s data source setup view SHALL contain a `Save & test` button that SHALL save datasource and check if [ClickHouse]
datasource is connected to [Grafana] correctly.

## Specifying Data Source Name

### RQ.SRS.Plugin.DataSourceSetupView.DataSourceName
version: 1.0

The [Plugin] SHALL support specifying a data source name by using the `Name` text field in the data source setup view.

## Using Default Data Source

### RQ.SRS.Plugin.DataSourceSetupView.DefaultDataSource
version: 1.0

The [Plugin] SHALL support specifying the data source as default by using the `Default` toggle in the data source setup view.
The default data source SHALL be preselected in new pannels.

## Specifying HTTP Connection

### RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection
version: 1.0

The [Plugin] SHALL support specifying an HTTP connection using the following fields:

* The `URL` text field to specify [ClickHouse] URL
* The `Access` dropdown menu to specify `Server` or `Browser` access will be used
* The `Allowed cookies` text field to specify cookies that SHALL not be deleted
* The `Timeout` text field to specify the HTTP request timeout in seconds.

## Connecting to the Clickhouse Server Using Grafana Backend Server 

### RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.ServerAccess
version: 1.0

The [Plugin] SHALL support connecting to the [ClickHouse] server by selecting the `Server` option in the `Access` dropdown menu
in the data source setup view. In this case all requests SHALL be made from the browser to Grafana backend/server which in turn will forward the 
requests to the data source. The [Plugin]'s data source setup view SHALL contain `Allowed cookies` and `Timeout` text fields 
if only the `Server` option is selected in the `Access` dropdown menu.

## Connecting to the Clickhouse Server Without Using Grafana Backend Server 

### RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.BrowserAccess
version: 1.0

The [Plugin] SHALL support connecting to the [ClickHouse] server by selecting the `Browser` option in the `Access` dropdown menu
in the data source setup view. In this case all requests SHALL be made from the browser directly to the data source.

## ClickHouse Authentication Setup

### RQ.SRS.Plugin.DataSourceSetupView.Auth
version: 1.0

The [Plugin] SHALL support specifying authentication details by specifying the following toggles:

* `Basic auth`
* `TLS Client Auth`
* `Skip TLS Verify`
* `Forward OAuth Identity`
* `With Credentials`
* `With CA Cert`

## ClickHouse Authentication Setup Using Username And Password

### RQ.SRS.Plugin.DataSourceSetupView.BasicAuth
version: 1.0

The [Plugin] SHALL support specifying username and password for the [ClickHouse] server by turning on the `Basic auth` toggle
and specifying username and password in the `User` and `Password` text fields, respectively. The `Password` text field SHALL 
be able to be empty. The [Plugin] SHALL add the `Basic Auth Details` section to the data source setup view only if the `Basic auth`
toggle is on.

## ClickHouse Authentication Setup Using TLS/SSL Auth Details

### RQ.SRS.Plugin.DataSourceSetupView.TLS/SSLAuthDetails
version: 1.0

The [Plugin] SHALL support specifying server name, client certificate, and client key for the [ClickHouse] server by turning on 
the `TLS Client Auth` toggle and specifying these options in the `ServerName`, `Client Cert`, and `Client Key` text fields, respectively. 
The [Plugin] SHALL add `ServerName`, `Client Cert`, and `Client Key` text fields to the data source setup view only if the 
`TLS Client Auth` toggle is on.

## ClickHouse Authentication Using Forward OAuth Identity

### RQ.SRS.Plugin.DataSourceSetupView.ForwardOAuthIdentity
version: 1.0

The [Plugin] SHALL support Forward OAuth Identity by turning on the `Forward OAuth Identity` toggle.
The [Plugin] SHALL forward the user's upstream OAuth identity to the data source if this toggle is on.

## Sending Credentials Setup

### RQ.SRS.Plugin.DataSourceSetupView.WithCredentials
version: 1.0

The [Plugin] SHALL support sending credentials such as cookies or authentication headers with cross-site 
requests by turning on the `With Credentials` toggle.

## ClickHouse Authentication With CA Certificate

### RQ.SRS.Plugin.DataSourceSetupView.Auth.WithCACert
version: 1.0

The [Plugin] SHALL support specifying the CA certificate that will be used to access the [ClickHouse] server 
by turning on the `With CA Cert` toggle and specifying the `CA Cert` text field. The [Plugin] SHALL add the 
`CA Cert` text field to the data source setup view only if the `TLS Client Auth` toggle is on.

## ClickHouse Authentication Without CA Certificate

### RQ.SRS.Plugin.DataSourceSetupView.Auth.SkipTLSVerify
version: 1.0

The [Plugin] SHALL support connecting to clickhouse using HTTPS connection without specifying CA certificate
by turning on `Skip TLS verify` toggle.


## Specifying Custom HTTP Headers

### RQ.SRS.Plugin.DataSourceSetupView.CustomHTTPHeaders
version: 1.0

The [Plugin] SHALL support custom HTTP headers that will be used for HTTP requests to the [ClickHouse] server 
by pressing the `Add Header` button and specifying the `Header` and `Value` text fields.

### RQ.SRS.Plugin.DataSourceSetupView.DeletingCustomHTTPHeaders
version: 1.0

The [Plugin] SHALL support deleting custom HTTP headers by clicking the bucket button nearby this header.

## Connection To Managed Yandex.Cloud ClickHouse Database Setup

### RQ.SRS.Plugin.DataSourceSetupView.UseYandexCloudAuthorizationHeaders
version: 1.0

The [Plugin] SHALL support connection to managed Yandex.Cloud [ClickHouse] database setup by turning on the 
`Use Yandex.Cloud authorization headers` toggle and specifying the `X-ClickHouse-User` and `X-ClickHouse-Key` 
text fields.

## Specifying Use CORS Flag In Requests

### RQ.SRS.Plugin.DataSourceSetupView.AddCORSFlagToRequests
version: 1.0

The [Plugin] SHALL support adding the [CORS] flag to requests by turning on the `Add CORS flag to requests` toggle.
If this toggle is on, the [Plugin] SHALL attach `add_http_cors_header=1` to requests.

## Specifying Use POST Requests

### RQ.SRS.Plugin.DataSourceSetupView.UsePostRequests
version: 1.0

The [Plugin] SHALL support specifying the use of POST requests to the [ClickHouse] server by turning on the 
`Use POST method to send queries` toggle.

## Specifying Default Database

### RQ.SRS.Plugin.DataSourceSetupView.DefaultDatabase
version: 1.0

The [Plugin] SHALL support specifying the default [ClickHouse] server database by using the `Default database` text field.
This database name SHALL be prefilled in the query builder.

## Specifying HTTP compression

### RQ.SRS.Plugin.DataSourceSetupView.HTTPCompression
version: 1.0

The [Plugin] SHALL support specifying HTTP compression option by using the `HTTP Compression` toggle.

## Creating Dashboards

### RQ.SRS.Plugin.Dashboards
version: 1.0

The [Plugin] SHALL support creating dashboards with panels that use the [ClickHouse] data source that was created using the [Plugin].

## Creating Panels

### RQ.SRS.Plugin.Panels
version: 1.0

The [Plugin] SHALL support creating panels for the [ClickHouse] data source if the [ClickHouse] data source 
was created using the [Plugin].

### RQ.SRS.Plugin.Panels.Repeated
version: 1.0

The [Plugin] SHALL support creating more than 1 panel by defining 1 panel and using variables.

## Multi-user Usage

### RQ.SRS.Plugin.MultiUserUsage
version: 1.0

The [Plugin] SHALL support multi-user usage of the [Clickhouse] data source that was created using the [Plugin].


### RQ.SRS.Plugin.MultiUserUsage.SamePanel
version: 1.0

The [Plugin] SHALL support access for the same panel from different users at the same time.


### RQ.SRS.Plugin.MultiUserUsage.DifferentPanels
version: 1.0

The [Plugin] SHALL support access for different panels from different users at the same time.


### RQ.SRS.Plugin.MultiUserUsage.SameDashboard
version: 1.0

The [Plugin] SHALL support access for the same dashboard from different users at the same time.


### RQ.SRS.Plugin.MultiUserUsage.DifferentDashboards
version: 1.0

The [Plugin] SHALL support access for different dashboards from different users at the same time.

## Query Setup

### RQ.SRS.Plugin.QuerySetup
version: 1.0

The [Plugin] SHALL support creating Grafana visualizations using the query setup interface and raw SQL editor.

## Query Setup Interface

### RQ.SRS.Plugin.QuerySetupInterface
version: 1.0

The [Plugin]'s query setup interface SHALL contain the following fields:

* `FROM` - `Database` and `Table` dropdown's that allow the user to specify the database and table for the query
* `Column timestamp type` - dropdown of types `DateTime`, `DateTime64`, or `UInt32`
* `Timestamp Column` - dropdown of the table's timestamp columns with a type defined in `Column timestamp type`
* `Date column` - dropdown of the table's data columns `Date` and `Date32` type
* `Go to Query` - button to switch to the raw SQL editor
* `Add query` - button to add more than one query
* `Expression` - button to add expressions to the query.

![query settings](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/query%20settings.png)

## Query Options

### RQ.SRS.Plugin.QueryOptions
version: 1.0

The [Plugin] SHALL support the following options for the query:

* `Max data points` - text field that defines the maximum data points per series
* `Min interval` - text field that defines a lower limit for the interval
* `Interval` - invariable text field. It is the evaluated interval that is sent to the data source and is used in $__interval and $__interval_ms
* `Relative time` - text field that overrides the relative time range for individual panel
* `Time shift` - text field that overrides the time range for individual panel by shifting its start and end relative to the time picker.

![query options](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/query%20options.png)

## Raw SQL Editor

### RQ.SRS.Plugin.RawSQLEditorInterface
version: 1.0

The [Plugin]'s raw SQL editor interface SHALL contain the following fields:

* SQL editor
* `Extrapolation`
* `Skip Comments`
* `Step`
* `Round`
* `Resolution`
* `Format As`
* `Show help`
* `Show generated SQL`
* `Reformat Query`

![sql editor](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/sql%20editor.png)


### RQ.SRS.Plugin.RawSQLEditorInterface.SQLEditor
version: 1.0

The [Plugin] SHALL support specifying SQL query by using SQL Editor text field for SQL query.

### RQ.SRS.Plugin.RawSQLEditorInterface.Extrapolation
version: 1.0

The [Plugin] SHALL support turning on and off extrapolation for vizualizations using the `Extrapolation` toggle.

### RQ.SRS.Plugin.RawSQLEditorInterface.SkipComments
version: 1.0

The [Plugin] SHALL support turning on and off sending comments to [ClickHouse] server by using the `Skip Comments` toggle.

### RQ.SRS.Plugin.RawSQLEditorInterface.Step
version: 1.0

The [Plugin] SHALL support specifying the grid step on the graphs by using the `Step` text field.

### RQ.SRS.Plugin.RawSQLEditorInterface.Round
version: 1.0

The [Plugin] SHALL support specifying rounding for the timestamps by using the `Round` text field.

### RQ.SRS.Plugin.RawSQLEditorInterface.Resolution
version: 1.0

The [Plugin] SHALL support specifying resolation for graphs by using the `Resolution` dropdown menu.

### RQ.SRS.Plugin.RawSQLEditorInterface.FormatAs
version: 1.0

The [Plugin] SHALL support choosing the visualization type by using the `Format As` dropdown menu.
The following types SHALL be supported: `Time series`, `Table`, `Logs`, `Trace`, `Flamegraph`.

### RQ.SRS.Plugin.RawSQLEditorInterface.ShowHelp
version: 1.0

The [Plugin] SHALL allow user to get information about macroc and functions by clicking `Show help` button.

### RQ.SRS.Plugin.RawSQLEditorInterface.ShowGeneratedSQL
version: 1.0

The [Plugin] SHALL allow user to get generated SQL query in raw form without macros and functions by clicking `Show generated SQL` button.


### RQ.SRS.Plugin.RawSQLEditorInterface.ReformatQuery
version: 1.0

The [Plugin] SHALL allow user to reformat query in SQL editor by clicking `Reformat Query` button.

## Auto-complete In Queries

### RQ.SRS.Plugin.AutoCompleteInQueries
version: 1.0

The [Plugin] SHALL support auto-complete in queries for field names and table names.

## Time range selector

### RQ.SRS.Plugin.TimeRangeSelector
version: 1.0

The [Plugin] SHALL support a time range selector for visualization using the time range dropdown menu.

### RQ.SRS.Plugin.TimeRangeSelector.Zoom
version: 1.0

The [Plugin] SHALL support zooming in by selecting an area on the graph and zooming out by double-clicking on the graph.

## Сhanging The Size Of The Graph

### RQ.SRS.Plugin.FillActual
version: 1.0

The [Plugin] SHALL support changing the size of the graph by clicking `Fill`/`Actual` toggle.

## Refresh Databoard

### RQ.SRS.Plugin.RefreshDataboard
version: 1.0

The [Plugin] SHALL support refreshing visualization by clicking the `Refresh` button.

## Inspecting Query

### RQ.SRS.Plugin.QueryInspector
version: 1.0

The [Plugin] SHALL support inspecting queries by clicking `Query inspector`.
The [Plugin] SHALL allow user to check data returned by query in the `Data` tab, request stats in the `Stats` tab, 
panel in JSON format in the `JSON` tab, request information in the `Query` tab.

![query inspector](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/query%20inspector.png)

### RQ.SRS.Plugin.QueryInspector.QueryTab
version: 1.0

The [Plugin] SHALL support getting information about requests in the `Query` tab by clicking the `Refresh` button.
This tab SHALL have an `Expand all` or `Collapse all` button to expand or collapse request information.
This tab SHALL have a `Copy to clipboard` button to copy request information to clipboard.

## Visualization

### RQ.SRS.Plugin.Visualization
version: 1.0

The [Plugin] SHALL display visualization on changing attention.

### RQ.SRS.Plugin.Visualization.Legends

The [Plugin] SHALL define names of graphs as collumn names in query response.

### Table View

#### RQ.SRS.Plugin.Visualization.Table
version: 1.0

The [Plugin] SHALL support table view for data.

### Visualization Types

#### RQ.SRS.Plugin.Visualization.VisualizationTypes
version: 1.0

The [Plugin] SHALL support the following visualization types for any supported clickhouse data types:

* Time series
* Bar chart
* Stat
* Gauge
* Bar Gauge
* Pie chart
* State timeline
* Heatmap
* Status history
* Histogram
* Text
* Alert List
* Dashboard list
* News
* Annotation list
* Candlestick
* Canvas
* Flame Graph
* Geomap
* Logs
* Node Graph
* Traces


## Macros

### RQ.SRS.Plugin.QuerySettings.Macros
version: 1.0

The [Plugin] SHALL support the following macroces:

* `$table`
* `$dateCol`
* `$dateTimeCol`
* `$from`
* `$to`
* `$interval`
* `$timeFilter`
* `$timeFilterByColumn($column)`
* `$timeSeries`
* `$naturalTimeSeries`
* `$unescape($variable)`
* `$adhoc`

A description of macros SHALL be available by typing their names in raw SQL editor interface.

https://github.com/Altinity/clickhouse-grafana?tab=readme-ov-file#macros-support

### RQ.SRS.Plugin.QuerySettings.Macros.Table
version: 1.0

The [Plugin] SHALL support `$table` macro in SQL edior. `$table` macro SHALL be replaced with selected table name from query setup interface. 
$table macro SHALL correctly escape any symbols that can be in [ClickHouse] table name.

### RQ.SRS.Plugin.QuerySettings.Macros.DateCol
version: 1.0

The [Plugin] SHALL support `$dateCol` macro in SQL edior. `$dateCol` macro SHALL be replaced with selected Column:Date from query setup interface.

### RQ.SRS.Plugin.QuerySettings.Macros.DateTimeCol
version: 1.0

The [Plugin] SHALL support `$dateTimeCol` macro in SQL edior. `$dateTimeCol` macro SHALL be replaced with Column:DateTime or Column:TimeStamp value from query setup interface.

### RQ.SRS.Plugin.QuerySettings.Macros.From
version: 1.0

The [Plugin] SHALL support `$from` macro in SQL edior. `$from` macro SHALL be replaced with (timestamp with ms)/1000 value of UI selected `Time Range:From`.

### RQ.SRS.Plugin.QuerySettings.Macros.To
version: 1.0

The [Plugin] SHALL support `$to` macro in SQL edior. `$to` macro SHALL be replaced with (timestamp with ms)/1000 value of UI selected `Time Range:To`.

### RQ.SRS.Plugin.QuerySettings.Macros.Interval
version: 1.0

The [Plugin] SHALL support `$interval` macro in SQL edior. `$interval` macro SHALL be replaced with selected "Group by a time interval" value in seconds.

### RQ.SRS.Plugin.QuerySettings.Macros.TimeFilterByColumn
version: 1.0

The [Plugin] SHALL support `$timeFilterByColumn($column)` macro in SQL edior. `$timeFilterByColumn($column)` macro SHALL be replaced with currently 
selected `Time Range` for a column passed as $column argument. `$timeFilterByColumn($column)` macro SHALL work with any clickhouse date or time type. 

### RQ.SRS.Plugin.QuerySettings.Macros.TimeSeries
version: 1.0

The [Plugin] SHALL support `$timeSeries` macro in SQL edior. `$timeSeries` macro SHALL be replaced with special [ClickHouse] construction 
to convert results as time-series data.

### RQ.SRS.Plugin.QuerySettings.Macros.NaturalTimeSeries
version: 1.0

The [Plugin] SHALL support `$naturalTimeSeries` macro in SQL edior. `$naturalTimeSeries` macro SHALL be replaced with special [ClickHouse] 
construction to convert results as time-series with in a logical/natural breakdown.

### RQ.SRS.Plugin.QuerySettings.Macros.Unescape
version: 1.0

The [Plugin] SHALL support `$unescape($variable)` macro in SQL edior. `$unescape($variable)` macro SHALL be replaced with variable 
value without single quotes.


### RQ.SRS.Plugin.QuerySettings.Macros.Adhoc
version: 1.0

The [Plugin] SHALL support `$adhoc` macro in SQL edior. `$adhoc` macro SHALL be replaced with a rendered ad-hoc filter expression, 
or "1" if no ad-hoc filters exist. Adhoc filter SHALL support evaluating varchar field with numeric value.

## Variables Setup

### RQ.SRS.Plugin.Variables
version: 1.0

The [Plugin] SHALL support [Grafana] variables setup for dashboards by clicking gear button and 
setuping variables in the `Variables` tab. The [Plugin] SHALL support the following variable types:
* `Query`
* `Custom`
* `Text box`
* `Constant`
* `Data source`
* `Interval`
* `Ad hoc filter`

## Annotations Setup

### RQ.SRS.Plugin.Annotations
version: 1.0

The [Plugin] SHALL support [Grafana] annotations setup for dashboards by clicking gear button and 
setuping variables in the `Annotations` tab.

## Setaping Alerts

### RQ.SRS.Plugin.Alerts
version: 1.0

The [Plugin] SHALL support [Grafana] alerts setup for panels by clicking `New alert rule` button in `Alert rule` tab
in edit panel view.

### RQ.SRS.Plugin.Alerts.AlertSetupPage
version: 1.0

The [Plugin] SHALL allow defining query and alert condition by using query setup interface and raw SQL editor in alert setup page.

### RQ.SRS.Plugin.Alerts.RuleType.GrafanaManaged
version: 1.0

The [Plugin] SHALL support `Grafana-managed` rule type by choosing rule type in alert setup page. 
This alert SHALL be captured by grafana.


### RQ.SRS.Plugin.Alerts.RuleType.DataSourceManaged
version: 1.0

The [Plugin] SHALL support `Data source-managed` rule type by choosing rule type in alert setup page. 
This alert SHALL be captured by data source.

## Functions

### RQ.SRS.Plugin.Functions
version: 1.0

The [Plugin] SHALL support the following functions in SQL queries:

* `$rate` 
* `$columns`
* `$rateColumns`
* `$perSecond`
* `$perSecondColumns`
* `$delta`
* `$deltaColumns`
* `$increase`
* `$increaseColumns`
* `$lttb`

These functions are templates of SQL queries. The user SHALL be allowed to check queries in the expanded format in the raw SQL editor interface.
Only one function per query is allowed.

https://github.com/Altinity/clickhouse-grafana?tab=readme-ov-file#functions

### RQ.SRS.Plugin.Functions.Rate
version: 1.0

The [Plugin] SHALL support the `$rate` function in SQL editor. This function SHALL convert query results as "change rate per interval".

### RQ.SRS.Plugin.Functions.Columns
version: 1.0

The [Plugin] SHALL support the `$columns(key, value)` function in SQL editor. This function SHALL query values as array of [key, value], 
where key will be used as label. The [Plugin] SHALL support $columns function with fill option in query.

### RQ.SRS.Plugin.Functions.RateColumns
version: 1.0

The [Plugin] SHALL support the `$rateColumns` function in SQL editor. This function SHALL be a combination of $columns and $rate functions.

### RQ.SRS.Plugin.Functions.PerSecond
version: 1.0

The [Plugin] SHALL support the `$perSecond` function in SQL editor. This function SHALL convert query results as "change rate per interval" 
for Counter-like(growing only) metrics.

### RQ.SRS.Plugin.Functions.PerSecondColumns
version: 1.0

The [Plugin] SHALL support the `$perSecondColumns` function in SQL editor. This function SHALL be a combination of $columns and $perSecond 
functions for Counter-like metrics.

### RQ.SRS.Plugin.Functions.Delta
version: 1.0

The [Plugin] SHALL support the `$delta` function in SQL editor. This function SHALL convert query results as "delta value inside interval" 
for Counter-like(growing only) metrics, will negative if counter reset.

### RQ.SRS.Plugin.Functions.DeltaColumns
version: 1.0

The [Plugin] SHALL support the `$deltaColumns` function in SQL editor. This function SHALL be a combination of $columns and $delta 
functions for Counter-like metrics.

### RQ.SRS.Plugin.Functions.Increase
version: 1.0

The [Plugin] SHALL support the `$increase` function in SQL editor. This function SHALL convert query results as "non-negative delta value inside interval" 
for Counter-like(growing only) metrics, will zero if counter reset and delta less zero.

### RQ.SRS.Plugin.Functions.IncreaseColumns
version: 1.0

The [Plugin] SHALL support the `$increaseColumns` function in SQL editor. This function SHALL be a combination of $columns and $increase 
functions for Counter-like metrics.

### RQ.SRS.Plugin.Functions.Lttb
version: 1.0

The [Plugin] SHALL support the `$lttb` function in SQL editor.

### RQ.SRS.Plugin.Functions.SubQuery
version: 1.0

The [Plugin] SHALL support sub queries in SQL editor.

## Supported ClickHouse Datatypes

### RQ.SRS.Plugin.SupportedDataTypes
version: 1.0

The [Plugin] SHALL support scalar data types. The following data types SHALL be supported:



| Data Type                                                                           | Supported in Grafana |
| ----------------------------------------------------------------------------------- |:--------------------:|
| UInt8, UInt16, UInt32, UInt64, UInt128, UInt256                                     |       &#10004;       |
| Int8, Int16, Int32, Int64, Int128, Int256                                           |       &#10004;       |
| Float32, Float64                                                                    |       &#10004;       |
| Decimal(P), Decimal(P, S), Decimal32(S), Decimal64(S), Decimal128(S), Decimal256(S) |       &#10004;       |
| Bool                                                                                |       &#10004;       |
| String                                                                              |       &#10004;       |
| FixedString(N)                                                                      |       &#10004;       |
| Date, Date32, DateTime, DateTime64                                                  |       &#10004;       |
| JSON                                                                                |       &#10060;       |
| UUID                                                                                |       &#10004;       |
| Enum                                                                                |       &#10004;       |
| LowCardinality                                                                      |       &#10004;       |
| Array                                                                               |       &#10060;       |
| Map                                                                                 |       &#10060;       |
| SimpleAggregateFunction                                                             |       &#10004;       |
| AggregateFunction                                                                   |       &#10004;       |
| Nested                                                                              |       &#10060;       |
| Tuple                                                                               |       &#10060;       |
| Nullable                                                                            |       &#10004;       |
| IPv4                                                                                |       &#10004;       |
| IPv6                                                                                |       &#10004;       |
| Point                                                                               |       &#10060;       |
| Ring                                                                                |       &#10060;       |
| Polygon                                                                             |       &#10060;       |
| MultiPolygon                                                                        |       &#10060;       |
| Expression                                                                          |       &#10060;       |
| Set                                                                                 |       &#10060;       |
| Nothing                                                                             |       &#10060;       |
| Interval                                                                            |       &#10060;       |


### RQ.SRS.Plugin.SupportedDataTypes.LimitValues
version: 1.0

The [Plugin] SHALL support max and min values of [ClickHouse] numeric datatypes.

* Int8 — [-128 : 127]
* Int16 — [-32768 : 32767]
* Int32 — [-2147483648 : 2147483647]
* Int64 — [-9223372036854775808 : 9223372036854775807]
* Int128 — [-170141183460469231731687303715884105728 : 170141183460469231731687303715884105727]
* Int256 — [-57896044618658097711785492504343953926634992332820282019728792003956564819968 : 57896044618658097711785492504343953926634992332820282019728792003956564819967]
* UInt8 — [0 : 255]
* UInt16 — [0 : 65535]
* UInt32 — [0 : 4294967295]
* UInt64 — [0 : 18446744073709551615]
* UInt128 — [0 : 340282366920938463463374607431768211455]
* UInt256 — [0 : 115792089237316195423570985008687907853269984665640564039457584007913129639935]

 For float datatypes inf and - inf values not supported.
 

## Versions Compatibility

### RQ.SRS.Plugin.VersionCompatibility
version: 1.0

The [Plugin] 3.0 version SHALL support the following [Grafana] versions:

| Grafana version         | Supported with plugin |
| ----------------------- |:---------------------:|
| v10.3                   |                       |

[SRS]: #srs
[ClickHouse]: https://clickhouse.tech
[Plugin]: https://github.com/Altinity/clickhouse-grafana
[GitHub Repository]: https://github.com/Altinity/clickhouse-grafana
[Altinity Grafana Datasource Plugin For ClickHouse]: https://github.com/Altinity/clickhouse-grafana
[Grafana]: https://grafana.com/
[CORS]: https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
