import time

from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from steps.ui import *
from steps.delay import delay
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By as SelectBy
from steps.connections.datasources.locators import locators
from selenium.common.exceptions import NoSuchElementException


@TestStep(When)
def open_connections_datasources_endpoint(self, endpoint=None):
    """Open /connections/datasources view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}connections/datasources"

    open_endpoint(endpoint=endpoint)


@TestStep(When)
def click_datasource_in_datasources_view(self, datasource_name):
    """Click datasource in datasources view."""

    locators.datasource(datasource_name=datasource_name).click()