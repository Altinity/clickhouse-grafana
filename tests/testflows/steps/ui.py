from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from selenium.webdriver.common.by import By as SelectBy
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@TestStep(Given)
def wait_for_element_to_be_visible(self, select_type=None, element=None, timeout=30):
    """An expectation for checking that an element is present on the DOM of a
    page and visible. Visibility means that the element is not only displayed
    but also has a height and width that is greater than 0.
    select_type - option that follows after SelectBy. (Examples: CSS, ID, XPATH, NAME)
    element - locator in string format(Example: "organizationId").
    """
    driver = self.context.driver

    wait = WebDriverWait(driver, timeout)
    wait.until(EC.visibility_of_element_located((select_type, element)))


@TestStep(Given)
def wait_for_element_to_be_clickable(
    self, timeout=None, poll_frequency=None, select_type=None, element=None
):
    """An Expectation for checking an element is visible and enabled such that
    you can click it.
    select_type - option that follows after SelectBy. (Examples: CSS, ID, XPATH, NAME)
    element - locator in string format(Example: "organizationId").
    """
    driver = self.context.driver
    if timeout is None:
        timeout = 30
    if poll_frequency is None:
        poll_frequency = 1

    wait = WebDriverWait(driver, timeout, poll_frequency)
    wait.until(EC.element_to_be_clickable((select_type, element)))


@TestStep(Given)
def wait_for_element_to_be_present(self, select_type=None, element=None):
    """An expectation for checking that an element is present on the DOM
    of a page. This does not necessarily mean that the element is visible.
    select_type - option that follows after SelectBy. (Examples: CSS, ID, XPATH, NAME)
    element - locator in string format(Example: ".form-group>.toggle-switch").
    """
    driver = self.context.driver

    wait = WebDriverWait(driver, 20)
    wait.until(EC.presence_of_element_located((select_type, element)))


@TestStep(When)
def open_endpoint(self, endpoint):
    """Open the given endpoint."""

    driver = self.context.driver
    driver.get(endpoint)
