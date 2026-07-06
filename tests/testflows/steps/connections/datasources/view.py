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


@TestStep(When)
def check_datasource_is_default(self, datasource_name):
    """Check that datasource marked as default."""

    with By("opening datasources endpoint"):
        open_connections_datasources_endpoint()

    with By("checking datasource is default"):
        # The default badge position varies between Grafana versions (a fixed
        # two-levels-up card wrapper no longer contains it on 13.1). Walk the
        # link's ancestors while they still hold a single datasource card and
        # look for a standalone "default" word.
        return bool(self.context.driver.execute_script(
            """
            const name = arguments[0];
            const links = Array.from(document.querySelectorAll("a[href*='/datasources/edit/']"));
            const link = links.find(a => (a.textContent || '').trim() === name);
            if (!link) return false;
            let el = link.parentElement;
            while (el && el.querySelectorAll("a[href*='/datasources/edit/']").length <= 1) {
              if (/\\bdefault\\b/.test(el.innerText || '')) return true;
              el = el.parentElement;
            }
            return false;
            """,
            datasource_name,
        ))