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
def gh_api_check(self):
    """Check that gh-api data source works correctly."""

    with When("I go to clickhouse dashboard"):
        dashboards.open_dashboard(dashboard_name="dashboard-gh-api")


    with Then("I check gh-api datasource works correctly"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                with delay():
                    with Then("I take screenshot of Pull request events for grafana/grafana panel"):
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
        actions.create_dashboard(dashboard_name="mixed")

    with When("I add visualization for panel"):
        dashboard.add_visualization()


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

    with Then("I click save button"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard view"):
        with delay():
            dashboards.open_dashboard(dashboard_name="mixed")

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


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),)
def default_values_not_affect_url_textfield(self):
    """Check that default values not affect to url textfield in datasource setup."""

    with When("I open create new datasource view"):
        with delay():
            datasources_new.open_add_new_datasource_endpoint()

    with And("I click new altinity grafana plugin"):
        with delay():
            datasources_new.click_new_altinity_plugin_datasource()

    with And("I enter url"):
        with delay():
            datasources_altinity_edit.enter_url_into_url_field(url="http://clickhouse:8123")

    with And("I enter datasource name"):
        with delay():
            datasources_altinity_edit.enter_name_into_name_field(datasource_name="default_values_not_affect_url_textfield")

    with And("I click save and test button"):
        with delay():
            datasources_altinity_edit.click_save_and_test_button()

    with And("I click `Use default values toggle`"):
        with delay():
            datasources_altinity_edit.click_use_default_values_toggle()

    with And("I click use post method toggle"):
        with delay():
            datasources_altinity_edit.click_use_post_method_toggle()

    with Then("I check that url textfield is not change after clicking on the toggle"):
        with delay():
            assert datasources_altinity_edit.get_url_textfield_text() == "http://clickhouse:8123", error()


@TestScenario
def annotations_without_time_reformatting(self):
    """Check that grafana supports annotations query in different formats."""

    with When("I go to Annotation event_time"):
        with delay():
            dashboards.open_dashboard(dashboard_name="Annotation event_time")

    with And("I screenshot event_time panel"):
        with By("opening panel event_time"):
            with delay():
                dashboard.open_panel(panel_name='event_time')

        with By("refreshing annotation 1"):
            with delay():
                panel.refresh_annotation(annotation_name="annotation_1")

        with By("taking screenshot for visualization for event_time panel"):
            with delay():
                panel.take_screenshot_for_visualization(screenshot_name="event_tme_panel")

    with Finally("I discard changes for panel"):
        with delay(after=0.5):
            panel.click_discard_button()

    with And("I discard changes for dashboard"):
        with delay(after=0.5):
            dashboard.discard_changes_for_dashboard()

    with When("I go to Annotation event_time"):
        with delay():
            dashboards.open_dashboard(dashboard_name="Annotation event_time")

    with And("I screenshot toUInt64 panel"):
        with By("opening panel toUInt64"):
            with delay():
                dashboard.open_panel(panel_name='toUInt64')

        with By("refreshing annotation 2"):
            with delay():
                panel.refresh_annotation(annotation_name="annotation_2")

        with By("taking screenshot for visualization for toUInt64 panel"):
            with delay():
                panel.take_screenshot_for_visualization(screenshot_name="toUInt64_panel")

    with Finally("I discard changes for panel"):
        with delay(after=0.5):
            panel.click_discard_button()

    with And("I discard changes for dashboard"):
        with delay(after=0.5):
            dashboard.discard_changes_for_dashboard()

    with Then("I compare screenshots"):
        with delay():
            assert actions.compare_screenshots_percent(screenshot_name_1="event_tme_panel", screenshot_name_2="toUInt64_panel") > 0.9, error()


@TestScenario
def many_categories(self):
    """Check that grafana plugin supports visualizing timeseries with many categories."""

    with When("I go to ClickHouse Queries Analysis dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name="ClickHouse Queries Analysis")

    try:
        with When("I open Queries timeline panel"):
            with delay():
                dashboard.open_panel(panel_name="Queries timeline")

        with And("I click run query button"):
            with delay():
                panel.click_run_query_button()

        with Then("I check there is no errors on the visualization"):
            with delay():
                assert panel.check_no_labels_on_visualization(labels=["normalized_query_hash", "Too many points"]), error()
    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_discard_button()

        with And("I discard changes for dashboard"):
            with delay(after=0.5):
                dashboard.discard_changes_for_dashboard()

@TestFeature
@Name("e2e")
def feature(self):
    """End-to-end tests."""

    for scenario in loads(current_module(), Scenario):
        scenario()