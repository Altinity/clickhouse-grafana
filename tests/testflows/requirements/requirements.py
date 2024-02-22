# These requirements were auto generated
# from software requirements specification (SRS)
# document by TestFlows v2.0.240111.1210833.
# Do not edit by hand but re-generate instead
# using 'tfs requirements generate' command.
from testflows.core import Specification
from testflows.core import Requirement

Heading = Specification.Heading

RQ_SRS_Plugin_ManualPluginInstallation = Requirement(
    name='RQ.SRS.Plugin.ManualPluginInstallation',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL be available to be installed using grafana-cli with the following command:\n'
        '\n'
        '`grafana-cli plugins install vertamedia-clickhouse-datasource`. \n'
        '\n'
        'For installation, user need to install [Grafana] first.\n'
        '\n'
    ),
    link=None,
    level=3,
    num='3.1.1'
)

RQ_SRS_Plugin_GrafanaCloudPluginInstallation = Requirement(
    name='RQ.SRS.Plugin.GrafanaCloudPluginInstallation',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL be available to be installed in Grafana Cloud with the following steps:\n'
        '* Go to Grafana Cloud\n'
        '* Go to Administration `>` Plugins And Data `>` Plugins\n'
        '* Find `Altinity plugin for ClickHouse`\n'
        '* Click Install\n'
        '\n'
        '![configuration](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/configuration.png)\n'
        '![filter](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/filter.png)\n'
        '![add data source](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/add%20data%20source.png)\n'
        '\n'
    ),
    link=None,
    level=3,
    num='3.2.1'
)

RQ_SRS_Plugin_DockerComposeEnvironment = Requirement(
    name='RQ.SRS.Plugin.DockerComposeEnvironment',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL be available to be run using docker compose with the following commands:\n'
        '```\n'
        'docker-compose run --rm frontend_builder\n'
        'docker-compose run --rm backend_builder\n'
        'echo \'export GRAFANA_ACCESS_POLICY_TOKEN="{grafana_token}"\' > .release_env\n'
        'docker-compose run --rm plugin_signer\n'
        'docker-compose up -d grafana\n'
        '```\n'
        '\n'
    ),
    link=None,
    level=3,
    num='3.3.1'
)

RQ_SRS_Plugin = Requirement(
    name='RQ.SRS.Plugin',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support connecting the [ClickHouse] server to [Grafana].\n'
        '\n'
    ),
    link=None,
    level=2,
    num='4.1'
)

RQ_SRS_Plugin_DataSourceSetupView_ = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView ',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support creating a new [ClickHouse] data source by clicking the `Add new data source` button on the [Plugin] page.\n'
        'The [Plugin] SHALL open the data source setup view by clicking the `Add new data source` button.\n'
        'This view SHALL contain the following sections:\n'
        '* `Name`\n'
        '* `HTTP`\n'
        '* `Auth toggles`\n'
        '* `Custom HTTP Headers`\n'
        '* `Additional`\n'
        '\n'
        '![data source setup](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/data%20source%20setup.png)\n'
        '\n'
    ),
    link=None,
    level=2,
    num='5.1'
)

RQ_SRS_Plugin_DataSourceSetupView_SaveAndTestButton = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.SaveAndTestButton',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        "The [Plugin]'s data source setup view SHALL contain a `Save & test` button that SHALL save datasource and check if [ClickHouse]\n"
        'datasource is connected to [Grafana] correctly.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='5.2'
)

RQ_SRS_Plugin_DataSourceSetupView_DataSourceName = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.DataSourceName',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying a data source name by using the `Name` text field in the data source setup view.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='6.1'
)

RQ_SRS_Plugin_DataSourceSetupView_DefaultDataSource = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.DefaultDataSource',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying the data source as default by using the `Default` toggle in the data source setup view.\n'
        'The default data source SHALL be preselected in new pannels.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='7.1'
)

RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying an HTTP connection using the following fields:\n'
        '\n'
        '* The `URL` text field to specify [ClickHouse] URL\n'
        '* The `Access` dropdown menu to specify `Server` or `Browser` access will be used\n'
        '* The `Allowed cookies` text field to specify cookies that SHALL not be deleted\n'
        '* The `Timeout` text field to specify the HTTP request timeout in seconds.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='8.1'
)

RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_ServerAccess = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.ServerAccess',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support connecting to the [ClickHouse] server by selecting the `Server` option in the `Access` dropdown menu\n'
        'in the data source setup view. In this case all requests SHALL be made from the browser to Grafana backend/server which in turn will forward the \n'
        "requests to the data source. The [Plugin]'s data source setup view SHALL contain `Allowed cookies` and `Timeout` text fields \n"
        'if only the `Server` option is selected in the `Access` dropdown menu.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='9.1'
)

RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_BrowserAccess = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.BrowserAccess',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support connecting to the [ClickHouse] server by selecting the `Browser` option` in the `Access` dropdown menu\n'
        'in the data source setup view. In this case all requests SHALL be made from the browser directly to the data source.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='10.1'
)

RQ_SRS_Plugin_DataSourceSetupView_Auth = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.Auth',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying authentication details by specifying the following toggles:\n'
        '\n'
        '* `Basic auth`\n'
        '* `TLS Client Auth`\n'
        '* `Skip TLS Verify`\n'
        '* `Forward OAuth Identity`\n'
        '* `With Credentials`\n'
        '* `With CA Cert`\n'
        '\n'
    ),
    link=None,
    level=2,
    num='11.1'
)

RQ_SRS_Plugin_DataSourceSetupView_BasicAuth = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.BasicAuth',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying username and password for the [ClickHouse] server by turning on the `Basic auth` toggle\n'
        'and specifying username and password in the `User` and `Password` text fields, respectively. The `Password` text field SHALL \n'
        'be able to be empty. The [Plugin] SHALL add the `Basic Auth Details` section to the data source setup view only if the `Basic auth`\n'
        'toggle is on.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='12.1'
)

RQ_SRS_Plugin_DataSourceSetupView_TLS_SSLAuthDetails = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.TLS/SSLAuthDetails',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying server name, client certificate, and client key for the [ClickHouse] server by turning on \n'
        'the `TLS Client Auth` toggle and specifying these options in the `ServerName`, `Client Cert`, and `Client Key` text fields, respectively. \n'
        'The [Plugin] SHALL add `ServerName`, `Client Cert`, and `Client Key` text fields to the data source setup view only if the \n'
        '`TLS Client Auth` toggle is on.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='13.1'
)

RQ_SRS_Plugin_DataSourceSetupView_ForwardOAuthIdentity = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.ForwardOAuthIdentity',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support Forward OAuth Identity by turning on the `Forward OAuth Identity` toggle.\n'
        "The [Plugin] SHALL forward the user's upstream OAuth identity to the data source if this toggle is on.\n"
        '\n'
    ),
    link=None,
    level=2,
    num='14.1'
)

RQ_SRS_Plugin_DataSourceSetupView_WithCredentials = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.WithCredentials',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support sending credentials such as cookies or authentication headers with cross-site \n'
        'requests by turning on the `With Credentials` toggle.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='15.1'
)

RQ_SRS_Plugin_DataSourceSetupView_Auth_WithCACert = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.Auth.WithCACert',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying the CA certificate that will be used to access the [ClickHouse] server \n'
        'by turning on the `With CA Cert` toggle and specifying the `CA Cert` text field. The [Plugin] SHALL add the \n'
        '`CA Cert` text field to the data source setup view only if the `TLS Client Auth` toggle is on.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='16.1'
)

RQ_SRS_Plugin_DataSourceSetupView_CustomHTTPHeaders = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.CustomHTTPHeaders',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support custom HTTP headers that will be used for HTTP requests to the [ClickHouse] server \n'
        'by pressing the `Add Header` button and specifying the `Header` and `Value` text fields.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='17.1'
)

RQ_SRS_Plugin_DataSourceSetupView_DeletingCustomHTTPHeaders = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.DeletingCustomHTTPHeaders',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support deleting custom HTTP headers by clicking the bucket button nearby this header.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='17.2'
)

RQ_SRS_Plugin_DataSourceSetupView_UseYandexCloudAuthorizationHeaders = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.UseYandexCloudAuthorizationHeaders',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support connection to managed Yandex.Cloud [ClickHouse] database setup by turning on the \n'
        '`Use Yandex.Cloud authorization headers` toggle and specifying the `X-ClickHouse-User` and `X-ClickHouse-Key` \n'
        'text fields.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='18.1'
)

