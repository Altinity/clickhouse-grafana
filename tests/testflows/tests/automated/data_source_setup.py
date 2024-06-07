from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error


from steps.actions import *
from steps.dashboard.view import *
from requirements.requirements import *
from steps.connections.datasources.view import *
from steps.connections.datasources.new.view import *
from steps.connections.datasources.altinity_edit.view import *

from steps.panel.view import *


# @TestScenario
# def check_existing_data_sources(self):
#     """Check that existing data sources are connected."""
#
#     with Given("I open connections data sources view"):
#         open_connections_datasources_endpoint()
#
#     with When("I get list of data sources"):
#         data_sources_names = [
#             "clickhouse",
#             "clickhouse-get",
#             "clickhouse-x-auth",
#             "gh-api",
#             "trickster"
#         ]
#
#     with When("I check data sources"):
#         for datasource_name in data_sources_names:
#             with delay():
#                 with Given("I open connections data sources view"):
#                     open_connections_datasources_endpoint()
#
#             with When(f"I open data source setup for data source {datasource_name}"):
#                 click_datasource_in_datasources_view(datasource_name=datasource_name)
#
#             with delay():
#                 with When("I click save and test button"):
#                     click_save_and_test_button()
#
#             with Then("I check save and test button works correctly"):
#                 assert check_alert_success() is True, error()


@TestOutline
def panel_check(
        self,
        datasource_name,
        url,
        success_connection=True,
        access_type=None,
        basic_auth=False,
        username="demo",
        password="demo",
        dashboard_name="dashboard_panel",
        use_post_method=False,
        request="SELECT now() - Interval number minute, number from numbers(60)",
        check_visualization=True,
        check_visualization_unsuccessful_alert=False,
):
    """Check that Plugin supports creating panels."""

    with Given("I create new altinity datasource"):
        create_new_altinity_datasource(
            use_post_method=use_post_method,
            datasource_name=datasource_name,
            access_type=access_type,
            url=url,
            success_connection=success_connection,
            basic_auth=basic_auth,
            username=username,
            password=password
        )

    if success_connection:
        with Given("I create new dashboard"):
            create_dashboard(dashboard_name=dashboard_name)

        with When("I add visualization for panel"):
            add_visualization()

        with When("I select datasource"):
            with delay():
                select_datasource_in_panel_view(datasource_name=datasource_name)

        with delay():
            with When("I open SQL editor"):
                go_to_sql_editor()

        with When("I enter query to SQL editor"):
            enter_sql_editor_input(request=request)

        with delay():
            with Then("I click on the visualization to see result"):
                click_on_the_visualization()

        if check_visualization:
            with Then("I check visualization is valid"):
                with By("taking screenshot"):
                    take_screenshot_for_visualization(screenshot_name="panel_check")

                with By("checking screenshot"):
                    assert check_screenshot(screenshot_name="panel_check") is True, error()

        with delay():
            if check_visualization_unsuccessful_alert:
                with Then("I check panel error exists"):
                    assert check_panel_error_exists() is True, error()
            else:
                with Then("I check there in no panel error"):
                    assert check_panel_error_exists() is False, error()


@TestScenario
def panel_check_basic_auth_success(self):
    """Check that plugin supports datasources with basic auth."""
    panel_check(
        datasource_name="test_basic_auth_success",
        url="http://clickhouse:8123",
        basic_auth=True,
        username="demo",
        password="demo"
    )


@TestScenario
def panel_check_basic_auth_not_success(self):
    """Check that plugin supports datasources with basic auth."""
    panel_check(
        datasource_name="test_basic_auth_not_success",
        success_connection=False,
        url="http://clickhouse:8123",
        basic_auth=True,
        username="demo",
        password="incorrect_password",
    )


@TestScenario
def panel_check_use_post_method_success(self):
    """Check that plugin supports datasources with basic auth."""
    panel_check(
        datasource_name="test_post_method_success",
        success_connection=True,
        url="http://clickhouse:8123",
        use_post_method=True,
        request="CREATE TABLE test_post_method_success(x Int64) ENGINE=Log",
        check_visualization=False,
    )


@TestScenario
def panel_check_use_post_method_not_success(self):
    """Check that plugin supports datasources with basic auth."""
    panel_check(
        datasource_name="test_post_method_not_success",
        success_connection=True,
        url="http://clickhouse:8123",
        use_post_method=False,
        request="CREATE TABLE test_post_method_not_success(x Int64) ENGINE=Log",
        check_visualization=False,
        check_visualization_unsuccessful_alert=True
    )


@TestFeature
@Requirements(RQ_SRS_Plugin_DataSourceSetupView("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_SaveAndTestButton("1.0"))
@Name("data source setup")
def feature(self):
    """Check that Plugin supports Grafana dashboards."""

    for scenario in loads(current_module(), Scenario):
        scenario()
