import time

from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from steps.ui import *
from steps.plugins.locators import locators


@TestStep(When)
def open_plugins_endpoint(self, endpoint=None):
    """Open plugins view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}plugins"

    open_endpoint(endpoint=endpoint)


@TestStep(When)
def open_grafana_plugin_endpoint(self, endpoint=None):
    """Open plugins view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}plugins/vertamedia-clickhouse-datasource"

    open_endpoint(endpoint=endpoint)