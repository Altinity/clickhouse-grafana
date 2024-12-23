from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for panel page

    @property
    def query_options_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//button[@aria-label="Expand query row" or @aria-label="Collapse query row"]')

    @property
    def max_data_points_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@class="gf-form" and .//text()="Max data points"]//input')

    @property
    def interval_field(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@class="gf-form" and .//text()="Interval"]/label[@class="gf-form-label width-6"]')

    @property
    def min_interval_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[@class="gf-form" and .//text()="Min interval"]//input')

    @property
    def relative_time_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@class="gf-form" and .//text()="Relative time"]//input')

    @property
    def time_shift_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@class="gf-form" and .//text()="Time shift"]//input')

    @property
    def hide_time_info_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@class,"InlineFieldRow") and .//text()="Hide time info"]//label[@aria-label="Toggle switch"]')

    @property
    def relative_time_info(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@data-testid="title-items-container"]//*[contains(@class, "panel-header-item")]')

    @property
    def timeshift_info(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@data-testid="title-items-container"]//*[contains(@class, "panel-header-item")]')


locators = Locators()
