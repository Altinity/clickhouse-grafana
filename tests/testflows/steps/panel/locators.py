from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:

    @property
    def fill(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[id*='option-0-radiogroup']")

    @property
    def actual(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[id*='option-2-radiogroup']")

    @property
    def visualization(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[class ='css-1hy9z4n']")

    @property
    def select_datasource_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Select a data source']")

    def select_datasource(self, datasource_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[class='css-1cqw476']")

    @property
    def sql_editor_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[id*='option-sql']")

    @property
    def sql_editor_input(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[class='inputarea monaco-mouse-cursor-text']")

    @property
    def row_in_sql_editor(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[class='line-numbers lh-odd active-line-number']")


locators = Locators()
