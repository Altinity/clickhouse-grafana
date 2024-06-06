import time

from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error
from selenium.common.exceptions import NoSuchElementException
from steps.ui import *
from steps.datasource_setup.locators import locators
from steps.delay import delay


@TestStep(Then)
def check_alert_success(self):
    """Check save and test button returns success alert."""
    with By("checking alert success"):
        try:
            wait_for_element_to_be_present(
                select_type=SelectBy.CSS_SELECTOR,
                element=f"[data-testid='data-testid Alert success']"
            )
            return True
        except:
            return False


@TestStep(When)
def enter_name_into_name_field(self, datasource_name):
    """Enter name into name field in datasource setup page."""
    locators.name_field.clear()
    locators.name_field.send_keys(datasource_name)


@TestStep(When)
def enter_url_into_url_field(self, url):
    """Enter url into url field in datasource setup page."""

    locators.url_field.send_keys(url)


@TestStep(When)
def click_save_and_test_button(self):
    """Click submit button."""

    locators.save_and_test_button.click()


@TestStep(When)
def click_delete_datasource(self):
    """Click delete datasource button."""

    locators.delete_button.click()


@TestStep(When)
def click_confirm_delete_datasource(self):
    """Click delete datasource button in confirmation modal dialog."""

    locators.confirm_delete_button.click()