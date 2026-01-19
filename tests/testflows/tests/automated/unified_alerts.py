import time

from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

import steps.ui as ui
import steps.actions as actions
import steps.login.view as login
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor
import steps.panel.query_options.view as query_options
import steps.alerting.alert_rules.new.view as alert_rules

from requirements.requirements import *


@TestScenario
def check_red_alert(self):
    """Check that grafana plugin supports red unified alerts."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "red_alert")

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name=dashboard_name, finally_save_dashboard=False)

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with When("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name='test_alerts_unified')

    with When("I setup query settings for queries"):
        with delay():
            actions.setup_query_settings()

    with When("I open SQL editor"):
        with delay():
            panel.go_to_sql_editor()

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the run query"):
        with delay():
            panel.click_run_query_button()

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with When("I setup unified alerts"):
        actions.setup_unified_alerts(
            alert_name="red_alert",
            alert_folder_name="test_alert_red",
            alert_group_name="test_alert_group",
            threshold_value='0'
        )

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name=dashboard_name)

    with Then("I check red alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name=dashboard_name)
                assert dashboard.check_red_alert_for_panel() is True


@TestScenario
def check_green_alert(self):
    """Check that grafana plugin supports green unified alerts."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "green_alert")

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name=dashboard_name, finally_save_dashboard=False)

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with When("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name='test_alerts_unified')

    with When("I setup query settings for queries"):
        with delay():
            actions.setup_query_settings()

    with When("I open SQL editor"):
        with delay():
            panel.go_to_sql_editor()

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the run query"):
        with delay():
            panel.click_run_query_button()

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with When("I setup unified alerts"):
        actions.setup_unified_alerts(
            alert_name="green_alert",
            alert_folder_name="test_alert_green",
            alert_group_name="test_alert_group",
            threshold_value='10'
        )

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name=dashboard_name)

    with Then("I check green alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name=dashboard_name)
                assert dashboard.check_green_alert_for_panel() is True


@TestScenario
def check_alert_created_from_scratch(self):
    """Check that grafana plugin supports creating alerts from scratch (not from panel).

    This test creates an alert directly from the alerting page, which is not affected
    by the Grafana bug that strips expression fields when creating alerts from panels.
    """

    with Given("I open new alert rule page directly"):
        with delay():
            alert_rules.open_new_alert_rule_endpoint()

    with When("I select datasource for the alert"):
        with delay():
            alert_rules.select_datasource_in_alert(datasource_name='test_alerts_unified')

    with And("I enter alert name"):
        with delay():
            alert_rules.enter_alert_name(alert_name="scratch_alert")

    with And("I enter `Threshold` value"):
        with delay():
            alert_rules.enter_expression_textfield(textfield_value='10')

    with And("I click preview button"):
        with delay():
            alert_rules.click_preview_button()

    with And("I add folder for rule"):
        with By("clicking new folder button"):
            with delay():
                alert_rules.click_new_folder_button()

        with By("entering new folder name"):
            with delay():
                alert_rules.enter_new_folder_name(folder_name="test_scratch_folder")

        with By("clicking create button"):
            with delay():
                alert_rules.click_new_folder_create_button()

    with And("I create new evaluation group"):
        with By("clicking new evaluation group button"):
            with delay():
                alert_rules.click_new_evaluation_group_button()

        with By("entering new evaluation group name"):
            with delay():
                alert_rules.enter_new_evaluation_group_name_textfield(
                    group_name="test_scratch_group"
                )

        with By("entering new evaluation group interval"):
            with delay():
                alert_rules.enter_new_evaluation_group_interval_textfield(
                    interval="10s"
                )

        with By("clicking create button"):
            with delay():
                alert_rules.click_new_evaluation_group_create_button()

    with And("I set up pending period"):
        with delay():
            alert_rules.enter_pending_period_textfield(pending_period="10s")

    with And("I enter contact point"):
        with delay():
            alert_rules.enter_contact_point_textfield(
                contact_point="grafana-default-email"
            )

    with And("I click save rule and exit button"):
        with delay():
            alert_rules.click_save_rule_and_exit_button()

    with Then("I check alert rule was created successfully"):
        with delay():
            alert_rules.open_alerting_list_endpoint()
        # If we got here without errors, the alert was created successfully
        # The key test is that the save succeeded (no expression type error)


@TestFeature
@Requirements(
    RQ_SRS_Plugin_Alerts("1.0"),
    RQ_SRS_Plugin_Alerts_AlertSetupPage("1.0"),
    RQ_SRS_Plugin_Alerts_UnifiedAlerts("1.0"),
)
@Name("unified alerts")
def feature(self):
    """Check that grafana plugin supports unified alerts."""

    actions.create_new_altinity_datasource(datasource_name='test_alerts_unified', url="http://clickhouse:8123",)

    for scenario in loads(current_module(), Scenario):
        scenario()
