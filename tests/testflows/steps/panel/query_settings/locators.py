from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


def _is_legacy(grafana_version):
    """Grafana <= 10 uses react-select inputs and data-rbd draggable ids."""
    return (grafana_version is not None) and (int(grafana_version.split(".")[0]) <= 10)


class Locators:
    # Locators for panel page

    def go_to_query_button(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if _is_legacy(grafana_version):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f"//*[contains(@{search_class}, '{query_name}')]//button[.//text()='Go to Query']")

    def database_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if _is_legacy(grafana_version):
            return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[./text()="FROM"]/..//..//input[contains(@id, "react-select")]')
        # modern Grafana: the plugin renders its own data-testid on the select input
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rfd-draggable-id, "{query_name}")]//input[@data-testid="database-select-input"]')

    def table_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if _is_legacy(grafana_version):
            return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[@data-testid="table-select"]/..//input[contains(@id, "react-select")]')
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rfd-draggable-id, "{query_name}")]//input[@data-testid="table-select-input"]')

    def column_timestamp_type_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if _is_legacy(grafana_version):
            return driver.find_element(SelectBy.XPATH,
                                       f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[./text()="Column timestamp type"]/..//..//input[contains(@id, "react-select")]')
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rfd-draggable-id, "{query_name}")]//input[@data-testid="timestamp-type-select-input"]')

    def timestamp_column_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if _is_legacy(grafana_version):
            return driver.find_element(SelectBy.XPATH,
                                       f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[./text()="Timestamp Column"]/..//..//input[contains(@id, "react-select")]')
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rfd-draggable-id, "{query_name}")]//input[@data-testid="timestamp-column-select-input"]')

    def date_column_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if _is_legacy(grafana_version):
            return driver.find_element(SelectBy.XPATH,
                                       f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[./text()="Date column"]/..//..//input[contains(@id, "react-select")]')
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rfd-draggable-id, "{query_name}")]//input[@data-testid="date-column-select-input"]')


locators = Locators()
