from testflows.core import *

from steps.login.locators import locators
from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui


@TestStep(When)
def open_login_endpoint(self, endpoint=None):
    """Open login view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}login"

    ui.open_endpoint(endpoint=endpoint)


@TestStep(When)
def wait_login_button(self):
    """Wait login button."""

    ui.wait_for_element_to_be_clickable(
        select_type=SelectBy.CSS_SELECTOR, element="[data-testid='data-testid Login button']"
    )


@TestStep(When)
def enter_username(self, username):
    """Enter username into username field."""

    locators.username.send_keys(username)


@TestStep(When)
def enter_password(self, password):
    """Enter password into password field."""

    locators.password.send_keys(password)


@TestStep(When)
def click_submit_button(self):
    """Click submit button."""

    locators.submit.click()


@TestStep(When)
def wait_skip_change_password_button(self):
    """Wait skip change password button."""

    ui.wait_for_element_to_be_clickable(
        select_type=SelectBy.CSS_SELECTOR, element="[data-testid='data-testid Skip change password button']"
    )


@TestStep(When)
def click_skip_password_change(self):
    """Skip change password."""

    locators.skip.click()


@TestStep(When)
def skip_password_change(self):
    """Skip password change."""

    with When("I wait skip password button"):
        wait_skip_change_password_button()

    with And("I click skip password change"):
        click_skip_password_change()


@TestStep(When)
def open_login_view(self):
    """Open login view and wait it to be loaded."""
    with When("I go to login endpoint"):
        open_login_endpoint()

    with And("I wait submit button to be clickable"):
        wait_login_button()


@TestStep(When)
def login(self, username="admin", password="admin"):
    """Login into grafana"""

    with Given("I go to grafana login view"):
        open_login_view()

    with And("I enter login"):
        enter_username(username=username)

    with And("I enter password"):
        enter_password(password=password)

    with And("I click submit button"):
        click_submit_button()

    with And("I skip password change"):
        skip_password_change()
