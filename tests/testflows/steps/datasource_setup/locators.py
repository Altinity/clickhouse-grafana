from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for datasource setup page

    @property
    def name_field(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Data source settings page name input field']")

    @property
    def url_field(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Datasource HTTP settings url']")

    @property
    def save_and_test_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR,
                                   "[data-testid='data-testid Data source settings page Save and Test button']")

    @property
    def alert_success(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR,
                                   "[data-testid='data-testid Alert success']")

    @property
    def delete_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR,
                                   "[data-testid='Data source settings page Delete button']")

    @property
    def confirm_delete_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR,
                                   "[data-testid='data-testid Confirm Modal Danger Button']")

locators = Locators()
