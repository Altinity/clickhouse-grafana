from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for panel page

    def go_to_query_button(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f"//*[contains(@{search_class}, '{query_name}')]//button[.//text()='Go to Query']")

    def database_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="FROM"]/..//..//input[contains(@id, "react-select")]')

    def table_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//*[@data-testid="table-select"]/..//input[contains(@id, "react-select")]')

    def column_timestamp_type_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Column timestamp type"]/..//..//input[contains(@id, "react-select")]')

    def timestamp_column_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Timestamp Column"]/..//..//input[contains(@id, "react-select")]')

    def date_column_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Date column"]/..//..//input[contains(@id, "react-select")]')


locators = Locators()