from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for connections/datasources page

    def datasource(self, datasource_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"//a[text()='{datasource_name}']")

    def datasource_card(self, datasource_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"//a[text()='{datasource_name}']/parent::*/parent::*")


locators = Locators()