RQ_SRS_Plugin_DataSourceSetupView_AddCORSFlagToRequests = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.AddCORSFlagToRequests',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support adding the [CORS] flag to requests by turning on the `Add CORS flag to requests` toggle.\n'
        'If this toggle is on, the [Plugin] SHALL attach `add_http_cors_header=1` to requests.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='19.1'
)

RQ_SRS_Plugin_DataSourceSetupView_UsePostRequests = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.UsePostRequests',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying the use of POST requests to the [ClickHouse] server by turning on the \n'
        '`Use POST method to send queries` toggle.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='20.1'
)

RQ_SRS_Plugin_DataSourceSetupView_DefaultDatabase = Requirement(
    name='RQ.SRS.Plugin.DataSourceSetupView.DefaultDatabase',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying the default [ClickHouse] server database by using the `Default database` text field.\n'
        'This database name SHALL be prefilled in the query builder.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='21.1'
)

RQ_SRS_Plugin_Dashboards = Requirement(
    name='RQ.SRS.Plugin.Dashboards',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support creating dashboards with panels that use the [ClickHouse] data source that was created using the [Plugin].\n'
        '\n'
    ),
    link=None,
    level=2,
    num='22.1'
)

RQ_SRS_Plugin_Panels = Requirement(
    name='RQ.SRS.Plugin.Panels',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support creating panels for the [ClickHouse] data source if the [ClickHouse] data source \n'
        'was created using the [Plugin].\n'
        '\n'
    ),
    link=None,
    level=2,
    num='23.1'
)

RQ_SRS_Plugin_Panels_Repeated = Requirement(
    name='RQ.SRS.Plugin.Panels.Repeated',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support creating more than 1 panel by defining 1 panel and using variables.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='23.2'
)

RQ_SRS_Plugin_MultiUserUsage = Requirement(
    name='RQ.SRS.Plugin.MultiUserUsage',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support multi-user usage of the [Clickhouse] data source that was created using the [Plugin].\n'
        '\n'
        '\n'
    ),
    link=None,
    level=2,
    num='24.1'
)

RQ_SRS_Plugin_MultiUserUsage_SamePanel = Requirement(
    name='RQ.SRS.Plugin.MultiUserUsage.SamePanel',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support access for the same panel from different users at the same time.\n'
        '\n'
        '\n'
    ),
    link=None,
    level=2,
    num='24.2'
)

RQ_SRS_Plugin_MultiUserUsage_DifferentPanels = Requirement(
    name='RQ.SRS.Plugin.MultiUserUsage.DifferentPanels',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support access for different panels from different users at the same time.\n'
        '\n'
        '\n'
    ),
    link=None,
    level=2,
    num='24.3'
)

RQ_SRS_Plugin_MultiUserUsage_SameDashboard = Requirement(
    name='RQ.SRS.Plugin.MultiUserUsage.SameDashboard',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support access for the same dashboard from different users at the same time.\n'
        '\n'
        '\n'
    ),
    link=None,
    level=2,
    num='24.4'
)

RQ_SRS_Plugin_MultiUserUsage_DifferentDashboards = Requirement(
    name='RQ.SRS.Plugin.MultiUserUsage.DifferentDashboards',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support access for different dashboards from different users at the same time.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='24.5'
)

RQ_SRS_Plugin_QuerySetup = Requirement(
    name='RQ.SRS.Plugin.QuerySetup',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support creating Grafana visualizations using the query setup interface and raw SQL editor.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='25.1'
)

RQ_SRS_Plugin_QuerySetupInterface = Requirement(
    name='RQ.SRS.Plugin.QuerySetupInterface',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        "The [Plugin]'s query setup interface SHALL contain the following fields:\n"
        '\n'
        "* `FROM` - `Database` and `Table` dropdown's that allow the user to specify the database and table for the query\n"
        '* `Column timestamp type` - dropdown of types `DateTime`, `DateTime64`, or `UInt32`\n'
        "* `Timestamp Column` - dropdown of the table's timestamp columns with a type defined in `Column timestamp type`\n"
        "* `Date column` - dropdown of the table's data columns `Date` and `Date32` type\n"
        '* `Go to Query` - button to switch to the raw SQL editor\n'
        '* `Add query` - button to add more than one query\n'
        '* `Expression` - button to add expressions to the query.\n'
        '\n'
        '![query settings](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/query%20settings.png)\n'
        '\n'
    ),
    link=None,
    level=2,
    num='26.1'
)

RQ_SRS_Plugin_QueryOptions = Requirement(
    name='RQ.SRS.Plugin.QueryOptions',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the following options for the query:\n'
        '\n'
        '* `Max data points` - text field that defines the maximum data points per series\n'
        '* `Min interval` - text field that defines a lower limit for the interval\n'
        '* `Interval` - invariable text field. It is the evaluated interval that is sent to the data source and is used in $__interval and $__interval_ms\n'
        '* `Relative time` - text field that overrides the relative time range for individual panel\n'
        '* `Time shift` - text field that overrides the time range for individual panel by shifting its start and end relative to the time picker.\n'
        '\n'
        '![query options](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/query%20options.png)\n'
        '\n'
    ),
    link=None,
    level=2,
    num='27.1'
)

RQ_SRS_Plugin_RawSQLEditorInterface = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        "The [Plugin]'s raw SQL editor interface SHALL contain the following fields:\n"
        '\n'
        '* SQL editor\n'
        '* `Extrapolation`\n'
        '* `Skip Comments`\n'
        '* `Step`\n'
        '* `Round`\n'
        '* `Resolution`\n'
        '* `Format As`\n'
        '* `Show help`\n'
        '* `Show generated SQL`\n'
        '* `Reformat Query`\n'
        '\n'
        '![sql editor](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/sql%20editor.png)\n'
        '\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.1'
)

RQ_SRS_Plugin_RawSQLEditorInterface_SQLEditor = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.SQLEditor',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying SQL query by using SQL Editor text field for SQL query.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.2'
)

RQ_SRS_Plugin_RawSQLEditorInterface_Extrapolation = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.Extrapolation',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support turning on and off extrapolation for vizualizations using the `Extrapolation` toggle.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.3'
)

RQ_SRS_Plugin_RawSQLEditorInterface_SkipComments = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.SkipComments',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support turning on and off sending comments to [ClickHouse] server by using the `Skip Comments` toggle.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.4'
)

RQ_SRS_Plugin_RawSQLEditorInterface_Step = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.Step',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying the grid step on the graphs by using the `Step` text field.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.5'
)

RQ_SRS_Plugin_RawSQLEditorInterface_Round = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.Round',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying rounding for the timestamps by using the `Round` text field.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.6'
)

RQ_SRS_Plugin_RawSQLEditorInterface_Resolution = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.Resolution',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support specifying resolation for graphs by using the `Resolution` dropdown menu.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.7'
)

RQ_SRS_Plugin_RawSQLEditorInterface_FormatAs = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.FormatAs',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support choosing the visualization type by using the `Format As` dropdown menu.\n'
        'The following types SHALL be supported: `Time series`, `Table`, `Logs`, `Trace`, `Flamegraph`.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.8'
)

RQ_SRS_Plugin_RawSQLEditorInterface_ShowHelp = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.ShowHelp',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL allow user to get information about macroc and functions by clicking `Show help` button.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.9'
)

RQ_SRS_Plugin_RawSQLEditorInterface_ShowGeneratedSQL = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.ShowGeneratedSQL',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL allow user to get generated SQL query in raw form without macros and functions by clicking `Show generated SQL` button.\n'
        '\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.10'
)

RQ_SRS_Plugin_RawSQLEditorInterface_ReformatQuery = Requirement(
    name='RQ.SRS.Plugin.RawSQLEditorInterface.ReformatQuery',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL allow user to reformat query in SQL editor by clicking `Reformat Query` button.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='28.11'
)

RQ_SRS_Plugin_AutoCompleteInQueries = Requirement(
    name='RQ.SRS.Plugin.AutoCompleteInQueries',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support auto-complete in queries for field names and table names.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='29.1'
)

RQ_SRS_Plugin_TimeRangeSelector = Requirement(
    name='RQ.SRS.Plugin.TimeRangeSelector',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support a time range selector for visualization using the time range dropdown menu.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='30.1'
)

