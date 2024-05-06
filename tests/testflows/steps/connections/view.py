import time

from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from steps.ui import *
from steps.dashboard.locators import locators
from steps.delay import delay
from selenium.webdriver import ActionChains
from selenium.common.exceptions import NoSuchElementException


@TestStep(When)
def open_connections_datasources_endpoint(self, endpoint=None):
    """Open /connections/datasources view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}connections/datasources"

    open_endpoint(endpoint=endpoint)