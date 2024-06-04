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

    def select_datasource(self, datasource_number):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"/html/body/div[1]/div[2]/div/div/div[2]/div/div[1]/div[1]/div/div[{datasource_number}]")

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
        return driver.find_element(SelectBy.CSS_SELECTOR, "[id='css-1nmqu8c-input-wrapper css-1age63q']")
    

locators = Locators()
