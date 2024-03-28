from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from steps.login import *
from steps.common import *
from steps.dashboards.locators import locators as dashboards_locators
from steps.dashboard.locators import locators as dashboard_locators
from steps.dashboards.view import *
from steps.dashboard.view import *


@TestScenario
def e2e(self):
    """First test."""

    with When("I go to clickhouse dashboard"):
        open_dashboard(dashboard_name="clickhouse dashboard")

    with delay():
        with Then("I take screenshot of Repeated postgresql panel"):
            take_screenshot_for_panel(panel_name="Repeated postgresql", screenshot_name="foo")


@TestFeature
@Name("e2e")
def feature(self):
    """First test"""

    for scenario in loads(current_module(), Scenario):
        scenario()
