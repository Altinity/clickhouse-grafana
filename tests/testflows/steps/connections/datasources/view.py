from testflows.core import *

from steps.connections.datasources.locators import locators

import steps.ui as ui


@TestStep(When)
def open_connections_datasources_endpoint(self, endpoint=None):
    """Open /connections/datasources view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}connections/datasources"

    ui.open_endpoint(endpoint=endpoint)


@TestStep(When)
def click_datasource_in_datasources_view(self, datasource_name):
    """Click datasource in datasources view."""

    locators.datasource(datasource_name=datasource_name).click()