RQ_SRS_Plugin_TimeRangeSelector_Zoom = Requirement(
    name='RQ.SRS.Plugin.TimeRangeSelector.Zoom',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support zooming in by selecting an area on the graph and zooming out by double-clicking on the graph.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='30.2'
)

RQ_SRS_Plugin_FillActual = Requirement(
    name='RQ.SRS.Plugin.FillActual',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support changing the size of the graph by clicking `Fill`/`Actual` toggle.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='31.1'
)

RQ_SRS_Plugin_RefreshDataboard = Requirement(
    name='RQ.SRS.Plugin.RefreshDataboard',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support refreshing visualization by clicking the `Refresh` button.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='32.1'
)

RQ_SRS_Plugin_QueryInspector = Requirement(
    name='RQ.SRS.Plugin.QueryInspector',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support inspecting queries by clicking `Query inspector`.\n'
        'The [Plugin] SHALL allow user to check data returned by query in the `Data` tab, request stats in the `Stats` tab, \n'
        'panel in JSON format in the `JSON` tab, request information in the `Query` tab.\n'
        '\n'
        '![query inspector](https://github.com/antip00/clickhouse-grafana/blob/master/tests/testflows/requirements/images/query%20inspector.png)\n'
        '\n'
    ),
    link=None,
    level=2,
    num='33.1'
)

RQ_SRS_Plugin_QueryInspector_QueryTab = Requirement(
    name='RQ.SRS.Plugin.QueryInspector.QueryTab',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support getting information about requests in the `Query` tab by clicking the `Refresh` button.\n'
        'This tab SHALL have an `Expand all` or `Collapse all` button to expand or collapse request information.\n'
        'This tab SHALL have a `Copy to clipboard` button to copy request information to clipboard.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='33.2'
)

RQ_SRS_Plugin_Visualization = Requirement(
    name='RQ.SRS.Plugin.Visualization',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL display visualization on changing attention.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='34.1'
)

RQ_SRS_Plugin_Visualization_Table = Requirement(
    name='RQ.SRS.Plugin.Visualization.Table',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support table view for data.\n'
        '\n'
    ),
    link=None,
    level=3,
    num='34.3.1'
)

RQ_SRS_Plugin_Visualization_VisualizationTypes = Requirement(
    name='RQ.SRS.Plugin.Visualization.VisualizationTypes',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the following visualization types for data:\n'
        '\n'
        '* Time series\n'
        '* Bar chart\n'
        '* Stat\n'
        '* Gauge\n'
        '* Bar Gauge\n'
        '* Pie chart\n'
        '* State timeline\n'
        '* Heatmap\n'
        '* Status history\n'
        '* Histogram\n'
        '* Text\n'
        '* Alert List\n'
        '* Dashboard list\n'
        '* News\n'
        '* Annotation list\n'
        '* Candlestick\n'
        '* Canvas\n'
        '* Flame Graph\n'
        '* Geomap\n'
        '* Logs\n'
        '* Node Graph\n'
        '* Traces\n'
        '\n'
    ),
    link=None,
    level=3,
    num='34.4.1'
)

RQ_SRS_Plugin_QuerySettings_Macros = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the following macroces:\n'
        '\n'
        '* `$table`\n'
        '* `$dateCol`\n'
        '* `$dateTimeCol`\n'
        '* `$from`\n'
        '* `$to`\n'
        '* `$interval`\n'
        '* `$timeFilter`\n'
        '* `$timeFilterByColumn($column)`\n'
        '* `$timeSeries`\n'
        '* `$naturalTimeSeries`\n'
        '* `$unescape($variable)`\n'
        '* `$adhoc`\n'
        '\n'
        'A description of macros SHALL be available by typing their names in raw SQL editor interface.\n'
        '\n'
        'https://github.com/Altinity/clickhouse-grafana?tab=readme-ov-file#macros-support\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.1'
)

RQ_SRS_Plugin_QuerySettings_Macros_Table = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.Table',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$table` macro in SQL edior. `$table` macro SHALL be replaced with selected table name from query setup interface.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.2'
)

RQ_SRS_Plugin_QuerySettings_Macros_DateCol = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.DateCol',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$dateCol` macro in SQL edior. `$dateCol` macro SHALL be replaced with selected table name from query setup interface.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.3'
)

RQ_SRS_Plugin_QuerySettings_Macros_DateTimeCol = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.DateTimeCol',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$dateTimeCol` macro in SQL edior. `$dateTimeCol` macro SHALL be replaced with Column:DateTime or Column:TimeStamp value from query setup interface.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.4'
)

RQ_SRS_Plugin_QuerySettings_Macros_From = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.From',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$from` macro in SQL edior. `$from` macro SHALL be replaced with (timestamp with ms)/1000 value of UI selected `Time Range:From`.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.5'
)

RQ_SRS_Plugin_QuerySettings_Macros_To = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.To',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$to` macro in SQL edior. `$to` macro SHALL be replaced with (timestamp with ms)/1000 value of UI selected `Time Range:To`.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.6'
)

RQ_SRS_Plugin_QuerySettings_Macros_Interval = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.Interval',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$interval` macro in SQL edior. `$interval` macro SHALL be replaced with selected "Group by a time interval" value in seconds.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.7'
)

RQ_SRS_Plugin_QuerySettings_Macros_TimeFilterByColumn = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.TimeFilterByColumn',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$timeFilterByColumn($column)` macro in SQL edior. `$timeFilterByColumn($column)` macro SHALL be replaced with currently \n'
        'selected `Time Range` for a column passed as $column argument.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.8'
)

RQ_SRS_Plugin_QuerySettings_Macros_TimeSeries = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.TimeSeries',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$timeSeries` macro in SQL edior. `$timeSeries` macro SHALL be replaced with special [ClickHouse] construction \n'
        'to convert results as time-series data.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.9'
)

RQ_SRS_Plugin_QuerySettings_Macros_NaturalTimeSeries = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.NaturalTimeSeries',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$naturalTimeSeries` macro in SQL edior. `$naturalTimeSeries` macro SHALL be replaced with special [ClickHouse] \n'
        'construction to convert results as time-series with in a logical/natural breakdown.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.10'
)

RQ_SRS_Plugin_QuerySettings_Macros_Unescape = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.Unescape',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$unescape($variable)` macro in SQL edior. `$unescape($variable)` macro SHALL be replaced with variable \n'
        'value without single quotes.\n'
        '\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.11'
)

RQ_SRS_Plugin_QuerySettings_Macros_Adhoc = Requirement(
    name='RQ.SRS.Plugin.QuerySettings.Macros.Adhoc',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `$adhoc` macro in SQL edior. `$adhoc` macro SHALL be replaced with a rendered ad-hoc filter expression, \n'
        'or "1" if no ad-hoc filters exist.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='35.12'
)

RQ_SRS_Plugin_Variables = Requirement(
    name='RQ.SRS.Plugin.Variables',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support [Grafana] variables setup for dashboards by clicking gear button and \n'
        'setuping variables in the `Variables` tab. The [Plugin] SHALL support the following variable types:\n'
        '* `Query`\n'
        '* `Custom`\n'
        '* `Text box`\n'
        '* `Constant`\n'
        '* `Data source`\n'
        '* `Interval`\n'
        '* `Ad hoc filter`\n'
        '\n'
    ),
    link=None,
    level=2,
    num='36.1'
)

RQ_SRS_Plugin_Annotations = Requirement(
    name='RQ.SRS.Plugin.Annotations',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support [Grafana] annotations setup for dashboards by clicking gear button and \n'
        'setuping variables in the `Annotations` tab.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='37.1'
)

RQ_SRS_Plugin_Allerts = Requirement(
    name='RQ.SRS.Plugin.Allerts',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support [Grafana] allerts setup for panels by clicking `New alert rule` button in `Alert rule` tab\n'
        'in edit panel view.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='38.1'
)

RQ_SRS_Plugin_Allerts_AllertSetupPage = Requirement(
    name='RQ.SRS.Plugin.Allerts.AllertSetupPage',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL allow defining query and alert condition by using query setup interface and raw SQL editor in allert setup page.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='38.2'
)

RQ_SRS_Plugin_Allerts_RuleType = Requirement(
    name='RQ.SRS.Plugin.Allerts.RuleType',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support `Grafana-managed` and `Data source-managed` rule types by choosing rule type in allert setup page.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='38.3'
)

