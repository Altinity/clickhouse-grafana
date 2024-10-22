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

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "a_red_alert")

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

    with When("I setup legacy alerts"):
        actions.setup_legacy_alerts(param_value='0')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

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
    """Check that grafana plugin supports green legacy alerts."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "a_green_alert")

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

    with When("I setup legacy alerts"):
        actions.setup_legacy_alerts(param_value='10')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name=dashboard_name)

    with Then("I check red alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name=dashboard_name)
                assert dashboard.check_green_alert_for_panel() is True


@TestScenario
def check_green_into_red_alert(self):
    """Check that grafana plugin supports green legacy alerts turning into red alert."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "a_green_into_red_alert")

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

    with When("I setup legacy alerts"):
        actions.setup_legacy_alerts(param_value='10')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name=dashboard_name)

    with Then("I check green alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name=dashboard_name)
                assert dashboard.check_green_alert_for_panel() is True

    with When("I open panel"):
        with delay():
            dashboard.open_panel(panel_name="Panel Title")

    with When("I setup legacy alerts"):
        actions.setup_legacy_alerts(param_value='0', new=False)

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name=dashboard_name)

    with Then("I check red alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name=dashboard_name)
                assert dashboard.check_red_alert_for_panel() is True


@TestScenario
def check_red_into_green_alert(self):
    """Check that grafana plugin supports red legacy alerts turning into green alert."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "a_red_into_green_alert")

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

    with When("I setup legacy alerts"):
        actions.setup_legacy_alerts(param_value='0')

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name=dashboard_name)

    with Then("I check red alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name=dashboard_name)
                assert dashboard.check_red_alert_for_panel() is True

    with When("I open panel"):
        with delay():
            dashboard.open_panel(panel_name="Panel Title")

    with When("I setup legacy alerts"):
        actions.setup_legacy_alerts(param_value='10', new=False)

    with And("I save dashboard"):
        with delay():
            panel.save_dashboard()

    with Then("I open dashboard"):
        with delay():
            dashboards.open_dashboard(dashboard_name=dashboard_name)

    with Then("I check green alert is appeared"):
        for attempt in retries(delay=5, timeout=50):
            with attempt:
                dashboards.open_dashboard(dashboard_name=dashboard_name)
                assert dashboard.check_green_alert_for_panel() is True


@TestFeature
@Requirements(
    RQ_SRS_Plugin_Alerts("1.0"),
    RQ_SRS_Plugin_Alerts_AlertSetupPage("1.0"),
    RQ_SRS_Plugin_Alerts_LegacyAlerts("1.0"),
)
@Name("legacy alerts")
def feature(self):
    """Check that grafana plugin supports legacy alerts."""

    with When("I create new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='test_alerts_legacy', url="http://clickhouse:8123",)

    for scenario in loads(current_module(), Scenario):
        scenario()