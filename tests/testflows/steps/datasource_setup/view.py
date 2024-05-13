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
def click_save_and_test_button(self):
    """Click submit button."""

    locators.save_and_test_button.click()