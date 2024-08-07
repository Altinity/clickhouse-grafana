from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for panel page

    def go_to_query_button(self, query_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"//*[contains(@data-rbd-draggable-id, '{query_name}')]//button[.//text()='Go to Query']")

    def database_dropdown(self, query_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[./text()="FROM"]/..//..//input[contains(@id, "react-select")]')

    def table_dropdown(self, query_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[@data-testid="table-select"]/..//input[contains(@id, "react-select")]')

    def column_timestamp_type_dropdown(self, query_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[./text()="Column timestamp type"]/..//..//input[contains(@id, "react-select")]')

    def timestamp_column_dropdown(self, query_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[./text()="Timestamp Column"]/..//..//input[contains(@id, "react-select")]')

    def date_column_dropdown(self, query_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@data-rbd-draggable-id, "{query_name}")]//*[./text()="Date column"]/..//..//input[contains(@id, "react-select")]')


locators = Locators()