RQ_SRS_Plugin_Functions = Requirement(
    name='RQ.SRS.Plugin.Functions',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the following functions in SQL queries:\n'
        '\n'
        '* `$rate` \n'
        '* `$columns`\n'
        '* `$rateColumns`\n'
        '* `$perSecond`\n'
        '* `$perSecondColumns`\n'
        '* `$delta`\n'
        '* `$deltaColumns`\n'
        '* `$increase`\n'
        '* `$increaseColumns`\n'
        '\n'
        'These functions are templates of SQL queries. The user SHALL be allowed to check queries in the expanded format in the raw SQL editor interface.\n'
        'Only one function per query is allowed.\n'
        '\n'
        'https://github.com/Altinity/clickhouse-grafana?tab=readme-ov-file#functions\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.1'
)

RQ_SRS_Plugin_Functions_Rate = Requirement(
    name='RQ.SRS.Plugin.Functions.Rate',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the `$rate` function in SQL editor. This function SHALL convert query results as "change rate per interval".\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.2'
)

RQ_SRS_Plugin_Functions_Columns = Requirement(
    name='RQ.SRS.Plugin.Functions.Columns',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the `$columns(key, value)` function in SQL editor. This function SHALL query values as array of [key, value], \n'
        'where key will be used as label.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.3'
)

RQ_SRS_Plugin_Functions_RateColumns = Requirement(
    name='RQ.SRS.Plugin.Functions.RateColumns',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the `$rateColumns` function in SQL editor. This function SHALL be a combination of $columns and $rate functions.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.4'
)

RQ_SRS_Plugin_Functions_PerSecond = Requirement(
    name='RQ.SRS.Plugin.Functions.PerSecond',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the `$perSecond` function in SQL editor. This function SHALL convert query results as "change rate per interval" \n'
        'for Counter-like(growing only) metrics.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.5'
)

RQ_SRS_Plugin_Functions_PerSecondColumns = Requirement(
    name='RQ.SRS.Plugin.Functions.PerSecondColumns',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the `$perSecondColumns` function in SQL editor. This function SHALL be a combination of $columns and $perSecond \n'
        'functions for Counter-like metrics.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.6'
)

RQ_SRS_Plugin_Functions_Delta = Requirement(
    name='RQ.SRS.Plugin.Functions.Delta',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the `$delta` function in SQL editor. This function SHALL convert query results as "delta value inside interval" \n'
        'for Counter-like(growing only) metrics, will negative if counter reset.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.7'
)

RQ_SRS_Plugin_Functions_DeltaColumns = Requirement(
    name='RQ.SRS.Plugin.Functions.DeltaColumns',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the `$deltaColumns` function in SQL editor. This function SHALL be a combination of $columns and $delta \n'
        'functions for Counter-like metrics.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.8'
)

RQ_SRS_Plugin_Functions_Increase = Requirement(
    name='RQ.SRS.Plugin.Functions.Increase',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the `$increase` function in SQL editor. This function SHALL convert query results as "non-negative delta value inside interval" \n'
        'for Counter-like(growing only) metrics, will zero if counter reset and delta less zero.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.9'
)

RQ_SRS_Plugin_Functions_IncreaseColumns = Requirement(
    name='RQ.SRS.Plugin.Functions.IncreaseColumns',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support the `$increaseColumns` function in SQL editor. This function SHALL be a combination of $columns and $increase \n'
        'functions for Counter-like metrics.\n'
        '\n'
    ),
    link=None,
    level=2,
    num='39.10'
)

RQ_SRS_Plugin_SupportedTypes = Requirement(
    name='RQ.SRS.Plugin.SupportedTypes',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] SHALL support scalar data types. The following data types SHALL be supported:\n'
        '\n'
        '\n'
        '| Data Type                                                                           | Supported in Grafana |\n'
        '| ----------------------------------------------------------------------------------- |:--------------------:|\n'
        '| UInt8, UInt16, UInt32, UInt64, UInt128, UInt256                                     |                      |\n'
        '| Int8, Int16, Int32, Int64, Int128, Int256                                           |                      |\n'
        '| Float32, Float64                                                                    |                      |\n'
        '| Decimal(P), Decimal(P, S), Decimal32(S), Decimal64(S), Decimal128(S), Decimal256(S) |                      |\n'
        '| Bool                                                                                |                      |\n'
        '| String                                                                              |                      |\n'
        '| FixedString(N)                                                                      |                      |\n'
        '| Date, Date32, DateTime, DateTime64                                                  |                      |\n'
        '| JSON                                                                                |                      |\n'
        '| UUID                                                                                |                      |\n'
        '| Enum                                                                                |                      |\n'
        '| LowCardinality                                                                      |                      |\n'
        '| Array                                                                               |                      |\n'
        '| Map                                                                                 |                      |\n'
        '| SimpleAggregateFunction                                                             |                      |\n'
        '| AggregateFunction                                                                   |                      |\n'
        '| Nested                                                                              |                      |\n'
        '| Tuple                                                                               |                      |\n'
        '| Nullable                                                                            |                      |\n'
        '| IPv4                                                                                |                      |\n'
        '| IPv6                                                                                |                      |\n'
        '| Point                                                                               |                      |\n'
        '| Ring                                                                                |                      |\n'
        '| Polygon                                                                             |                      |\n'
        '| MultiPolygon                                                                        |                      |\n'
        '| Expression                                                                          |                      |\n'
        '| Set                                                                                 |                      |\n'
        '| Nothing                                                                             |                      |\n'
        '| Interval                                                                            |                      |\n'
        '\n'
        '\n'
    ),
    link=None,
    level=2,
    num='40.1'
)

RQ_SRS_Plugin_VersionCompatibility = Requirement(
    name='RQ.SRS.Plugin.VersionCompatibility',
    version='1.0',
    priority=None,
    group=None,
    type=None,
    uid=None,
    description=(
        'The [Plugin] 3.0 version SHALL support the following [Grafana] versions:\n'
        '\n'
        '| Grafana version         | Supported with plugin |\n'
        '| ----------------------- |:---------------------:|\n'
        '| v10.3                   |                       |\n'
        '\n'
        '[SRS]: #srs\n'
        '[ClickHouse]: https://clickhouse.tech\n'
        '[Plugin]: https://github.com/Altinity/clickhouse-grafana\n'
        '[GitHub Repository]: https://github.com/Altinity/clickhouse-grafana\n'
        '[Altinity Grafana Datasource Plugin For ClickHouse]: https://github.com/Altinity/clickhouse-grafana\n'
        '[Grafana]: https://grafana.com/\n'
        '[CORS]: https://en.wikipedia.org/wiki/Cross-origin_resource_sharing\n'
    ),
    link=None,
    level=2,
    num='41.1'
)

