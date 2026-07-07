from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for connections/datasources/new page

    @property
    def new_altinity_plugin_datasource(self):
        driver: WebDriver = current().context.driver
        # Grafana migrated this control from aria-label to data-testid; keep both
        # plus text-anchored fallbacks for card markup variations
        return driver.find_element(
            SelectBy.XPATH,
            "//*[@data-testid='data-testid Add new data source Altinity plugin for ClickHouse']"
            " | //*[@aria-label='Add new data source Altinity plugin for ClickHouse']"
            " | //button[.//text()='Altinity plugin for ClickHouse']"
            " | //a[.//text()='Altinity plugin for ClickHouse']",
        )


locators = Locators()
