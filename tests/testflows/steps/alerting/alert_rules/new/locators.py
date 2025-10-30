from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for alerting page

    @property
    def new_alert_rule_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR, f'[data-testid="create-alert-rule-button"]'
        )

    @property
    def alert_name_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR, f'[data-testid="data-testid alert-rule name-field"]'
        )

    @property
    def go_to_query_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//button[.//text()='Go to Query']")

    @property
    def database_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f'//*[./text()="FROM"]/..//..//input[contains(@id, "react-select")]',
        )

    @property
    def table_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f'//*[@data-testid="table-select"]/..//input[contains(@id, "react-select")]',
        )

    @property
    def column_timestamp_type_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f'//*[./text()="Column timestamp type"]/..//..//input[contains(@id, "react-select")]',
        )

    @property
    def timestamp_column_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f'//*[./text()="Timestamp Column"]/..//..//input[contains(@id, "react-select")]',
        )

    @property
    def date_column_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f'//*[./text()="Date column"]/..//..//input[contains(@id, "react-select")]',
        )

    @property
    def run_query_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//button[.//text()='Run Query']")

    def input_query(self, query_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//div[contains(@id, '{query_name}') and @class=query-editor-row]//div[@class='view-lines monaco-mouse-cursor-text']",
        )

    def expression(self, expression_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH, f"//div[./header//text()='{expression_name}']"
        )

    def remove_expression_button(self, expression_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//div[./header//text()='{expression_name}']//button[@aria-label='Remove expression']",
        )

    def expression_input(self, expression_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//div[./header//text()='{expression_name}']//input[contains(@id, 'react-select')]",
        )

    def expression_input_param(self, expression_name, param_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//div[./header//text()='{expression_name}']//label[text()={param_name}]/../input[contains(@id, 'react-select')]",
        )

    @property
    def add_expression_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH, f"//button[./span/text()='Add expression']"
        )

    def add_expression_type_button(self, expression_type):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//*[id='grafana-portal-container']//button//span[text()='{expression_type}']",
        )

    def expression_dropdown(self, expression_name, dropdown_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//div/header//div[text()='{expression_name}']/../../../../..//label[text()='{dropdown_name}']/../div",
        )

    @property
    def expression_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//div[@data-testid='data-testid alert-rule step-2']//input[contains(@class,'input-input') and @type='number']",
        )

    def expression_value_range_condition(self, expression_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//div/header//div[text()='{expression_name}']/../../../../..//button[contains(@class,'toolbar-button')]",
        )

    def expression_menu_item(self, expression_name, menu_item_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//div/header//div[text()='{expression_name}']/../../../../..//button[@aria-label='{menu_item_name}']",
        )

    def expression_toggle(self, expression_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//div/header//div[text()='{expression_name}']/../../../../..//label[contains(@for,'switch')]",
        )

    @property
    def preview_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"[data-testid='data-testid alert-rule preview-button']",
        )

    @property
    def folder_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR, f"[data-testid='data-testid folder-picker-input']"
        )

    @property
    def new_folder_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH, f"//*[./text()='New folder']/../../button"
        )

    @property
    def new_folder_name_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//*[@data-testid='data-testid alert-rule name-folder-name-field']",
        )

    @property
    def new_folder_create_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH,
            f"//*[@data-testid='data-testid alert-rule name-folder-name-create-button']",
        )

    @property
    def new_evaluation_group_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"[data-testid='data-testid alert-rule new-evaluation-group-button']",
        )

    @property
    def new_evaluation_group_name_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"[data-testid='data-testid alert-rule new-evaluation-group-name']",
        )

    @property
    def new_evaluation_group_interval_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"[data-testid='data-testid alert-rule new-evaluation-group-interval']",
        )

    @property
    def new_evaluation_group_create_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.CSS_SELECTOR,
            f"[data-testid='data-testid alert-rule new-evaluation-group-create-button']",
        )

    @property
    def pending_period_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[id='eval-for-input']")

    @property
    def contact_point_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH, f"//div[@data-testid='contact-point-picker']//input"
        )

    @property
    def save_rule_and_exit_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(
            SelectBy.XPATH, f"//button[@data-testid='save-rule' and contains(normalize-space(.), 'Save')]"
        )


locators = Locators()
