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


def _card_has_default_badge(driver, datasource_name):
    """True when the datasource list card carries a standalone default badge.

    The badge position varies between Grafana versions (a fixed two-levels-up
    card wrapper no longer contains it on 13.1), so walk the link's ancestors
    while they still hold a single datasource card."""
    return bool(driver.execute_script(
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


@TestStep(When)
def check_datasource_is_default(self, datasource_name):
    """Check that datasource marked as default."""
    import time

    with By("opening datasources endpoint"):
        open_connections_datasources_endpoint()

    with By("checking datasource is default"):
        # poll briefly: the Make default confirmation commits asynchronously
        driver = self.context.driver
        for _ in range(5):
            if _card_has_default_badge(driver, datasource_name):
                return True
            time.sleep(2)
            driver.refresh()
            time.sleep(2)
        return _card_has_default_badge(driver, datasource_name)