QA_SRS_Altinity_Grafana_Datasource_Plugin_For_ClickHouse = Specification(
    name='QA-SRS Altinity Grafana Datasource Plugin For ClickHouse',
    description=None,
    author=None,
    date=None,
    status=None,
    approved_by=None,
    approved_date=None,
    approved_version=None,
    version=None,
    group=None,
    type=None,
    link=None,
    uid=None,
    parent=None,
    children=None,
    headings=(
        Heading(name='Revision History', level=1, num='1'),
        Heading(name='Introduction', level=1, num='2'),
        Heading(name='Plugin Installation', level=1, num='3'),
        Heading(name='Manual Plugin Installation', level=2, num='3.1'),
        Heading(name='RQ.SRS.Plugin.ManualPluginInstallation', level=3, num='3.1.1'),
        Heading(name='Grafana Cloud Plugin Installation', level=2, num='3.2'),
        Heading(name='RQ.SRS.Plugin.GrafanaCloudPluginInstallation', level=3, num='3.2.1'),
        Heading(name='Docker Compose Environment Setup', level=2, num='3.3'),
        Heading(name='RQ.SRS.Plugin.DockerComposeEnvironment', level=3, num='3.3.1'),
        Heading(name='Grafana Datasource Plugin For ClickHouse', level=1, num='4'),
        Heading(name='RQ.SRS.Plugin', level=2, num='4.1'),
        Heading(name='Adding New Data Source', level=1, num='5'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView ', level=2, num='5.1'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.SaveAndTestButton', level=2, num='5.2'),
        Heading(name='Specifying Data Source Name', level=1, num='6'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.DataSourceName', level=2, num='6.1'),
        Heading(name='Using Default Data Source', level=1, num='7'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.DefaultDataSource', level=2, num='7.1'),
        Heading(name='Specifying HTTP Connection', level=1, num='8'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection', level=2, num='8.1'),
        Heading(name='Connecting to the Clickhouse Server Using Grafana Backend Server ', level=1, num='9'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.ServerAccess', level=2, num='9.1'),
        Heading(name='Connecting to the Clickhouse Server Without Using Grafana Backend Server ', level=1, num='10'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.HTTPConnection.BrowserAccess', level=2, num='10.1'),
        Heading(name='ClickHouse Authentification Setup', level=1, num='11'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.Auth', level=2, num='11.1'),
        Heading(name='ClickHouse Authentification Setup Using Username And Password', level=1, num='12'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.BasicAuth', level=2, num='12.1'),
        Heading(name='ClickHouse Authentification Setup Using TLS/SSL Auth Details', level=1, num='13'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.TLS/SSLAuthDetails', level=2, num='13.1'),
        Heading(name='ClickHouse Authentification Using Forward OAuth Identity', level=1, num='14'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.ForwardOAuthIdentity', level=2, num='14.1'),
        Heading(name='Sending Credentials Setup', level=1, num='15'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.WithCredentials', level=2, num='15.1'),
        Heading(name='ClickHouse Authentification With CA Certificate', level=1, num='16'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.Auth.WithCACert', level=2, num='16.1'),
        Heading(name='Specifying Custom HTTP Headers', level=1, num='17'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.CustomHTTPHeaders', level=2, num='17.1'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.DeletingCustomHTTPHeaders', level=2, num='17.2'),
        Heading(name='Connection To Managed Yandex.Cloud ClickHouse Database Setup', level=1, num='18'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.UseYandexCloudAuthorizationHeaders', level=2, num='18.1'),
        Heading(name='Specifying Use CORS Flag In Requests', level=1, num='19'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.AddCORSFlagToRequests', level=2, num='19.1'),
        Heading(name='Specifying Use POST Requests', level=1, num='20'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.UsePostRequests', level=2, num='20.1'),
        Heading(name='Specifying Default Database', level=1, num='21'),
        Heading(name='RQ.SRS.Plugin.DataSourceSetupView.DefaultDatabase', level=2, num='21.1'),
        Heading(name='Creating Dashboards', level=1, num='22'),
        Heading(name='RQ.SRS.Plugin.Dashboards', level=2, num='22.1'),
        Heading(name='Creating Panels', level=1, num='23'),
        Heading(name='RQ.SRS.Plugin.Panels', level=2, num='23.1'),
        Heading(name='RQ.SRS.Plugin.Panels.Repeated', level=2, num='23.2'),
        Heading(name='Multi-user Usage', level=1, num='24'),
        Heading(name='RQ.SRS.Plugin.MultiUserUsage', level=2, num='24.1'),
        Heading(name='RQ.SRS.Plugin.MultiUserUsage.SamePanel', level=2, num='24.2'),
        Heading(name='RQ.SRS.Plugin.MultiUserUsage.DifferentPanels', level=2, num='24.3'),
        Heading(name='RQ.SRS.Plugin.MultiUserUsage.SameDashboard', level=2, num='24.4'),
        Heading(name='RQ.SRS.Plugin.MultiUserUsage.DifferentDashboards', level=2, num='24.5'),
        Heading(name='Query Setup', level=1, num='25'),
        Heading(name='RQ.SRS.Plugin.QuerySetup', level=2, num='25.1'),
        Heading(name='Query Setup Interface', level=1, num='26'),
        Heading(name='RQ.SRS.Plugin.QuerySetupInterface', level=2, num='26.1'),
        Heading(name='Query Options', level=1, num='27'),
        Heading(name='RQ.SRS.Plugin.QueryOptions', level=2, num='27.1'),
        Heading(name='Raw SQL Editor', level=1, num='28'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface', level=2, num='28.1'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.SQLEditor', level=2, num='28.2'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.Extrapolation', level=2, num='28.3'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.SkipComments', level=2, num='28.4'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.Step', level=2, num='28.5'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.Round', level=2, num='28.6'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.Resolution', level=2, num='28.7'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.FormatAs', level=2, num='28.8'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.ShowHelp', level=2, num='28.9'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.ShowGeneratedSQL', level=2, num='28.10'),
        Heading(name='RQ.SRS.Plugin.RawSQLEditorInterface.ReformatQuery', level=2, num='28.11'),
        Heading(name='Auto-complete In Queries', level=1, num='29'),
        Heading(name='RQ.SRS.Plugin.AutoCompleteInQueries', level=2, num='29.1'),
        Heading(name='Time range selector', level=1, num='30'),
        Heading(name='RQ.SRS.Plugin.TimeRangeSelector', level=2, num='30.1'),
        Heading(name='RQ.SRS.Plugin.TimeRangeSelector.Zoom', level=2, num='30.2'),
        Heading(name='Сhanging The Size Of The Graph', level=1, num='31'),
        Heading(name='RQ.SRS.Plugin.FillActual', level=2, num='31.1'),
        Heading(name='Refresh Databoard', level=1, num='32'),
        Heading(name='RQ.SRS.Plugin.RefreshDataboard', level=2, num='32.1'),
        Heading(name='Inspecting Query', level=1, num='33'),
        Heading(name='RQ.SRS.Plugin.QueryInspector', level=2, num='33.1'),
        Heading(name='RQ.SRS.Plugin.QueryInspector.QueryTab', level=2, num='33.2'),
        Heading(name='Visualization', level=1, num='34'),
        Heading(name='RQ.SRS.Plugin.Visualization', level=2, num='34.1'),
        Heading(name='RQ.SRS.Plugin.Visualization.Legends', level=2, num='34.2'),
        Heading(name='Table View', level=2, num='34.3'),
        Heading(name='RQ.SRS.Plugin.Visualization.Table', level=3, num='34.3.1'),
        Heading(name='Visualization Types', level=2, num='34.4'),
        Heading(name='RQ.SRS.Plugin.Visualization.VisualizationTypes', level=3, num='34.4.1'),
        Heading(name='Macros', level=1, num='35'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros', level=2, num='35.1'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.Table', level=2, num='35.2'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.DateCol', level=2, num='35.3'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.DateTimeCol', level=2, num='35.4'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.From', level=2, num='35.5'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.To', level=2, num='35.6'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.Interval', level=2, num='35.7'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.TimeFilterByColumn', level=2, num='35.8'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.TimeSeries', level=2, num='35.9'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.NaturalTimeSeries', level=2, num='35.10'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.Unescape', level=2, num='35.11'),
        Heading(name='RQ.SRS.Plugin.QuerySettings.Macros.Adhoc', level=2, num='35.12'),
        Heading(name='Variables Setup', level=1, num='36'),
        Heading(name='RQ.SRS.Plugin.Variables', level=2, num='36.1'),
        Heading(name='Annotations Setup', level=1, num='37'),
        Heading(name='RQ.SRS.Plugin.Annotations', level=2, num='37.1'),
        Heading(name='Setuping Allerts', level=1, num='38'),
        Heading(name='RQ.SRS.Plugin.Allerts', level=2, num='38.1'),
        Heading(name='RQ.SRS.Plugin.Allerts.AllertSetupPage', level=2, num='38.2'),
        Heading(name='RQ.SRS.Plugin.Allerts.RuleType', level=2, num='38.3'),
        Heading(name='Functions', level=1, num='39'),
        Heading(name='RQ.SRS.Plugin.Functions', level=2, num='39.1'),
        Heading(name='RQ.SRS.Plugin.Functions.Rate', level=2, num='39.2'),
        Heading(name='RQ.SRS.Plugin.Functions.Columns', level=2, num='39.3'),
        Heading(name='RQ.SRS.Plugin.Functions.RateColumns', level=2, num='39.4'),
        Heading(name='RQ.SRS.Plugin.Functions.PerSecond', level=2, num='39.5'),
        Heading(name='RQ.SRS.Plugin.Functions.PerSecondColumns', level=2, num='39.6'),
        Heading(name='RQ.SRS.Plugin.Functions.Delta', level=2, num='39.7'),
        Heading(name='RQ.SRS.Plugin.Functions.DeltaColumns', level=2, num='39.8'),
        Heading(name='RQ.SRS.Plugin.Functions.Increase', level=2, num='39.9'),
        Heading(name='RQ.SRS.Plugin.Functions.IncreaseColumns', level=2, num='39.10'),
        Heading(name='Supported types', level=1, num='40'),
        Heading(name='RQ.SRS.Plugin.SupportedTypes', level=2, num='40.1'),
        Heading(name='Versions Compatibility', level=1, num='41'),
        Heading(name='RQ.SRS.Plugin.VersionCompatibility', level=2, num='41.1'),
        ),
    requirements=(
        RQ_SRS_Plugin_ManualPluginInstallation,
        RQ_SRS_Plugin_GrafanaCloudPluginInstallation,
        RQ_SRS_Plugin_DockerComposeEnvironment,
        RQ_SRS_Plugin,
        RQ_SRS_Plugin_DataSourceSetupView_,
        RQ_SRS_Plugin_DataSourceSetupView_SaveAndTestButton,
        RQ_SRS_Plugin_DataSourceSetupView_DataSourceName,
        RQ_SRS_Plugin_DataSourceSetupView_DefaultDataSource,
        RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection,
        RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_ServerAccess,
        RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_BrowserAccess,
        RQ_SRS_Plugin_DataSourceSetupView_Auth,
        RQ_SRS_Plugin_DataSourceSetupView_BasicAuth,
        RQ_SRS_Plugin_DataSourceSetupView_TLS_SSLAuthDetails,
        RQ_SRS_Plugin_DataSourceSetupView_ForwardOAuthIdentity,
        RQ_SRS_Plugin_DataSourceSetupView_WithCredentials,
        RQ_SRS_Plugin_DataSourceSetupView_Auth_WithCACert,
        RQ_SRS_Plugin_DataSourceSetupView_CustomHTTPHeaders,
        RQ_SRS_Plugin_DataSourceSetupView_DeletingCustomHTTPHeaders,
        RQ_SRS_Plugin_DataSourceSetupView_UseYandexCloudAuthorizationHeaders,
        RQ_SRS_Plugin_DataSourceSetupView_AddCORSFlagToRequests,
        RQ_SRS_Plugin_DataSourceSetupView_UsePostRequests,
        RQ_SRS_Plugin_DataSourceSetupView_DefaultDatabase,
        RQ_SRS_Plugin_Dashboards,
        RQ_SRS_Plugin_Panels,
        RQ_SRS_Plugin_Panels_Repeated,
        RQ_SRS_Plugin_MultiUserUsage,
        RQ_SRS_Plugin_MultiUserUsage_SamePanel,
        RQ_SRS_Plugin_MultiUserUsage_DifferentPanels,
        RQ_SRS_Plugin_MultiUserUsage_SameDashboard,
        RQ_SRS_Plugin_MultiUserUsage_DifferentDashboards,
        RQ_SRS_Plugin_QuerySetup,
        RQ_SRS_Plugin_QuerySetupInterface,
        RQ_SRS_Plugin_QueryOptions,
        RQ_SRS_Plugin_RawSQLEditorInterface,
        RQ_SRS_Plugin_RawSQLEditorInterface_SQLEditor,
        RQ_SRS_Plugin_RawSQLEditorInterface_Extrapolation,
        RQ_SRS_Plugin_RawSQLEditorInterface_SkipComments,
        RQ_SRS_Plugin_RawSQLEditorInterface_Step,
        RQ_SRS_Plugin_RawSQLEditorInterface_Round,
        RQ_SRS_Plugin_RawSQLEditorInterface_Resolution,
        RQ_SRS_Plugin_RawSQLEditorInterface_FormatAs,
        RQ_SRS_Plugin_RawSQLEditorInterface_ShowHelp,
        RQ_SRS_Plugin_RawSQLEditorInterface_ShowGeneratedSQL,
        RQ_SRS_Plugin_RawSQLEditorInterface_ReformatQuery,
        RQ_SRS_Plugin_AutoCompleteInQueries,
        RQ_SRS_Plugin_TimeRangeSelector,
        RQ_SRS_Plugin_TimeRangeSelector_Zoom,
        RQ_SRS_Plugin_FillActual,
        RQ_SRS_Plugin_RefreshDataboard,
        RQ_SRS_Plugin_QueryInspector,
        RQ_SRS_Plugin_QueryInspector_QueryTab,
        RQ_SRS_Plugin_Visualization,
        RQ_SRS_Plugin_Visualization_Table,
        RQ_SRS_Plugin_Visualization_VisualizationTypes,
        RQ_SRS_Plugin_QuerySettings_Macros,
        RQ_SRS_Plugin_QuerySettings_Macros_Table,
        RQ_SRS_Plugin_QuerySettings_Macros_DateCol,
        RQ_SRS_Plugin_QuerySettings_Macros_DateTimeCol,
        RQ_SRS_Plugin_QuerySettings_Macros_From,
        RQ_SRS_Plugin_QuerySettings_Macros_To,
        RQ_SRS_Plugin_QuerySettings_Macros_Interval,
        RQ_SRS_Plugin_QuerySettings_Macros_TimeFilterByColumn,
        RQ_SRS_Plugin_QuerySettings_Macros_TimeSeries,
        RQ_SRS_Plugin_QuerySettings_Macros_NaturalTimeSeries,
        RQ_SRS_Plugin_QuerySettings_Macros_Unescape,
        RQ_SRS_Plugin_QuerySettings_Macros_Adhoc,
        RQ_SRS_Plugin_Variables,
        RQ_SRS_Plugin_Annotations,
        RQ_SRS_Plugin_Allerts,
        RQ_SRS_Plugin_Allerts_AllertSetupPage,
        RQ_SRS_Plugin_Allerts_RuleType,
        RQ_SRS_Plugin_Functions,
        RQ_SRS_Plugin_Functions_Rate,
        RQ_SRS_Plugin_Functions_Columns,
        RQ_SRS_Plugin_Functions_RateColumns,
        RQ_SRS_Plugin_Functions_PerSecond,
        RQ_SRS_Plugin_Functions_PerSecondColumns,
        RQ_SRS_Plugin_Functions_Delta,
        RQ_SRS_Plugin_Functions_DeltaColumns,
        RQ_SRS_Plugin_Functions_Increase,
        RQ_SRS_Plugin_Functions_IncreaseColumns,
        RQ_SRS_Plugin_SupportedTypes,
        RQ_SRS_Plugin_VersionCompatibility,
        ),
    content='''
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
    * 5.1 [RQ.SRS.Plugin.DataSourceSetupView ](#rqsrsplugindatasourcesetupview-)
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
* 11 [ClickHouse Authentification Setup](#clickhouse-authentification-setup)
    * 11.1 [RQ.SRS.Plugin.DataSourceSetupView.Auth](#rqsrsplugindatasourcesetupviewauth)
* 12 [ClickHouse Authentification Setup Using Username And Password](#clickhouse-authentification-setup-using-username-and-password)
    * 12.1 [RQ.SRS.Plugin.DataSourceSetupView.BasicAuth](#rqsrsplugindatasourcesetupviewbasicauth)
* 13 [ClickHouse Authentification Setup Using TLS/SSL Auth Details](#clickhouse-authentification-setup-using-tlsssl-auth-details)
    * 13.1 [RQ.SRS.Plugin.DataSourceSetupView.TLS/SSLAuthDetails](#rqsrsplugindatasourcesetupviewtlssslauthdetails)
* 14 [ClickHouse Authentification Using Forward OAuth Identity](#clickhouse-authentification-using-forward-oauth-identity)
    * 14.1 [RQ.SRS.Plugin.DataSourceSetupView.ForwardOAuthIdentity](#rqsrsplugindatasourcesetupviewforwardoauthidentity)
* 15 [Sending Credentials Setup](#sending-credentials-setup)
    * 15.1 [RQ.SRS.Plugin.DataSourceSetupView.WithCredentials](#rqsrsplugindatasourcesetupviewwithcredentials)
* 16 [ClickHouse Authentification With CA Certificate](#clickhouse-authentification-with-ca-certificate)
    * 16.1 [RQ.SRS.Plugin.DataSourceSetupView.Auth.WithCACert](#rqsrsplugindatasourcesetupviewauthwithcacert)
* 17 [Specifying Custom HTTP Headers](#specifying-custom-http-headers)
    * 17.1 [RQ.SRS.Plugin.DataSourceSetupView.CustomHTTPHeaders](#rqsrsplugindatasourcesetupviewcustomhttpheaders)
    * 17.2 [RQ.SRS.Plugin.DataSourceSetupView.DeletingCustomHTTPHeaders](#rqsrsplugindatasourcesetupviewdeletingcustomhttpheaders)
* 18 [Connection To Managed Yandex.Cloud ClickHouse Database Setup](#connection-to-managed-yandexcloud-clickhouse-database-setup)
    * 18.1 [RQ.SRS.Plugin.DataSourceSetupView.UseYandexCloudAuthorizationHeaders](#rqsrsplugindatasourcesetupviewuseyandexcloudauthorizationheaders)
* 19 [Specifying Use CORS Flag In Requests](#specifying-use-cors-flag-in-requests)
    * 19.1 [RQ.SRS.Plugin.DataSourceSetupView.AddCORSFlagToRequests](#rqsrsplugindatasourcesetupviewaddcorsflagtorequests)
* 20 [Specifying Use POST Requests](#specifying-use-post-requests)
    * 20.1 [RQ.SRS.Plugin.DataSourceSetupView.UsePostRequests](#rqsrsplugindatasourcesetupviewusepostrequests)
* 21 [Specifying Default Database](#specifying-default-database)
    * 21.1 [RQ.SRS.Plugin.DataSourceSetupView.DefaultDatabase](#rqsrsplugindatasourcesetupviewdefaultdatabase)
* 22 [Creating Dashboards](#creating-dashboards)
    * 22.1 [RQ.SRS.Plugin.Dashboards](#rqsrsplugindashboards)
* 23 [Creating Panels](#creating-panels)
    * 23.1 [RQ.SRS.Plugin.Panels](#rqsrspluginpanels)
    * 23.2 [RQ.SRS.Plugin.Panels.Repeated](#rqsrspluginpanelsrepeated)
* 24 [Multi-user Usage](#multi-user-usage)
    * 24.1 [RQ.SRS.Plugin.MultiUserUsage](#rqsrspluginmultiuserusage)
* 25 [Query Setup](#query-setup)
    * 25.1 [RQ.SRS.Plugin.QuerySetup](#rqsrspluginquerysetup)
* 26 [Query Setup Interface](#query-setup-interface)
    * 26.1 [RQ.SRS.Plugin.QuerySetupInterface](#rqsrspluginquerysetupinterface)
* 27 [Query Options](#query-options)
    * 27.1 [RQ.SRS.Plugin.QueryOptions](#rqsrspluginqueryoptions)
* 28 [Raw SQL Editor](#raw-sql-editor)
    * 28.1 [RQ.SRS.Plugin.RawSQLEditorInterface](#rqsrspluginrawsqleditorinterface)
    * 28.2 [RQ.SRS.Plugin.RawSQLEditorInterface.SQLEditor](#rqsrspluginrawsqleditorinterfacesqleditor)
    * 28.3 [RQ.SRS.Plugin.RawSQLEditorInterface.Extrapolation](#rqsrspluginrawsqleditorinterfaceextrapolation)
    * 28.4 [RQ.SRS.Plugin.RawSQLEditorInterface.SkipComments](#rqsrspluginrawsqleditorinterfaceskipcomments)
    * 28.5 [RQ.SRS.Plugin.RawSQLEditorInterface.Step](#rqsrspluginrawsqleditorinterfacestep)
    * 28.6 [RQ.SRS.Plugin.RawSQLEditorInterface.Round](#rqsrspluginrawsqleditorinterfaceround)
    * 28.7 [RQ.SRS.Plugin.RawSQLEditorInterface.Resolution](#rqsrspluginrawsqleditorinterfaceresolution)
    * 28.8 [RQ.SRS.Plugin.RawSQLEditorInterface.FormatAs](#rqsrspluginrawsqleditorinterfaceformatas)
    * 28.9 [RQ.SRS.Plugin.RawSQLEditorInterface.ShowHelp](#rqsrspluginrawsqleditorinterfaceshowhelp)
    * 28.10 [RQ.SRS.Plugin.RawSQLEditorInterface.ShowGeneratedSQL](#rqsrspluginrawsqleditorinterfaceshowgeneratedsql)
    * 28.11 [RQ.SRS.Plugin.RawSQLEditorInterface.ReformatQuery](#rqsrspluginrawsqleditorinterfacereformatquery)
* 29 [Auto-complete In Queries](#auto-complete-in-queries)
    * 29.1 [RQ.SRS.Plugin.AutoCompleteInQueries](#rqsrspluginautocompleteinqueries)
* 30 [Time range selector](#time-range-selector)
    * 30.1 [RQ.SRS.Plugin.TimeRangeSelector](#rqsrsplugintimerangeselector)
    * 30.2 [RQ.SRS.Plugin.TimeRangeSelector.Zoom](#rqsrsplugintimerangeselectorzoom)
* 31 [Сhanging The Size Of The Graph](#hanging-the-size-of-the-graph)
    * 31.1 [RQ.SRS.Plugin.FillActual](#rqsrspluginfillactual)
* 32 [Refresh Databoard](#refresh-databoard)
    * 32.1 [RQ.SRS.Plugin.RefreshDataboard](#rqsrspluginrefreshdataboard)
* 33 [Inspecting Query](#inspecting-query)
    * 33.1 [RQ.SRS.Plugin.QueryInspector](#rqsrspluginqueryinspector)
    * 33.2 [RQ.SRS.Plugin.QueryInspector.QueryTab](#rqsrspluginqueryinspectorquerytab)
* 34 [Visualization](#visualization)
    * 34.1 [RQ.SRS.Plugin.Visualization](#rqsrspluginvisualization)
    * 34.2 [RQ.SRS.Plugin.Visualization.Legends](#rqsrspluginvisualizationlegends)
    * 34.3 [Table View](#table-view)
        * 34.3.1 [RQ.SRS.Plugin.Visualization.Table](#rqsrspluginvisualizationtable)
    * 34.4 [Visualization Types](#visualization-types)
        * 34.4.1 [RQ.SRS.Plugin.Visualization.VisualizationTypes](#rqsrspluginvisualizationvisualizationtypes)
* 35 [Macros](#macros)
    * 35.1 [RQ.SRS.Plugin.QuerySettings.Macros](#rqsrspluginquerysettingsmacros)
    * 35.2 [RQ.SRS.Plugin.QuerySettings.Macros.Table](#rqsrspluginquerysettingsmacrostable)
    * 35.3 [RQ.SRS.Plugin.QuerySettings.Macros.DateCol](#rqsrspluginquerysettingsmacrosdatecol)
    * 35.4 [RQ.SRS.Plugin.QuerySettings.Macros.DateTimeCol](#rqsrspluginquerysettingsmacrosdatetimecol)
    * 35.5 [RQ.SRS.Plugin.QuerySettings.Macros.From](#rqsrspluginquerysettingsmacrosfrom)
    * 35.6 [RQ.SRS.Plugin.QuerySettings.Macros.To](#rqsrspluginquerysettingsmacrosto)
    * 35.7 [RQ.SRS.Plugin.QuerySettings.Macros.Interval](#rqsrspluginquerysettingsmacrosinterval)
    * 35.8 [RQ.SRS.Plugin.QuerySettings.Macros.TimeFilterByColumn](#rqsrspluginquerysettingsmacrostimefilterbycolumn)
    * 35.9 [RQ.SRS.Plugin.QuerySettings.Macros.TimeSeries](#rqsrspluginquerysettingsmacrostimeseries)
    * 35.10 [RQ.SRS.Plugin.QuerySettings.Macros.NaturalTimeSeries](#rqsrspluginquerysettingsmacrosnaturaltimeseries)
    * 35.11 [RQ.SRS.Plugin.QuerySettings.Macros.Unescape](#rqsrspluginquerysettingsmacrosunescape)
    * 35.12 [RQ.SRS.Plugin.QuerySettings.Macros.Adhoc](#rqsrspluginquerysettingsmacrosadhoc)
* 36 [Variables Setup](#variables-setup)
    * 36.1 [RQ.SRS.Plugin.Variables](#rqsrspluginvariables)
* 37 [Annotations Setup](#annotations-setup)
    * 37.1 [RQ.SRS.Plugin.Annotations](#rqsrspluginannotations)
* 38 [Setuping Allerts](#setuping-allerts)
    * 38.1 [RQ.SRS.Plugin.Allerts](#rqsrspluginallerts)
    * 38.2 [RQ.SRS.Plugin.Allerts.AllertSetupPage](#rqsrspluginallertsallertsetuppage)
    * 38.3 [RQ.SRS.Plugin.Allerts.RuleType](#rqsrspluginallertsruletype)
* 39 [Functions](#functions)
    * 39.1 [RQ.SRS.Plugin.Functions](#rqsrspluginfunctions)
    * 39.2 [RQ.SRS.Plugin.Functions.Rate](#rqsrspluginfunctionsrate)
    * 39.3 [RQ.SRS.Plugin.Functions.Columns](#rqsrspluginfunctionscolumns)
    * 39.4 [RQ.SRS.Plugin.Functions.RateColumns](#rqsrspluginfunctionsratecolumns)
    * 39.5 [RQ.SRS.Plugin.Functions.PerSecond](#rqsrspluginfunctionspersecond)
    * 39.6 [RQ.SRS.Plugin.Functions.PerSecondColumns](#rqsrspluginfunctionspersecondcolumns)
    * 39.7 [RQ.SRS.Plugin.Functions.Delta](#rqsrspluginfunctionsdelta)
    * 39.8 [RQ.SRS.Plugin.Functions.DeltaColumns](#rqsrspluginfunctionsdeltacolumns)
    * 39.9 [RQ.SRS.Plugin.Functions.Increase](#rqsrspluginfunctionsincrease)
    * 39.10 [RQ.SRS.Plugin.Functions.IncreaseColumns](#rqsrspluginfunctionsincreasecolumns)
* 40 [Supported types](#supported-types)
    * 40.1 [RQ.SRS.Plugin.SupportedTypes](#rqsrspluginsupportedtypes)
* 41 [Versions Compatibility](#versions-compatibility)
    * 41.1 [RQ.SRS.Plugin.VersionCompatibility](#rqsrspluginversioncompatibility)


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
docker-compose run --rm frontend_builder
docker-compose run --rm backend_builder
echo 'export GRAFANA_ACCESS_POLICY_TOKEN="{grafana_token}"' > .release_env
docker-compose run --rm plugin_signer
docker-compose up -d grafana
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

The [Plugin] SHALL support connecting to the [ClickHouse] server by selecting the `Browser` option` in the `Access` dropdown menu
in the data source setup view. In this case all requests SHALL be made from the browser directly to the data source.

## ClickHouse Authentification Setup

### RQ.SRS.Plugin.DataSourceSetupView.Auth
version: 1.0

The [Plugin] SHALL support specifying authentication details by specifying the following toggles:

* `Basic auth`
* `TLS Client Auth`
* `Skip TLS Verify`
* `Forward OAuth Identity`
* `With Credentials`
* `With CA Cert`

## ClickHouse Authentification Setup Using Username And Password

### RQ.SRS.Plugin.DataSourceSetupView.BasicAuth
version: 1.0

The [Plugin] SHALL support specifying username and password for the [ClickHouse] server by turning on the `Basic auth` toggle
and specifying username and password in the `User` and `Password` text fields, respectively. The `Password` text field SHALL 
be able to be empty. The [Plugin] SHALL add the `Basic Auth Details` section to the data source setup view only if the `Basic auth`
toggle is on.

## ClickHouse Authentification Setup Using TLS/SSL Auth Details

### RQ.SRS.Plugin.DataSourceSetupView.TLS/SSLAuthDetails
version: 1.0

The [Plugin] SHALL support specifying server name, client certificate, and client key for the [ClickHouse] server by turning on 
the `TLS Client Auth` toggle and specifying these options in the `ServerName`, `Client Cert`, and `Client Key` text fields, respectively. 
The [Plugin] SHALL add `ServerName`, `Client Cert`, and `Client Key` text fields to the data source setup view only if the 
`TLS Client Auth` toggle is on.

## ClickHouse Authentification Using Forward OAuth Identity

### RQ.SRS.Plugin.DataSourceSetupView.ForwardOAuthIdentity
version: 1.0

The [Plugin] SHALL support Forward OAuth Identity by turning on the `Forward OAuth Identity` toggle.
The [Plugin] SHALL forward the user's upstream OAuth identity to the data source if this toggle is on.

## Sending Credentials Setup

### RQ.SRS.Plugin.DataSourceSetupView.WithCredentials
version: 1.0

The [Plugin] SHALL support sending credentials such as cookies or authentication headers with cross-site 
requests by turning on the `With Credentials` toggle.

## ClickHouse Authentification With CA Certificate

### RQ.SRS.Plugin.DataSourceSetupView.Auth.WithCACert
version: 1.0

The [Plugin] SHALL support specifying the CA certificate that will be used to access the [ClickHouse] server 
by turning on the `With CA Cert` toggle and specifying the `CA Cert` text field. The [Plugin] SHALL add the 
`CA Cert` text field to the data source setup view only if the `TLS Client Auth` toggle is on.

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

The [Plugin] SHALL support the following visualization types for data:

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

### RQ.SRS.Plugin.QuerySettings.Macros.DateCol
version: 1.0

The [Plugin] SHALL support `$dateCol` macro in SQL edior. `$dateCol` macro SHALL be replaced with selected table name from query setup interface.

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
selected `Time Range` for a column passed as $column argument.

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
or "1" if no ad-hoc filters exist.

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

## Setuping Allerts

### RQ.SRS.Plugin.Allerts
version: 1.0

The [Plugin] SHALL support [Grafana] allerts setup for panels by clicking `New alert rule` button in `Alert rule` tab
in edit panel view.

### RQ.SRS.Plugin.Allerts.AllertSetupPage
version: 1.0

The [Plugin] SHALL allow defining query and alert condition by using query setup interface and raw SQL editor in allert setup page.

### RQ.SRS.Plugin.Allerts.RuleType
version: 1.0

The [Plugin] SHALL support `Grafana-managed` and `Data source-managed` rule types by choosing rule type in allert setup page.

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

These functions are templates of SQL queries. The user SHALL be allowed to check queries in the expanded format in the raw SQL editor interface.
Only one function per query is allowed.

https://github.com/Altinity/clickhouse-grafana?tab=readme-ov-file#functions

### RQ.SRS.Plugin.Functions.Rate
version: 1.0

The [Plugin] SHALL support the `$rate` function in SQL editor. This function SHALL convert query results as "change rate per interval".

### RQ.SRS.Plugin.Functions.Columns
version: 1.0

The [Plugin] SHALL support the `$columns(key, value)` function in SQL editor. This function SHALL query values as array of [key, value], 
where key will be used as label.

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

## Supported types

### RQ.SRS.Plugin.SupportedTypes
version: 1.0

The [Plugin] SHALL support scalar data types. The following data types SHALL be supported:


| Data Type                                                                           | Supported in Grafana |
| ----------------------------------------------------------------------------------- |:--------------------:|
| UInt8, UInt16, UInt32, UInt64, UInt128, UInt256                                     |                      |
| Int8, Int16, Int32, Int64, Int128, Int256                                           |                      |
| Float32, Float64                                                                    |                      |
| Decimal(P), Decimal(P, S), Decimal32(S), Decimal64(S), Decimal128(S), Decimal256(S) |                      |
| Bool                                                                                |                      |
| String                                                                              |                      |
| FixedString(N)                                                                      |                      |
| Date, Date32, DateTime, DateTime64                                                  |                      |
| JSON                                                                                |                      |
| UUID                                                                                |                      |
| Enum                                                                                |                      |
| LowCardinality                                                                      |                      |
| Array                                                                               |                      |
| Map                                                                                 |                      |
| SimpleAggregateFunction                                                             |                      |
| AggregateFunction                                                                   |                      |
| Nested                                                                              |                      |
| Tuple                                                                               |                      |
| Nullable                                                                            |                      |
| IPv4                                                                                |                      |
| IPv6                                                                                |                      |
| Point                                                                               |                      |
| Ring                                                                                |                      |
| Polygon                                                                             |                      |
| MultiPolygon                                                                        |                      |
| Expression                                                                          |                      |
| Set                                                                                 |                      |
| Nothing                                                                             |                      |
| Interval                                                                            |                      |


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
'''
)
