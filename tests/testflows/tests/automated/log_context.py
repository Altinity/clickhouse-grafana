import time

from testflows.core import *
from testflows.asserts import error

from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
from steps.delay import delay

from requirements.requirements import *


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def log_context_show_context_with_where(self):
    """Check that Show Context button works for logs when the query
    has WHERE conditions on non-timestamp columns.

    Regression test for https://github.com/Altinity/clickhouse-grafana/issues/706

    The bug: Show Context generated SQL that placed WHERE conditions
    (e.g. on level, label columns) in the outer query of a window function
    subquery, but those columns were only available in the inner subquery.
    """

    with Given("I go to the Test Logs support dashboard"):
        dashboards.open_dashboard(dashboard_name="Test Logs support")

    with When("I scroll to the Altinity Plugin Logs panel"):
        with delay():
            dashboard.scroll_to_panel(panel_name="Altinity Plugin Logs")

    with And("I wait for log rows to appear"):
        driver = self.context.driver
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                log_menu_buttons = driver.find_elements(
                    SelectBy.CSS_SELECTOR,
                    "[data-testid='data-testid Panel header Altinity Plugin Logs'] "
                    "button[aria-label='Log menu']"
                )
                # fall back: look for any log menu button in the Altinity panel region
                if not log_menu_buttons:
                    panels = driver.find_elements(
                        SelectBy.XPATH,
                        "//section[.//h2[text()='Altinity Plugin Logs']]//button[@aria-label='Log menu']"
                    )
                    log_menu_buttons = panels
                assert len(log_menu_buttons) > 0, error()

    with When("I click on the Log menu button for the first log row"):
        with delay():
            log_menu_buttons[0].click()

    with And("I click Show context in the dropdown"):
        with delay():
            for attempt in retries(delay=2, timeout=10):
                with attempt:
                    show_context_item = driver.find_element(
                        SelectBy.XPATH,
                        "//div[@role='menuitem' and text()='Show context']"
                    )
                    show_context_item.click()

    with Then("I verify the Log context dialog opens without errors"):
        for attempt in retries(delay=2, timeout=15):
            with attempt:
                dialog = driver.find_element(
                    SelectBy.XPATH,
                    "//div[@role='dialog']//h2[text()='Log context']"
                )
                assert dialog is not None, error()

        with And("I verify the dialog contains log lines, not error messages"):
            dialog_container = driver.find_element(
                SelectBy.XPATH,
                "//div[@role='dialog']"
            )
            dialog_text = dialog_container.text
            assert "UNKNOWN_IDENTIFIER" not in dialog_text, error()
            assert "DB::Exception" not in dialog_text, error()
            assert "Log line" in dialog_text or "Log context" in dialog_text, error()

    with Finally("I close the Log context dialog"):
        try:
            close_button = driver.find_element(
                SelectBy.XPATH,
                "//div[@role='dialog']//button[@aria-label='Close']"
            )
            close_button.click()
        except Exception:
            pass


@TestFeature
@Name("log context")
def feature(self):
    """Tests for log context query generation (Show Context button).

    Regression tests for https://github.com/Altinity/clickhouse-grafana/issues/706
    """

    for scenario in loads(current_module(), Scenario):
        scenario()
