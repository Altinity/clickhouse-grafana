from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for panel page

    @property
    def query_options_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//div[@aria-label="Expand query row" or @aria-label="Collapse query row"]')

    @property
    def max_data_points_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@class="gf-form" and .//text()="Max data points"]/label[@class="gf-form-label width-6""]')

    @property
    def interval_field(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@class="gf-form" and .//text()="Interval"]/div[@data-testid="input-wrapper"]')

    @property
    def min_interval_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[@class="gf-form" and .//text()="Min interval"]/div[@data-testid="input-wrapper"]')

    @property
    def relative_time_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@class="gf-form" and .//text()="Relative time"]/div[@data-testid="input-wrapper"]')

    @property
    def time_shift_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@class="gf-form" and .//text()="Time shift"]/div[@data-testid="input-wrapper"]')

    @property
    def hide_time_info_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[@class="gf-form-inline align-items-center" and .//text()="Hide time info"]/input')


locators = Locators()
