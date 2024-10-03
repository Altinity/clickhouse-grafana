from testflows.core import *

from steps.delay import delay
from steps.dashboards.locators import locators
from selenium.webdriver.common.by import By as SelectBy
from selenium.common.exceptions import NoSuchElementException

import steps.ui as ui


@TestStep(When)
def open_dashboards_endpoint(self, endpoint=None):
    """Open dashboard view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}dashboards"

    ui.open_endpoint(endpoint=endpoint)


@TestStep(When)
def wait_dashboard(self, dashboard_name):
    """Wait dashboard to be loaded."""
    ui.wait_for_element_to_be_clickable(
        select_type=SelectBy.LINK_TEXT, element=f"{dashboard_name}"
    )


@TestStep(When)
def click_dashboard_checkmark(self, dashboard_name):
    """Click dashboard checkmark."""
    locators.check_mark(dashboard_name=dashboard_name).click()


@TestStep(When)
def click_delete_button(self):
    """Click delete button."""
    locators.delete_button.click()


@TestStep(When)
def enter_delete_conformation(self):
    """Enter Delete into the delete confirmation field."""
    locators.delete_confirmation_input.send_keys("Delete")


@TestStep(When)
def click_delete_confirmation_button(self):
    """Click delete button to confirm dashboard deletion."""
    locators.delete_confirmation_button.click()


@TestStep(When)
def open_dashboard_view(self, dashboard_name):
    """Open dashboard view."""

    locators.dashboard(dashboard_name=f'{dashboard_name}').click()


@TestStep(When)
def open_dashboards_view(self, wait_dashboard_name="clickhouse dashboard"):
    """Open dashboards view and wait it to be loaded."""
    with When("I go to dashboards endpoint"):
        with delay():
            open_dashboards_endpoint()

    with And("I wait submit button to be clickable"):
        with delay():
            wait_dashboard(dashboard_name=wait_dashboard_name)


@TestStep(When)
def click_new_button(self):
    """Click 'New' button."""
    locators.new_button.click()


@TestStep(When)
def click_new_dashboard_button(self):
    """Click 'New dashboard' button."""
    locators.new_dashboard_button.click()


@TestStep(When)
def create_new_dashboard(self):
    """Create new empty dashboard."""
    with By("clicking 'New' button"):
        click_new_button()

    with By("clicking new dashboard button"):
        click_new_dashboard_button()


@TestStep(When)
def delete_dashboard(self, dashboard_name):
    """Delete dashboard."""
    with By("opening dashboards view"):
        open_dashboards_view()

    with By("selecting dashboard"):
        with delay():
            click_dashboard_checkmark(dashboard_name=dashboard_name)

    with By("clicking delete button"):
        with delay():
            click_delete_button()

    with By("entering confirmation"):
        with delay():
            enter_delete_conformation()

    with By("clicking delete button in confirmation window"):
        click_delete_confirmation_button()


@TestStep(When)
def open_dashboard(self, dashboard_name):
    """Open dashboard view."""

    with delay():
        with When("I go to dashboards view"):
            open_dashboards_view()

    with And(f"I go to {dashboard_name}"):
        open_dashboard_view(dashboard_name=dashboard_name)


@TestStep(Then)
def check_dashboard_exists(self, dashboard_name):
    """Open dashboards view and check dashboard exists."""

    with By("opening dashboard view"):
        open_dashboards_view()

    with By("checking dashboard exists"):
        try:
            locators.dashboard(dashboard_name=dashboard_name)
            return True
        except NoSuchElementException:
            return False

