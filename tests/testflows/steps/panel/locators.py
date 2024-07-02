from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for panel page

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
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid panel content']")

    @property
    def select_datasource_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Select a data source']")

    def select_datasource(self, datasource_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"//div[@data-testid='data-source-card' and .//text()='{datasource_name}']")

    @property
    def sql_editor_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[id*='option-sql']")

    @property
    def sql_editor_input(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[class='view-lines monaco-mouse-cursor-text']")

    @property
    def input_in_sql_editor(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[class='inputarea monaco-mouse-cursor-text']")

    @property
    def panel_title_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[id='PanelFrameTitle']")
    
    @property
    def repeat_by_variable_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[id='repeat-by-variable-select']")

    @property
    def panel_error(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Panel status error']")

    @property
    def query_inspector_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[aria-label='Query inspector button']")

    @property
    def query_inspector_refresh_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[aria-label='Panel inspector Query refresh button']")

    @property
    def query_inspector_url(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//*[(@class='json-formatter-string' and "
                                                   "contains(text(), 'api')) or "
                                                   "(@class='json-formatter-string json-formatter-url' and "
                                                   "contains(text(), 'http'))]")


locators = Locators()
