from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
  # Locators for alerting page

  @property
  def new_alert_rule_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="create-alert-rule-button"]')

  @property
  def go_to_query_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH, "//button[.//text()='Go to Query']")

  @property
  def run_query_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH, "//button[.//text()='Run Query']")

  def input_query(self, query_name):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH,
                               f"//div[contains(@id, '{query_name}') and @class=query-editor-row]//div[@class='view-lines monaco-mouse-cursor-text']")

  def expression(self, expression_name):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH, f"//div[./header//text()='{expression_name}']")

  def remove_expression_button(self, expression_name):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH, f"//div[./header//text()='{expression_name}']//button[@aria-label='Remove expression']")

  def expression_input(self, expression_name):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH,
                               f"//div[./header//text()='{expression_name}']//input[contains(@id, 'react-select')]")

  def expression_input_param(self, expression_name, param_name):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH,
                               f"//div[./header//text()='{expression_name}']//label[text()={param_name}]/../input[contains(@id, 'react-select')]")

  @property
  def add_expression_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH,
                               f"//button[./span/text()='Add expression']")

  @property
  def add_expression_reduce_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH,
                               f"//button[@data-role='menuitem' and @tabindex='0']")

  @property
  def add_expression_threshold_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH,
                               f"//button[./span/text()='Add expression']")

  @property
  def preview_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.CSS_SELECTOR,
                               f"[data-testid='data-testid alert-rule preview-button']")

  @property
  def new_folder_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.CSS_SELECTOR,
                               f"[data-testid='data-testid alert-rule preview-button']")

  @property
  def new_folder_name_textfield(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.CSS_SELECTOR,
                               f"[data-testid='data-testid alert-rule name-folder-name-field']")

  @property
  def new_folder_create_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.CSS_SELECTOR,
                               f"[data-testid='data-testid alert-rule name-folder-name-create-button']")

  @property
  def new_evaluation_group_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.CSS_SELECTOR,
                               f"[data-testid='data-testid alert-rule name-folder-name-create-button']")

  @property
  def new_evaluation_group_name_textfield(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.CSS_SELECTOR,
                               f"[data-testid='data-testid alert-rule new-evaluation-group-name']")

  @property
  def new_evaluation_group_interval_textfield(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.CSS_SELECTOR,
                               f"[data-testid='data-testid alert-rule new-evaluation-group-interval']")

  @property
  def new_evaluation_group_create_button(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.CSS_SELECTOR,
                               f"[data-testid='data-testid alert-rule new-evaluation-group-create-button']")

  @property
  def contact_point_textfield(self):
    driver: WebDriver = current().context.driver
    return driver.find_element(SelectBy.XPATH,
                               f"//div[@data-testid='contact-point-picker']//input")


locators = Locators()
