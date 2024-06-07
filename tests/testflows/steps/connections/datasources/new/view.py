import time

from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from steps.ui import *
from steps.delay import delay
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By as SelectBy
from selenium.common.exceptions import NoSuchElementException
from steps.connections.datasources.new.locators import locators


@TestStep(When)
def open_add_new_datasource_endpoint(self, endpoint=None):
    """Open /connections/datasources/new."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}connections/datasources/new"

    open_endpoint(endpoint=endpoint)


@TestStep(When)
def click_new_altinity_plugin_datasource(self):
    """Click new Altinity plugin for ClickHouse."""

    locators.new_altinity_plugin_datasource.click()
