from testflows.core import *
from steps.delay import delay
from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
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


@TestFeature
@Name("e2e")
def feature(self):
    """End-to-end tests."""

    for scenario in loads(current_module(), Scenario):
        scenario()