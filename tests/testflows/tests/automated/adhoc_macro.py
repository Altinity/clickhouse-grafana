from testflows.core import *
from steps.delay import delay
from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor

from requirements.requirements import *


@TestOutline(Scenario)
def adhoc_macro_outline(self, dashboard_name, adhoc_value):
    """Check that grafana plugin supports adhoc macro."""

    with Given(f"I open dashboard {dashboard_name}"):
        dashboards.open_dashboard(dashboard_name=dashboard_name)

    try:
        with When("I add visualization for panel"):
            dashboard.add_visualization()

        with When("I setup query settings for queries"):
            with delay():
                actions.setup_query_settings(table="test_grafana")

        with When("I select datasource"):
            with delay():
                panel.select_datasource_in_panel_view(datasource_name='clickhouse')

        with When("I open SQL editor"):
            with delay():
                panel.go_to_sql_editor()

        with Then("I click Show generated SQL button",
                  description="opened to check reformatted queries in scenarios"):
            with delay():
                sql_editor.click_show_generated_sql_button(query_name='A')

        with Given("I define a query"):
            query = define("query", "SELECT * from $table WHERE $adhoc")

        with When("I enter query to SQL editor"):
            panel.enter_sql_editor_input(query=query)

        with Then("I click on the visualization to see results"):
            with delay():
                panel.click_on_the_visualization()

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

@TestFeature
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_Adhoc("1.0"))
@Name("adhoc macro")
def feature(self):
    """Check that grafana plugin supports adhoc macro."""

    adhoc_dashboards_values = [('$adhoc + ${variable:text} formatting', "(country = 'NL')"),
                               ('adhoc + ORDER BY WITH FILL', 'default.test_grafana.service_name = "mysql"')]

    for (dashboard_name, adhoc_value) in adhoc_dashboards_values:
        adhoc_macro_outline(dashboard_name=dashboard_name, adhoc_value=adhoc_value)
