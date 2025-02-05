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
            SelectBy.XPATH,
            f"//*[@aria-label='Search results table']//span"
        )

    @property
    def delete_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//*[@data-testid='manage-actions']/button[span/text()='Delete']"
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

    @property
    def search_dashboard_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"[placeholder='Search for dashboards and folders']"
        )


locators = Locators()
