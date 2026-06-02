from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for login page
    @property
    def add_new_datasource_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//a[normalize-space()='Add new data source']")


locators = Locators()
