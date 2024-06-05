from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for connections page

    def data_source(self, num):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"//div[@class='css-1736fpx-page-content']/ul/li[{num}]/div")

locators = Locators()
