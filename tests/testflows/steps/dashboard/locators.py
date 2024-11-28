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



    def save_dashboard(self, grafana_version):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            return driver.find_element(SelectBy.CSS_SELECTOR, f"[aria-label='Save dashboard']")
        else:
            return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Save dashboard button']")

    def save_dashboard_title(self, grafana_version):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            return driver.find_element(SelectBy.CSS_SELECTOR, f"[class ='css-8tk2dk-input-input']")
        else:
            return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='Save dashboard title field']")

    def save_dashboard_button(self, grafana_version):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            return driver.find_element(SelectBy.CSS_SELECTOR, f"[class ='css-td06pi-button']")
        else:
            return driver.find_element(SelectBy.CSS_SELECTOR,
                                       f"[data-testid='data-testid Save dashboard drawer button']")

    @property
    def edit_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Edit dashboard button']")

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
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Dashboard settings']")
    
    @property
    def variables_tab(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Tab Variables']")
    
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
    def variable_type_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"//input[contains(@id, 'variable-select-input-Select variable type')]")

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

    @property
    def exit_edit_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Exit edit mode button']")

    @property
    def discard_changes_confirmation_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[data-testid='data-testid Confirm Modal Danger Button']")

locators = Locators()
