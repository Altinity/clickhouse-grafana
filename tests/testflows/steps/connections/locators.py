from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for connections page
    class Datasource:

        @property
        def clickhouse(self):
            driver: WebDriver = current().context.driver
            return driver.find_element(SelectBy.XPATH, "/html/body/div/div[1]/div/main/div/div[2]/div[3]/div/div[1]/div/div[2]/ul/li[1]/div")

        @property
        def clickhouse_direct(self):
            driver: WebDriver = current().context.driver
            return driver.find_element(SelectBy.XPATH, "/html/body/div/div[1]/div/main/div/div[2]/div[3]/div/div[1]/div/div[2]/ul/li[2]/div")


locators = Locators()
