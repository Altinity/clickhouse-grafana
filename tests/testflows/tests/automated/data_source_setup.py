from testflows.core import *
from steps.delay import delay
from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
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
                assert datasources_altinity_edit.check_alert_success() is True, error()


@TestOutline
def panel_check(
        self,
        datasource_name,
        url,
        successful_connection=True,
        access_type=None,
        basic_auth=False,
        username="demo",
        password="demo",
        tls_client_auth=False,
        server_name=None,
        client_cert=None,
        client_key=None,
        with_ca_cert=False,
        ca_cert=None,
        dashboard_name="dashboard_panel",
        use_post_method=False,
        query="SELECT now() - Interval number minute, number from numbers(60)",#todo
        check_visualization=True,
        check_visualization_alert=False, #todo
):
    """Check that Plugin supports creating panels.""" # todo

    with Given("I create new altinity datasource"): # check altinity or Altinity
        actions.create_new_altinity_datasource(
            use_post_method=use_post_method,
            datasource_name=datasource_name,
            access_type=access_type,
            url=url,
            successful_connection=successful_connection, #tododescribe parametrs
            basic_auth=basic_auth,
            username=username,
            password=password,
            with_ca_cert=with_ca_cert,
            ca_cert=ca_cert,
            tls_client_auth=tls_client_auth,
            server_name=server_name,
            client_cert=client_cert,
            client_key=client_key,
        )

    if not successful_connection:
        return

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name=dashboard_name)

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with When("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name=datasource_name)

    with delay():
        with When("I open SQL editor"):
            panel.go_to_sql_editor()

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query) #todo

    with delay():
        with Then("I click on the visualization to see results"):
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
                assert panel.check_panel_error_exists() is True, error()#todo
        else:
            with Then("I check there is no alert"):
                assert panel.check_panel_error_exists() is False, error()


@TestScenario
def panel_check_basic_auth_success(self):
    """Check that plugin supports datasources with basic auth."""#todo
    panel_check(
        datasource_name="test_basic_auth_success",
        url="http://clickhouse:8123",
        basic_auth=True,
        username="demo",
        password="demo"
    )


@TestScenario
def panel_check_basic_auth_not_success(self):
    """Check that plugin supports datasources with basic auth."""#todo
    panel_check(
        datasource_name="test_basic_auth_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        basic_auth=True,
        username="demo",
        password="incorrect_password",
    )


@TestScenario
def panel_check_use_post_method_success(self):
    """Check that plugin supports datasources with basic auth."""#todo
    panel_check(
        datasource_name="test_post_method_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        use_post_method=True,
        query="CREATE TABLE test_post_method_success(x Int64) ENGINE=Log",
        check_visualization=False,
    )


@TestScenario
def panel_check_use_post_method_not_success(self):
    """Check that plugin supports datasources with basic auth."""#todo
    panel_check(
        datasource_name="test_post_method_not_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        use_post_method=False,
        query="CREATE TABLE test_post_method_not_success(x Int64) ENGINE=Log",
        check_visualization=False,
        check_visualization_unsuccessful_alert=True
    )


@TestScenario
def panel_check_with_ca_cert_success(self):
    """Check that plugin supports datasources with ca cert."""#todo
    panel_check(
        datasource_name="test_with_ca_cert_success",
        url="http://clickhouse:8123",
        with_ca_cert=True,
        ca_cert=None
    )


@TestScenario
def panel_check_with_ca_cert_not_success(self):
    """Check that plugin supports datasources with ca cert.""" #todo
    panel_check(
        datasource_name="test_with_ca_cert_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        with_ca_cert=True,
        ca_cert="incorrect_ca_cert"
    )


@TestScenario
def panel_check_with_tls_client_auth_success(self):
    """Check that plugin supports datasources with ca cert.""" #todo
    panel_check(
        datasource_name="test_with_tls_client_auth_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key=None,
    )


@TestScenario
def panel_check_with_tls_client_auth_not_success(self):
    """Check that plugin supports datasources with ca cert.""" #todo
    panel_check(
        datasource_name="test_with_tls_client_auth_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key="incorrect_client_key",
    )


@TestFeature
@Requirements(RQ_SRS_Plugin_DataSourceSetupView("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_SaveAndTestButton("1.0"))
@Name("data source setup")
def feature(self):
    """Check that Plugin supports Grafana dashboards."""

    for scenario in loads(current_module(), Scenario):
        scenario()
