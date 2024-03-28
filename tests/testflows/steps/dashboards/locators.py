from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for dashboards page

    def dashboard(self, dashboard_name):

        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.LINK_TEXT, dashboard_name)

    @property
    def new_button(self):

        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[class ='css-td06pi-button']")

    @property
    def new_dashboard_button(self):

        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[class ='css-w9mao9']")

    def check_mark(self, dashboard_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"[data-testid='data-testid browse dashboards row {dashboard_name}'] [role='cell']"
        )

    @property
    def delete_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"[class='css-ttl745-button']"
        )

    @property
    def delete_confirmation_input(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"""[placeholder='Type "Delete" to confirm']"""
        )

    @property
    def delete_confirmation_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"[data-testid='data-testid Confirm Modal Danger Button']"
        )


locators = Locators()
