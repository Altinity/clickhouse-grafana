from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for dashboard page

    def panel(self, panel_name):

        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Panel header {panel_name}']")

    def menu_button_for_panel(self, panel_name):

        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Panel menu {panel_name}']")

    def edit_button_for_panel(self):

        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Panel menu item Edit']")

    @property
    def save_dashboard(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[aria-label='Save dashboard']")

    @property
    def save_dashboard_title(self):

        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[class ='css-8tk2dk-input-input']")

    @property
    def save_dashboard_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[class ='css-td06pi-button']")

    @property
    def add_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Add button']")

    @property
    def add_visualization(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Add new visualization menu item']")

    @property
    def dashboard_settings_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[aria-label='Dashboard settings']")
    
    @property
    def variables_tab(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[aria-label='Tab Variables']")
    
    @property
    def add_variable_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Call to action button Add variable']")
    
    @property
    def query_field_for_variable(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Variable editor Form Default Variable Query Editor textarea']")
    
    @property
    def run_variable_query_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Variable editor Run Query button']")
    
    @property
    def apply_variable_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Variable editor Apply button']")
    
    @property
    def include_all_options_checkbox(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Variable editor Form IncludeAll switch']")       

    @property
    def select_data_source_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Select a data source']")

    @property
    def time_range_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid TimePicker Open Button']")

    @property
    def time_range_from_field(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Time Range from field']")

    @property
    def time_range_to_field(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Time Range to field']")

    @property
    def time_range_apply_field(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid TimePicker submit button']")

    @property
    def visualization(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[class='css-kuoxoh-panel-content']")

    @property
    def green_alert_for_panel(self):
      driver: WebDriver = current().context.driver
      return driver.find_element(SelectBy.XPATH, f"//path[contains(@d,'M12')]")

    @property
    def red_alert_for_panel(self):
      driver: WebDriver = current().context.driver
      return driver.find_element(SelectBy.XPATH, f"//path[contains(@d,'M18.17')]")

    @property
    def alert_for_panel(self):
      driver: WebDriver = current().context.driver
      return driver.find_element(SelectBy.XPATH, f"//span[contains(@class,'panel-header-item')]")


locators = Locators()
