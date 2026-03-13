from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui
import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard


DASHBOARD_URL = "d/test-limited-permissions/test-limited-permissions-issue-23-813"


@TestStep(Given)
def open_limited_permissions_dashboard(self):
    """Open the test-limited-permissions provisioned dashboard by URL."""

    with By("navigating to the dashboard URL"):
        ui.open_endpoint(
            endpoint=f"{self.context.endpoint}{DASHBOARD_URL}"
        )

    with And("waiting for the dashboard to load"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(
                        panel_name="Basic Query - No System Table Access Required"
                    ), error()


@TestScenario
def time_series_panel_displays_data(self):
    """Check that the basic time series panel displays data with limited permissions."""

    with Given("I open the limited permissions dashboard"):
        open_limited_permissions_dashboard()

    with Then("I check 'Basic Query' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(
                        panel_name="Basic Query - No System Table Access Required"
                    ), error()

    with And("I open the panel to verify it has data"):
        with delay():
            dashboard.open_panel(
                panel_name="Basic Query - No System Table Access Required"
            )

    try:
        with Then("I check visualization is loaded"):
            with delay():
                panel.wait_visualization()

        with And("I check there are no error indicators"):
            driver = self.context.driver
            with delay():
                error_elements = driver.find_elements(
                    SelectBy.XPATH,
                    "//*[contains(@data-testid, 'Panel status error')]"
                    " | //*[contains(@aria-label, 'Panel status error')]",
                )
                assert len(error_elements) == 0, error()

    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay(after=0.5):
                dashboard.discard_changes_for_dashboard()


@TestScenario
def table_panel_displays_data(self):
    """Check that the table panel displays data with limited permissions."""

    with Given("I open the limited permissions dashboard"):
        open_limited_permissions_dashboard()

    with Then("I check 'Table Query' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(
                        panel_name="Table Query - Works Without System Tables"
                    ), error()

    with And("I open the table panel"):
        with delay():
            dashboard.open_panel(
                panel_name="Table Query - Works Without System Tables"
            )

    try:
        with Then("I check table has expected columns"):
            for attempt in retries(delay=5, timeout=30):
                with attempt:
                    with delay():
                        assert panel.check_columns_in_table_view(
                            columns=["service_name", "country", "count"]
                        ), error()

    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay(after=0.5):
                dashboard.discard_changes_for_dashboard()


@TestScenario
def grouped_time_series_panel_displays_data(self):
    """Check that the grouped time series panel displays data with limited permissions."""

    with Given("I open the limited permissions dashboard"):
        open_limited_permissions_dashboard()

    with Then("I check 'Grouped Time Series' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(
                        panel_name="Grouped Time Series - No System Access Needed"
                    ), error()

    with And("I open the grouped time series panel"):
        with delay():
            dashboard.open_panel(
                panel_name="Grouped Time Series - No System Access Needed"
            )

    try:
        with Then("I check visualization is loaded"):
            with delay():
                panel.wait_visualization()

        with And("I check there are no error indicators"):
            driver = self.context.driver
            with delay():
                error_elements = driver.find_elements(
                    SelectBy.XPATH,
                    "//*[contains(@data-testid, 'Panel status error')]"
                    " | //*[contains(@aria-label, 'Panel status error')]",
                )
                assert len(error_elements) == 0, error()

    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay(after=0.5):
                dashboard.discard_changes_for_dashboard()


@TestScenario
def stat_panel_displays_numeric_value(self):
    """Check that the stat panel correctly displays UInt64 count as a numeric value."""

    with Given("I open the limited permissions dashboard"):
        open_limited_permissions_dashboard()

    with Then("I check 'Total Records' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(
                        panel_name="Total Records"
                    ), error()

    with And("I verify the stat panel shows a numeric value (not 'No data')"):
        driver = self.context.driver
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    # Find the Total Records panel region
                    panel_region = driver.find_element(
                        SelectBy.XPATH,
                        "//*[@aria-label='Total Records' or contains(@data-testid, 'Panel header Total Records')]"
                        "/ancestor::*[contains(@class, 'panel') or @data-viz-panel-key][1]"
                    )
                    panel_text = panel_region.text
                    note(f"Stat panel text: {panel_text}")
                    assert "No data" not in panel_text, error()
                    assert "Total Records" in panel_text, error()


@TestScenario
def top_countries_bargauge_displays_data(self):
    """Check that the bar gauge panel displays country data with limited permissions."""

    with Given("I open the limited permissions dashboard"):
        open_limited_permissions_dashboard()

    with Then("I check 'Top Countries' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(
                        panel_name="Top Countries"
                    ), error()

    with And("I open the bar gauge panel"):
        with delay():
            dashboard.open_panel(panel_name="Top Countries")

    try:
        with Then("I check visualization is loaded"):
            with delay():
                panel.wait_visualization()

        with And("I check there are no error indicators"):
            driver = self.context.driver
            with delay():
                error_elements = driver.find_elements(
                    SelectBy.XPATH,
                    "//*[contains(@data-testid, 'Panel status error')]"
                    " | //*[contains(@aria-label, 'Panel status error')]",
                )
                assert len(error_elements) == 0, error()

    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay(after=0.5):
                dashboard.discard_changes_for_dashboard()


@TestScenario
def alert_query_panel_displays_data(self):
    """Check that the alert query time series panel displays data with limited permissions."""

    with Given("I open the limited permissions dashboard"):
        open_limited_permissions_dashboard()

    with Then("I check 'Alert Query Test' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(
                        panel_name="Alert Query Test"
                    ), error()

    with And("I open the alert query panel"):
        with delay():
            dashboard.open_panel(panel_name="Alert Query Test")

    try:
        with Then("I check visualization is loaded"):
            with delay():
                panel.wait_visualization()

        with And("I check there are no error indicators"):
            driver = self.context.driver
            with delay():
                error_elements = driver.find_elements(
                    SelectBy.XPATH,
                    "//*[contains(@data-testid, 'Panel status error')]"
                    " | //*[contains(@aria-label, 'Panel status error')]",
                )
                assert len(error_elements) == 0, error()

    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay(after=0.5):
                dashboard.discard_changes_for_dashboard()


@TestScenario
def logs_panel_displays_data(self):
    """Check that the logs panel displays log data with limited permissions."""

    with Given("I open the limited permissions dashboard"):
        open_limited_permissions_dashboard()

    with Then("I check 'Logs Panel' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(
                        panel_name="Logs Panel - Works Without System Tables"
                    ), error()

    with And("I open the logs panel"):
        with delay():
            dashboard.open_panel(
                panel_name="Logs Panel - Works Without System Tables"
            )

    try:
        with Then("I check visualization is loaded"):
            with delay():
                panel.wait_visualization()

        with And("I check there are no error indicators"):
            driver = self.context.driver
            with delay():
                error_elements = driver.find_elements(
                    SelectBy.XPATH,
                    "//*[contains(@data-testid, 'Panel status error')]"
                    " | //*[contains(@aria-label, 'Panel status error')]",
                )
                assert len(error_elements) == 0, error()

    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay(after=0.5):
                dashboard.discard_changes_for_dashboard()


@TestScenario
def services_distribution_piechart_displays_data(self):
    """Check that the pie chart panel displays service distribution with limited permissions."""

    with Given("I open the limited permissions dashboard"):
        open_limited_permissions_dashboard()

    with Then("I check 'Services Distribution' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(
                        panel_name="Services Distribution"
                    ), error()

    with And("I open the pie chart panel"):
        with delay():
            dashboard.open_panel(panel_name="Services Distribution")

    try:
        with Then("I check visualization is loaded"):
            with delay():
                panel.wait_visualization()

        with And("I check there are no error indicators"):
            driver = self.context.driver
            with delay():
                error_elements = driver.find_elements(
                    SelectBy.XPATH,
                    "//*[contains(@data-testid, 'Panel status error')]"
                    " | //*[contains(@aria-label, 'Panel status error')]",
                )
                assert len(error_elements) == 0, error()

    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay(after=0.5):
                dashboard.discard_changes_for_dashboard()


@TestFeature
@Name("limited access")
def feature(self):
    """Tests for limited permissions dashboard (issue #813).

    Verifies that the ClickHouse Grafana plugin works correctly when
    the datasource user has no access to system tables.
    """

    for scenario in loads(current_module(), Scenario):
        scenario()
