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


locators = Locators()
