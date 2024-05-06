import time

from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error
from selenium.common.exceptions import NoSuchElementException
from steps.ui import *
from steps.datasource_setup.locators import locators
from steps.delay import delay


@TestStep(When)
def click_save_and_test_button(self):
    """Click submit button."""

    locators.save_and_test_button.click()