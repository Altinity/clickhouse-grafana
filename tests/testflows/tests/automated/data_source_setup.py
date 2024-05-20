from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from steps.login import *
from steps.common import *
from steps.dashboards.locators import locators as dashboards_locators
from steps.dashboard.locators import locators as dashboard_locators
from steps.connections.locators import locators as connections_locators
from steps.connections.view import *
from steps.dashboards.view import *
from steps.dashboard.view import *
from steps.datasource_setup.view import *
from requirements.requirements import *

from steps.panel.view import *


@TestScenario
def check_existing_data_sources(self):
    """Check that existing data sources are connected."""

    with Given("I open connections data sources view"):
        open_connections_datasources_endpoint()

    with When("I get list of data sources"):
        data_sources_nums = [1, 3, 5, 6, 9]

    with When("I check data sources"):
        for data_source_num in data_sources_nums:
            with delay():
                with Given("I open connections data sources view"):
                    open_connections_datasources_endpoint()

            with When(f"I open data source setup for data source {data_source_num}"):
                connections_locators.data_source(num=data_source_num).click()

            with delay():
                with When("I click save and test button"):
                    click_save_and_test_button()

            with Then("I check save and test button works correctly"):
                assert check_alert_success() is True, error()


@TestFeature
@Name("data source setup")
def feature(self):
    """Check that Plugin supports Grafana dashboards."""

    for scenario in loads(current_module(), Scenario):
        scenario()
