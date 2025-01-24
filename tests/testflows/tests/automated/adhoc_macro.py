from testflows.core import *
from steps.delay import delay
from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor

from requirements.requirements import *


@TestOutline
def adhoc_macro_outline(self, dashboard_name, expected_adhoc_values, adhoc_label, adhoc_name):
    """Check that grafana plugin supports adhoc macro."""

    with Given(f"I open dashboard {dashboard_name}"):
        dashboards.open_dashboard(dashboard_name=dashboard_name)

    try:
        with When("I add visualization for panel"):
            dashboard.add_visualization()

        with And("I select datasource"):
            with delay():
                panel.select_datasource_in_panel_view(datasource_name='clickhouse')

        with And("I setup query settings for queries"):
            with delay():
                actions.setup_query_settings(table="test_grafana")

        with And("I open SQL editor"):
            with delay():
                panel.go_to_sql_editor()

        with And("I get default adhoc value"):
            with delay():
                default_adhoc_value = panel.get_adhoc_dropdown_value(label=adhoc_label, variable_number=3)

        with When("I get every adhoc value"):
            with delay():
                adhoc_values = panel.get_dropdown_values_set(label=adhoc_label, variable_number=3)
                note(adhoc_values)
                assert adhoc_values == expected_adhoc_values, error()

        with And("I remove adhoc"):
            with delay():
                panel.click_remove_adhoc_filter_button(adhoc_name=adhoc_name)

        with And("I add adhoc"):
            with delay():
                panel.click_add_adhoc_filter_button()

        with And("I enter adhoc name"):
            with delay():
                panel.enter_value_adhoc_dropdown(label=adhoc_label, variable_number=1, variable_value=adhoc_name)

        with And("I enter default adhoc value"):
            with delay():
                panel.change_adhoc_value(label=adhoc_label, variable_number=3, variable_value=default_adhoc_value)

        with And("I get every adhoc value after deleting and adding adhoc"):
            with delay():
                adhoc_values_after_deleting_and_adding_adhoc = panel.get_dropdown_values_set(label=adhoc_label, variable_number=3)

        with Then("I check adhoc correctly displays values after recreating adhoc"):
            assert adhoc_values_after_deleting_and_adding_adhoc == adhoc_values, error()

        with And("I click Show generated SQL button",
                  description="opened to check reformatted queries in scenarios"):
            with delay():
                sql_editor.click_show_generated_sql_button(query_name='A')

        with When("I define a query"):
            query = define("query", "SELECT * from $table WHERE $adhoc")

        with When("I enter query to SQL editor"):
            panel.enter_sql_editor_input(query=query)

        with Then("I click on the visualization to see results"):
            with delay():
                panel.click_on_the_visualization()

        for adhoc_value in adhoc_values:
            with When(f"I define adhoc value as {adhoc_value}"):
                with delay():
                    panel.change_adhoc_value(label=adhoc_label, variable_number=3, variable_value=adhoc_value)

            with Then(f"I check reformatted query contains adhoc {adhoc_value}"):
                with delay():
                    assert adhoc_value in sql_editor.get_reformatted_query(query_name='A'), error()

    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_discard_button()

        with And("I discard changes for dashboard"):
            with delay():
                dashboard.discard_changes_for_dashboard()


@TestScenario
def default_adhoc(self):
    """Check that grafana plugin supports setting up adhoc filter in datasource setup."""

    with Given("I create new altinity datasource"):
        actions.create_new_altinity_datasource(
            datasource_name="test_default_adhoc",
            url="http://clickhouse:8123",
            configure_adhoc_filter_request="SELECT DISTINCT {field} AS value FROM {database}.{table} WHERE value LIKE '%U%' LIMIT 300",
        )

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name="default_adhoc", finally_save_dashboard=False)

    with When("I create adhoc variable"):
        dashboard.create_new_variable(datasource_name="test_default_adhoc", variable_type="Ad hoc filters")

    with And("I save dashboard"):
        panel.save_dashboard()

    with When("I open dashboard"):
        dashboards.open_dashboard(dashboard_name="default_adhoc")

    with And("I add adhoc"):
        with delay():
            panel.click_add_adhoc_filter_button()

    with And("I enter adhoc name"):
        with delay():
            panel.enter_value_adhoc_dropdown(label="query0", variable_number=1, variable_value="default.test_grafana.country")

    with And("I enter default adhoc value"):
        with delay():
            panel.change_adhoc_value(label="query0", variable_number=3, variable_value="US")

    with And("I get every adhoc value after deleting and adding adhoc"):
        with delay():
            adhoc_values_after_deleting_and_adding_adhoc = panel.get_dropdown_values_set(label="query0", variable_number=3)

    with Then("I check adhoc correctly displays values after recreating adhoc"):
        assert adhoc_values_after_deleting_and_adding_adhoc == {'US', 'RU', 'EU', 'UK'}, error()


@TestFeature
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_Adhoc("1.0"))
@Name("adhoc macro")
def feature(self):
    """Check that grafana plugin supports adhoc macro."""

    adhoc_dashboards_values = [('$adhoc + ${variable:text} formatting', {'US', 'CN', 'RU', 'FR', 'EU', 'AR', 'DE', 'UK', 'TK', 'NL'}, "adhoc_variable", "default.test_grafana.country"),
                               ('adhoc + ORDER BY WITH FILL', {'mysql', 'postgresql'}, "adhoc", "default.test_grafana.service_name")]

    for (dashboard_name, expected_adhoc_values, adhoc_label, adhoc_name) in adhoc_dashboards_values:
        with Scenario(dashboard_name):
            adhoc_macro_outline(dashboard_name=dashboard_name, expected_adhoc_values=expected_adhoc_values, adhoc_label=adhoc_label, adhoc_name=adhoc_name)

    for scenario in loads(current_module(), Scenario):
        scenario()