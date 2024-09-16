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
import steps.alerting.alert_rules_legacy.new.view as alert_rules_legacy

from requirements.requirements import *


@TestScenario
def check_red_alert(self):
    """Check that grafana plugin supports red legacy alerts."""

    with When("I go to alerts tab"):
        with delay():
            panel.click_alert_tab()

    with And("I click `Create Alert`"):
        with delay():
            alert_rules_legacy.click_create_alert_button()

    with And("I enter alert name"):
        with delay():
            alert_rules_legacy.enter_name(alert_name='test_alert')

    with And("I enter `Evaluate every`"):
        with delay():
            alert_rules_legacy.enter_evaluate_every(evaluate_every='10s')

    with And("I enter `For`"):
        with delay():
            alert_rules_legacy.enter_for(evaluate_for='10s')

    with And("I enter input param for alert"):
        with delay():
            alert_rules_legacy.enter_input(param_number=0, param_value='0')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name="alerts_legacy")

    with Then("I check red alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name="alerts_legacy")
                assert dashboard.check_red_alert_for_panel() is True


@TestScenario
def check_green_alert():
    """Check that grafana plugin supports red legacy alerts."""

    with When("I go to alerts tab"):
        with delay():
            panel.click_alert_tab()

    with And("I click `Create Alert`"):
        with delay():
            alert_rules_legacy.click_create_alert_button()

    with And("I enter alert name"):
        with delay():
            alert_rules_legacy.enter_name(alert_name='test_alert')

    with And("I enter `Evaluate every`"):
        with delay():
            alert_rules_legacy.enter_evaluate_every(evaluate_every='10s')

    with And("I enter `For`"):
        with delay():
            alert_rules_legacy.enter_for(evaluate_for='10s')

    with And("I enter input param for alert"):
        with delay():
            alert_rules_legacy.enter_input(param_number=0, param_value='10')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name="alerts_legacy")

    with Then("I check red alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name="alerts_legacy")
                assert dashboard.check_green_alert_for_panel() is True


@TestScenario
def check_green_into_red_alert():
    """Check that grafana plugin supports green legacy alerts turning into red alert."""

    with When("I go to alerts tab"):
        with delay():
            panel.click_alert_tab()

    with And("I click `Create Alert`"):
        with delay():
            alert_rules_legacy.click_create_alert_button()

    with And("I enter alert name"):
        with delay():
            alert_rules_legacy.enter_name(alert_name='test_alert')

    with And("I enter `Evaluate every`"):
        with delay():
            alert_rules_legacy.enter_evaluate_every(evaluate_every='10s')

    with And("I enter `For`"):
        with delay():
            alert_rules_legacy.enter_for(evaluate_for='10s')

    with And("I enter input param for alert"):
        with delay():
            alert_rules_legacy.enter_input(param_number=0, param_value='10')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name="alerts_legacy")

    with Then("I check green alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name="alerts_legacy")
                assert dashboard.check_green_alert_for_panel() is True

    with When("I open panel"):
        with delay():
            dashboard.open_panel("New panel")

    with When("I go to alerts tab"):
        with delay():
            panel.click_alert_tab()

    with And("I enter input param for alert"):
        with delay():
            alert_rules_legacy.enter_input(param_number=0, param_value='0')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name="alerts_legacy")

    with Then("I check red alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name="alerts_legacy")
                assert dashboard.check_red_alert_for_panel() is True


@TestScenario
def check_red_into_green_alert():
    """Check that grafana plugin supports red legacy alerts turning into green alert."""

    with When("I go to alerts tab"):
        with delay():
            panel.click_alert_tab()

    with And("I click `Create Alert`"):
        with delay():
            alert_rules_legacy.click_create_alert_button()

    with And("I enter alert name"):
        with delay():
            alert_rules_legacy.enter_name(alert_name='test_alert')

    with And("I enter `Evaluate every`"):
        with delay():
            alert_rules_legacy.enter_evaluate_every(evaluate_every='10s')

    with And("I enter `For`"):
        with delay():
            alert_rules_legacy.enter_for(evaluate_for='10s')

    with And("I enter input param for alert"):
        with delay():
            alert_rules_legacy.enter_input(param_number=0, param_value='10')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name="alerts_legacy")

    with Then("I check red alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name="alerts_legacy")
                assert dashboard.check_red_alert_for_panel() is True

    with When("I open panel"):
        with delay():
            dashboard.open_panel("New panel")

    with When("I go to alerts tab"):
        with delay():
            panel.click_alert_tab()

    with And("I enter input param for alert"):
        with delay():
            alert_rules_legacy.enter_input(param_number=0, param_value='0')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name="alerts_legacy")

    with Then("I check green alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name="alerts_legacy")
                assert dashboard.check_green_alert_for_panel() is True


@TestFeature
@Name("legacy alerts")
def feature(self):
    """Check that grafana plugin supports legacy alerts."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "alerts_legacy")

    with When("I create new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='test_alerts_legacy', url="http://clickhouse:8123",)

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name=dashboard_name)

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with When("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name='test_alerts_legacy')

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

    for scenario in loads(current_module(), Scenario):
        scenario()