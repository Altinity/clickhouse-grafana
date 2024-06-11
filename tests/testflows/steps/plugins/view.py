from testflows.core import *

import steps.ui as ui


@TestStep(When)
def open_plugins_endpoint(self, endpoint=None):
    """Open plugins view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}plugins"

    ui.open_endpoint(endpoint=endpoint)


@TestStep(When)
def open_grafana_plugin_endpoint(self, endpoint=None):
    """Open plugins view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}plugins/vertamedia-clickhouse-datasource"

    ui.open_endpoint(endpoint=endpoint)
