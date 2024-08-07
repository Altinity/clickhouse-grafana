from testflows.core import *
from steps.delay import delay
from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor
import steps.connections.datasources.view as datasources
import steps.connections.datasources.altinity_edit.view as datasources_altinity_edit

from requirements.requirements import *


@TestScenario
def gh_api_check(self):
    """Check that gh-api data source works correctly."""

    with When("I go to clickhouse dashboard"):
        dashboards.open_dashboard(dashboard_name="gh-api")

    for attempt in retries(delay=5, timeout=50):
        with attempt:
            with delay():
                with Then("I take screenshot of Repeated postgresql panel"):
                    dashboard.take_screenshot_for_panel(panel_name="Pull request events for grafana/grafana", screenshot_name="gh-api_panel")

            with delay():
                with Then("I check graph contains data"):
                    assert actions.check_screenshot_contains_green(screenshot_name="gh-api_panel") is True, error()


@TestCheck
def check_queries(self):
    """Go to SQL editor and check queries,"""
    with By("clicking go to sql editor button"):
        with delay():
            panel.go_to_sql_editor(query_name='A')
            panel.go_to_sql_editor(query_name='B')
    with By("clicking show generated sql button"):
        with delay():
            sql_editor.click_show_generated_sql_button(query_name='A')
            sql_editor.click_show_generated_sql_button(query_name='B')
    with By("checking that reformatted queries contains actual queries"):
        with delay():
            assert 'SELECT now(), 1' in sql_editor.get_reformatted_query(query_name='A'), error()
            assert 'SELECT now(), 1' in sql_editor.get_reformatted_query(query_name='B'), error()


@TestScenario
def mixed_data_sources(self):
    """Check that grafana plugin supports mixed data sources."""

    with When("I create the first new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='mixed_1', url="http://clickhouse:8123")

    with When("I create the second new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='mixed_2', url="http://clickhouse:8123")

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name="a_mixed")

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    try:
        with When("I select datasource"):
            with delay():
                panel.select_datasource_in_panel_view(datasource_name='-- Mixed --')

        with When("I add query"):
            with delay():
                panel.click_add_query_button()

        with When("I change datasource for the first query"):
            with delay():
                panel.enter_data_source_for_query(query_name='A', datasource_name='mixed_1')

        with When("I change datasource for the second query"):
            with delay():
                panel.enter_data_source_for_query(query_name='B', datasource_name='mixed_2')

        with When("I open SQL editor"):
            with delay():
                panel.go_to_sql_editor(query_name='A')
                panel.go_to_sql_editor(query_name='B')

        with Then("I enter the first query"):
            with delay():
                panel.enter_sql_editor_input(query_name='A', query='SELECT now(), 1')

        with Then("I enter the second query"):
            with delay():
                panel.enter_sql_editor_input(query_name='B', query='SELECT now(), 1')

        with When("I click on the visualization to see the result"):
            with delay():
                panel.click_on_the_visualization()

        with Then("I click apply button"):
            with delay():
                panel.click_apply_button()

        with Then("I go to panel edit the first time"):
            with delay():
                dashboard.open_panel(panel_name='Panel Title')

        with Then("I check queries the first time"):
            check_queries()

        with Then("I click discard button"):
            with delay():
                panel.click_discard_button()

        with Then("I go to panel edit the second time"):
            with delay():
                dashboard.open_panel(panel_name='Panel Title')

        with Then("I check queries the second time"):
            check_queries()

    finally:
        with Finally("I click discard button"):
            with delay():
                panel.click_discard_button()
            with delay():
                dashboard.saving_dashboard()


@TestFeature
@Name("e2e")
def feature(self):
    """End-to-end tests."""

    for scenario in loads(current_module(), Scenario):
        scenario()