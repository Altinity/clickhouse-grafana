from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for legacy alerting page

    @property
    def create_alert_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Call to action button Create Alert']")

    @property
    def name_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//alert-tab//input[@ng-model='ctrl.alert.name']")

    @property
    def evaluate_every_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//alert-tab//input[@ng-blur='ctrl.checkFrequency()']")

    @property
    def for_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//alert-tab//input[@ng-model='ctrl.alert.for']")

    @property
    def options_dropdown(self):
        """ IS ABOVE, IS BELOW, IS OUTSIDE RANGE, IS WITHIN RANGE, HAS NO VALUE"""
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//alert-tab//metric-segment//a[@ng-class='segment.cssClass']")

    @property
    def options_textfield(self):
        """ IS ABOVE, IS BELOW, IS OUTSIDE RANGE, IS WITHIN RANGE, HAS NO VALUE"""
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//alert-tab//metric-segment//input")

    def input_textfield(self, param_number):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"//alert-tab//input[@ng-model='conditionModel.evaluator.params[{param_number}]']")

    @property
    def delete_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"//alert-tab//button[//text()='Delete']")

    @property
    def delete_confirmation_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR,
                                   "[data-testid='data-testid Confirm Modal Danger Button']")

    @property
    def test_rule_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   "//alert-tab//button[//text()='Test rule']")

    @property
    def close_modal_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   "//div/button[@aria-label='Close']")

    @property
    def state_history_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   "//alert-tab//button[//text()='State history']")


    def reduce_function_dropdown(self, condition_num=0):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//div[@class='gf-form-group'][{condition_num}]//a[@class='query-part-name pointer dropdown-toggle']")


    def reduce_function_in_dropdown(self, reduce_function_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@ng-click='triggerPartAction(action)' and //text()={reduce_function_name}]")

    def reduce_function_param(self, param_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@class='graphite-func-param-link pointer' and //text()={param_name}]")

    def reduce_function_param_input(self, param_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@ng-click='triggerPartAction(action)' and //text()={param_name}]//input")

    @property
    def add_condition_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@ng-click='triggerPartAction(action)']")

    def remove_condition_button(self, condition_number):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@ng-click='triggerPartAction(action)' and //text()={condition_number}]//input")

    @property
    def add_condition_query(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@class='pointer dropdown-toggle' and //icon]")

    @property
    def no_data_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@ng-click='triggerPartAction(action)' and //text()='A']//input")

    @property
    def error_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@class='pointer dropdown-toggle' and //icon]")

    @property
    def message_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//alert-tab//button[//text()='State history']")

    def tag_name_textfield(self, tag_number):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@class='pointer dropdown-toggle' and //icon][{tag_number}]")


    def tag_value_textfield(self, tag_number):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@class='pointer dropdown-toggle' and //icon][{tag_number}]")

    @property
    def add_tag_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@class='pointer dropdown-toggle' and //icon]")

    @property
    def send_to_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@class='pointer dropdown-toggle' and //icon]")

    @property
    def send_to_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f"//a[@class='pointer dropdown-toggle' and //icon]")


locators = Locators()
