from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.panel.sql_editor.view as sql_editor
import steps.connections.datasources.view as datasources


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
    """Check that Plugin supports creating altinity datasources and panels using altinity datasources."""

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


@TestOutline
def check_default_values(
        self,
        default_column_timestamp_type=None,
        default_datetime_field=None,
        default_timestamp_field=None,
        default_datetime64_field=None,
        default_float_field=None,
        default_timestamp_64_3_field=None,
        default_timestamp_64_6_field=None,
        default_timestamp_64_9_field=None,
        default_date_field=None,
        check_reformatted_query="SELECT 'EventDate', 'EventTime'",
):
    """Check that plugin supports setting up default values."""
    with Given("I create new altinity datasource"):
        actions.create_new_altinity_datasource(
            datasource_name="default_values",
            url="http://clickhouse:8123",
            default=True,
            use_default_values=True,
            default_column_timestamp_type=default_column_timestamp_type,
            default_datetime_field=default_datetime_field,
            default_timestamp_field=default_timestamp_field,
            default_datetime64_field=default_datetime64_field,
            default_float_field=default_float_field,
            default_timestamp_64_3_field=default_timestamp_64_3_field,
            default_timestamp_64_6_field=default_timestamp_64_6_field,
            default_timestamp_64_9_field=default_timestamp_64_9_field,
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
