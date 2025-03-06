from testflows.core import *
from steps.delay import delay
from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor
import steps.connections.datasources.view as datasources
import steps.connections.datasources.new.view as datasources_new
import steps.connections.datasources.altinity_edit.view as datasources_altinity_edit

from requirements.requirements import *


@TestScenario
def preview_values(self):
    """Check that grafana plugin supports template variables editor and correctly display preview values."""

    with Given("I create new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='preview_variable_values', url="http://clickhouse:8123")

    with And("I create new dashboard"):
        actions.create_dashboard(dashboard_name="preview_variable_values")


    with When("I create variable for dashboard"):
        with delay():
            dashboard.create_variable_for_dashboard(
                datasource_name='preview_variable_values', 
                query="SELECT DISTINCT country FROM $table"
            )

    with Then("I get preview values"):
        with delay():
            preview_values=dashboard.get_values_preview()

    with And("I check preview contains countries"):
        countries = ['US', 'CN', 'RU', 'FR', 'EU', 'AR', 'DE', 'UK', 'TK', 'NL']
        for country in countries:
            assert country in preview_values, error()



@TestScenario
def reformatted_query(self):
    """Check that grafana plugin supports template variables editor and correctly display reformatted query."""

    with Given("I create new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='reformatted_query_for_variable', url="http://clickhouse:8123")

    with And("I create new dashboard"):
        actions.create_dashboard(dashboard_name="reformatted_query_for_variable")


    with When("I create variable for dashboard"):
        with delay():
            dashboard.create_variable_for_dashboard(
                datasource_name='reformatted_query_for_variable', 
                query="SELECT '$table', '$dateCol', '$dateTimeCol', '$timeSeries'"
            )

    with And("I click run query"):
        with delay():
            dashboard.click_run_query_button()

    with And("I click show generated query button"):
        with delay():
            dashboard.click_show_generated_sql_button()
    
    with Then("I check reformatted sql button"):
        with delay():
            debug(dashboard.get_reformatted_query())
            assert "SELECT 'default.test_grafana', 'undefined', 'event_time', '(intDiv(toUInt32(event_time), 0) * 0) * 1000'" in dashboard.get_reformatted_query(), error()
    

@TestScenario
def variable_dropdown(self):
    """Check that grafana plugin supports template variables editor and variable dropdown perform correctly."""
    
    with Given("I create new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='dropdown_variable_values', url="http://clickhouse:8123")

    with And("I create new dashboard"):
        actions.create_dashboard(dashboard_name="variable_dropdown")

    with When("I create variable for dashboard"):
        with delay():
            dashboard.create_variable_for_dashboard(
                datasource_name='dropdown_variable_values', 
                query="SELECT DISTINCT country FROM $table"
            )
    
    with And("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name="variable_dropdown")

    with And("I add visualization for panel"):
        with delay():
            dashboard.add_visualization()

    with And("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name='dropdown_variable_values')

    with And("I setup query settings for queries"):
        with delay():
            actions.setup_query_settings(table="test_grafana")

    with Then("I get all variable values"):
        with delay():
            variable_values = panel.get_dropdown_variable_values_set(variable_name="query0")
            debug(variable_values)

    with And("I check dropdown contains countries"):
        countries = ['US', 'CN', 'RU', 'FR', 'EU', 'AR', 'DE', 'UK', 'TK', 'NL']
        for country in countries:
            assert country in variable_values, error()

    with And("I open SQL editor"):
        with delay():
            panel.go_to_sql_editor()

    with And("I click Show generated SQL button",
                description="opened to check reformatted queries in scenarios"):
        with delay():
            sql_editor.click_show_generated_sql_button(query_name='A')

    with When("I define a query"):
        query = define("query", "SELECT '$query0'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    for variable_value in variable_values:
        with When(f"I define variable value as {variable_value}"):
            with delay():
                panel.change_variable_value(variable_name="query0", variable_value=variable_value)

        with Then(f"I check reformatted query contains variable {variable_value}"):
            with delay():
                assert variable_value in sql_editor.get_reformatted_query(query_name='A'), error()


@TestFeature
@Name("template variable editor")
def feature(self):
    """Check template variable editor."""

    for scenario in loads(current_module(), Scenario):
        scenario()