from testflows.core import *
from steps.delay import delay
from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.panel.sql_editor.view as sql_editor
import steps.connections.datasources.view as datasources
import steps.connections.datasources.altinity_edit.view as datasources_altinity_edit

from requirements.requirements import *


@TestScenario
def check_existing_data_sources(self):
    """Check that existing data sources are connected."""

    with Given("I open connections data sources view"):
        datasources.open_connections_datasources_endpoint()

    with When("I get list of data sources"):
        data_sources_names = [
            "clickhouse",
            "clickhouse-get",
            "clickhouse-x-auth",
            "gh-api",
            "trickster"
        ]

    with When("I check data sources"):
        for datasource_name in data_sources_names:
            with delay():
                with Given("I open connections data sources view"):
                    datasources.open_connections_datasources_endpoint()

            with When(f"I open data source setup for data source {datasource_name}"):
                datasources.click_datasource_in_datasources_view(datasource_name=datasource_name)

            with delay():
                with When("I click save and test button"):
                    datasources_altinity_edit.click_save_and_test_button()

            with Then("I check save and test button works correctly"):
                with delay():
                    assert datasources_altinity_edit.check_alert_success() is True, error()


@TestOutline
def check_creating_datasource_and_panel(
        self,
        datasource_name,
        url="http://clickhouse:8123",
        default=False,
        successful_connection=True,
        access_type=None,
        basic_auth=False,
        username="demo",
        password="demo",
        use_yandex_cloud_authorization=False,
        yandex_cloud_username="demo",
        yandex_cloud_password="demo",
        tls_client_auth=False,
        server_name=None,
        client_cert=None,
        client_key=None,
        with_ca_cert=False,
        ca_cert=None,
        skip_tls_verify=False,
        dashboard_name="dashboard_panel",
        use_post_method=False,
        add_cors_flag=False,
        url_parts=None,
        use_compression=False,
        query="SELECT now() - Interval number minute, number from numbers(60)",
        check_visualization=True,
        check_visualization_alert=False,
        check_url_in_query_inspector=False,
        check_datasource_is_default=False,
        default_database=None,
):
    """Check that Plugin supports creating altinity datasources and panels using altinity datasources.

    :param datasource_name: name of the datasource that we are creating
    :param url: url of the datasource that we are creating
    :param successful_connection: check that save and test button in connections settings returns green or red alert, default: True
    :param access_type: access type in connections settings from ['Server(default)', 'Browser'], default: None
    :param basic_auth: use basic auth, default: False
    :param username: username for basic auth, default: 'demo'
    :param password: password for basic auth, default: 'demo'
    :param use_yandex_cloud_authorization: use Yandex.Cloud authorization, default: False
    :param yandex_cloud_username: username for Yandex.Cloud authorization, default 'demo'
    :param yandex_cloud_password: password for Yandex.Cloud authorization, default 'demo'
    :param tls_client_auth: use tls client auth, default: False
    :param server_name: server name for tls client auth, default: None
    :param client_cert: Client Cert for tls client auth, default: None
    :param client_key: Client Key for tls client auth, default: None
    :param with_ca_cert: use Ca Cert, default: False
    :param ca_cert: Ca Cert, default: None
    :param dashboard_name: name of the dashboard that we are creating
    :param use_post_method: use post method in http requests, default: False
    :param query: query for panel, that we use to check datasource, default: "SELECT now() - Interval number minute, number from numbers(60)"
    :param check_visualization: check that visualization is valid, default: True
    :param check_visualization_alert: check that visualization returns or not returns error, default: False
    """

    with Given("I create new altinity datasource"):
        actions.create_new_altinity_datasource(
            use_post_method=use_post_method,
            datasource_name=datasource_name,
            access_type=access_type,
            url=url,
            default=default,
            successful_connection=successful_connection,
            basic_auth=basic_auth,
            username=username,
            password=password,
            use_yandex_cloud_authorization=use_yandex_cloud_authorization,
            yandex_cloud_username=yandex_cloud_username,
            yandex_cloud_password=yandex_cloud_password,
            with_ca_cert=with_ca_cert,
            ca_cert=ca_cert,
            skip_tls_verify=skip_tls_verify,
            tls_client_auth=tls_client_auth,
            server_name=server_name,
            client_cert=client_cert,
            client_key=client_key,
            add_cors_flag=add_cors_flag,
            use_compression=use_compression,
            default_database=default_database
        )

    if not successful_connection:
        return

    if check_datasource_is_default:
        with Then("I check datasource is default"):
            with delay():
                assert datasources.check_datasource_is_default(datasource_name=datasource_name) is True

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name=dashboard_name)

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with When("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name=datasource_name)

    with When("I open SQL editor"):
        with delay():
            panel.go_to_sql_editor()

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    if check_visualization:
        with Then("I check visualization is valid"):
            with By("taking screenshot"):
                panel.take_screenshot_for_visualization(screenshot_name="panel_check")

            with By("checking screenshot"):
                assert actions.check_screenshot(screenshot_name="panel_check") is True, error()

    with delay():
        if check_visualization_alert:
            with Then("I check alert exists"):
                assert panel.check_panel_error_exists() is True, error()
        else:
            with Then("I check there is no alert"):
                assert panel.check_panel_error_exists() is False, error()

    if check_url_in_query_inspector:
        with Then("I check url in query inspector"):
            panel.check_query_inspector_request(url_parts=url_parts)


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_BasicAuth("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_success_basic_auth(self):
    """Check that plugin supports datasources with `Basic auth` toggle turned on and correct username and password."""
    check_creating_datasource_and_panel(
        datasource_name="test_basic_auth_success",
        url="http://clickhouse:8123",
        basic_auth=True,
        username="demo",
        password="demo"
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_BasicAuth("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_fail_basic_auth(self):
    """Check that plugin supports datasources with `Basic auth` toggle turned on and correct username and incorrect password."""
    check_creating_datasource_and_panel(
        datasource_name="test_basic_auth_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        basic_auth=True,
        username="demo",
        password="incorrect_password",
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_UsePostRequests("1.0"),)
def check_success_use_post_method(self):
    """Check that altinity datasources with `Use POST method` toggle turned on use post http requests."""
    check_creating_datasource_and_panel(
        datasource_name="test_post_method_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        use_post_method=True,
        query="INSERT INTO default.test_alerts select 'test', now() - number, now() - number, number from numbers(10)",
        check_visualization=False,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_UsePostRequests("1.0"))
def check_fail_use_post_method(self):
    """Check that altinity datasources with `Use POST method` toggle turned off use get http requests."""
    check_creating_datasource_and_panel(
        datasource_name="test_post_method_not_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        use_post_method=False,
        query="INSERT INTO default.test_alerts select 'test', now() - number, now() - number, number from numbers(10)",
        check_visualization=False,
        check_visualization_alert=True
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_Auth_WithCACert("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_success_ca_cert(self):
    """Check that plugin supports datasources `With CA Cert` toggle turned on and correct CA Cert."""
    check_creating_datasource_and_panel(
        datasource_name="test_with_ca_cert_success",
        url="http://clickhouse:8123",
        with_ca_cert=True,
        ca_cert=None
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_Auth_WithCACert("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_fail_ca_cert(self):
    """Check that plugin supports datasources `With CA Cert` toggle turned on and correct CA Cert."""
    check_creating_datasource_and_panel(
        datasource_name="test_with_ca_cert_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        with_ca_cert=True,
        ca_cert="incorrect_ca_cert"
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_TLS_SSLAuthDetails("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_success_tls_client_auth(self):
    """Check that plugin supports datasources with `TLS Client Auth` toggle turned on and correct `TLS/SSL Auth Details`."""
    check_creating_datasource_and_panel(
        datasource_name="test_with_tls_client_auth_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key=None,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_TLS_SSLAuthDetails("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_fail_tls_client_auth(self):
    """Check that plugin supports datasources with `TLS Client Auth` toggle turned on and incorrect `TLS/SSL Auth Details`."""
    check_creating_datasource_and_panel(
        datasource_name="test_with_tls_client_auth_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key="incorrect_client_key",
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_UseYandexCloudAuthorizationHeaders("1.0"))
def check_success_use_yandex_cloud(self):
    """Check that plugin supports datasources with Yandex.Cloud authorization and correct username and password."""
    check_creating_datasource_and_panel(
        datasource_name="test_use_yandex_cloud_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        use_yandex_cloud_authorization=True,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_UseYandexCloudAuthorizationHeaders("1.0"))
def check_fail_use_yandex_cloud(self):
    """Check that plugin supports datasources with Yandex.Cloud authorization and correct username and incorrect password."""
    check_creating_datasource_and_panel(
        datasource_name="test_use_yandex_cloud_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        use_yandex_cloud_authorization=True,
        yandex_cloud_password="incorrect_password"
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_AddCORSFlagToRequests("1.0"))
def check_success_cors_headers(self):
    """Check that plugin supports datasources with add CORS flag toggle turned on."""
    check_creating_datasource_and_panel(
        datasource_name="test_cors_flag_success",
        url="http://clickhouse:8123",
        add_cors_flag=True,
        check_url_in_query_inspector=True,
        url_parts=["add_http_cors_header=1"]
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_HTTPCompression("1.0"))
def check_success_use_compression(self):
    """Check that plugin supports datasources with use compression toggle turned on."""
    check_creating_datasource_and_panel(
        datasource_name="test_use_compression_success",
        url="http://clickhouse:8123",
        use_compression=True,
        check_url_in_query_inspector=True,
        url_parts=["enable_http_compression"]
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_DefaultDataSource("1.0"))
def check_success_default_datasource(self):
    """Check that plugin supports datasources with use compression toggle turned on."""
    check_creating_datasource_and_panel(
        datasource_name="test_success_default_datasource",
        url="http://clickhouse:8123",
        default=True,
        check_datasource_is_default=True
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_DefaultDatabase("1.0"))
def check_success_default_database(self):
    """Check that plugin supports datasources with specified default database and
    query that contains table from this database."""
    check_creating_datasource_and_panel(
        datasource_name="test_success_default_database",
        url="http://clickhouse:8123",
        default_database="system",
        query="SELECT * FROM backups",
        check_visualization=False,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_DefaultDatabase("1.0"))
def check_fail_default_database(self):
    """Check that plugin not supports datasources without specified default database and
    query that contains table from this database."""
    check_creating_datasource_and_panel(
        datasource_name="test_fail_default_database",
        url="http://clickhouse:8123",
        query="SELECT * FROM backups",
        check_visualization_alert=True,
        check_visualization=False,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_Auth_SkipTLSVerify("1.0"))
def check_success_skip_tls_verify(self):
    """Check that plugin supports datasources with Skip TLS Verify toggle turned on
    with secured port and without CA cert configured."""
    check_creating_datasource_and_panel(
        datasource_name="test_success_skip_tls_verify",
        url="https://clickhouse:8443",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key=None,
        skip_tls_verify=True,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_Auth_SkipTLSVerify("1.0"))
def check_fail_skip_tls_verify(self):
    """Check that plugin not supports datasources with Skip TLS Verify toggle turned off
    with secured port and without CA cert configured."""
    check_creating_datasource_and_panel(
        datasource_name="test_fail_skip_tls_verify",
        url="https://clickhouse:8443",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key=None,
        skip_tls_verify=False,
        successful_connection=False,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_BrowserAccess("1.0"))
def check_success_browser_access(self):
    """Check that plugin not supports datasources with browser access."""
    check_creating_datasource_and_panel(
        datasource_name="test_success_browser_access",
        access_type='Browser',
        check_url_in_query_inspector=True,
        url_parts=["clickhouse:8123"]
    )


@TestOutline
def check_default_values(
        self,
        default_column_timestamp_type="DateTime",
        default_datetime_field="EventTime",
        default_timestamp_field="level",
        default_datetime64_field="d64",
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'EventTime'",
):
    """Check that plugin supports setting up default values."""
    with Given("I create new altinity datasource"):
        actions.create_new_altinity_datasource(
            datasource_name="default_values",
            url="http://clickhouse:8123",
            use_default_values=True,
            default_column_timestamp_type=default_column_timestamp_type,
            default_datetime_field=default_datetime_field,
            default_timestamp_field=default_timestamp_field,
            default_datetime64_field=default_datetime64_field,
            default_date_field=default_date_field,
        )

    with And("I create new dashboard"):
        actions.create_dashboard(dashboard_name="default_values")

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with And("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name="default_values")

    with And("I open SQL editor"):
        with delay():
            panel.go_to_sql_editor()

    with And("I enter query to SQL editor `SELECT '$dateCol', '$dateTimeCol'`"):
        panel.enter_sql_editor_input(query="SELECT '$dateCol', '$dateTimeCol'")

    with Then("I click Show generated SQL button",
              description="opened to check reformatted queries in scenarios"):
        with delay():
            sql_editor.click_show_generated_sql_button(query_name='A')

    with And("I check reformatted query"):
        assert check_reformatted_query in sql_editor.get_reformatted_query(query_name='A'), error()


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_datetime(self):
    """Check that plugin supports setting up default values with DateTime timestamp type."""

    check_default_values(
        default_column_timestamp_type="DateTime",
        default_datetime_field="EventTime",
        default_timestamp_field=None,
        default_datetime64_field=None,
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'EventTime'",
    )


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_timestamp(self):
    """Check that plugin supports setting up default values with timestamp default timestamp type."""

    check_default_values(
        default_column_timestamp_type="timestamp",
        default_datetime_field=None,
        default_timestamp_field="level",
        default_datetime64_field=None,
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'level'",
    )


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_datetime64(self):
    """Check that plugin supports setting up default values with DateTime64 timestamp type."""

    check_default_values(
        default_column_timestamp_type="DateTime64",
        default_datetime_field=None,
        default_timestamp_field=None,
        default_datetime64_field="d64",
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'd64'",
    )


@TestOutline
def check_default_context_window(self, default_context_window):
    """Check default context window."""

    with Given("I create new altinity datasource"):
        actions.create_new_altinity_datasource(
            datasource_name="default_values_context_window",
            default=True,
            url="http://clickhouse:8123",
            use_default_values=True,
            default_context_window=default_context_window
        )

    with And("I create new dashboard"):
        actions.create_dashboard(dashboard_name="default_values_context_window")

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with And("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name="default_values_context_window")

    with And("I open SQL editor"):
        with delay():
            panel.go_to_sql_editor()

    with And("I change format as dropdown"):
        with delay():
            sql_editor.enter_format_as(format_as="Logs", query_name='A')

    with Then("I check Context window is the same as in default datasource values"):
        with delay():
            assert sql_editor.get_context_window(query_name="A") == default_context_window, error()


@TestScenario
def check_default_context_window_10(self):
    """Check default context window for 10 entries."""

    check_default_context_window(default_context_window="10 entries")


@TestScenario
def check_default_context_window_20(self):
    """Check default context window for 20 entries."""

    check_default_context_window(default_context_window="20 entries")

@TestScenario
def check_default_context_window_50(self):
    """Check default context window for 50 entries."""

    check_default_context_window(default_context_window="50 entries")

@TestScenario
def check_default_context_window_100(self):
    """Check default context window for 100 entries."""

    check_default_context_window(default_context_window="100 entries")



@TestFeature
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DataSourceName("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_SaveAndTestButton("1.0"),
    RQ_SRS_Plugin_Dashboards("1.0"),
    RQ_SRS_Plugin_Panels("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_ServerAccess("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection("1.0"),
)
@Name("data source setup")
def feature(self):
    """Check that Plugin supports Grafana dashboards."""

    for scenario in loads(current_module(), Scenario):
        scenario()
