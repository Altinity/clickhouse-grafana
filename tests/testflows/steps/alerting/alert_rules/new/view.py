from testflows.core import *
from testflows.asserts import error

from steps.delay import delay
from steps.alerting.alert_rules.new.locators import locators
from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui


@TestStep(When)
def click_new_alert_rule_button(self):
  """Click new alert rule button."""

  locators.new_alert_rule_button.click()


@TestStep(When)
def click_go_to_query_button(self):
  """Click go to query button."""

  locators.new_alert_rule_button.click()


@TestStep(When)
def click_run_query_button(self):
  """Click go to query button."""

  locators.new_alert_rule_button.click()


@TestStep(When)
def enter_query(self, query_name, query):
  """Enter query."""

  locators.input_query(query_name=query_name).send_keys(query)


@TestStep(When)
def click_remove_expression_button(self, expression_name):
  """Click remove expression button."""

  locators.remove_expression_button(expression_name=expression_name).click()


@TestStep(When)
def enter_expression_input(self, expression_name, expression_input):
  """Enter expression input."""

  locators.expression_input(expression_name=expression_name).send_keys(expression_input)


@TestStep(When)
def enter_expression_param(self, expression_name, param_name, param_value):
  """Enter parameters for expression."""

  locators.expression_input_param(expression_name=expression_name, param_name=param_name).send_keys(param_value)


@TestStep(When)
def click_add_expression_button(self):
  """Click add expression button."""

  locators.add_expression_button.click()


@TestStep(When)
def click_preview_button(self):
  """Click preview button."""

  locators.preview_button.click()


@TestStep(When)
def click_new_folder_button(self):
  """Click new folder button."""

  locators.new_folder_button.click()


@TestStep(When)
def enter_new_folder_name(self, folder_name):
  """Click new folder button."""

  locators.new_folder_name_textfield.send_keys(folder_name)


@TestStep(When)
def click_new_folder_create_button(self):
  """Click create button in create folder modal."""

  locators.new_folder_create_button.click()


@TestStep(When)
def click_new_evaluation_group_button(self):
  """Click new evaluation group button."""

  locators.new_evaluation_group_button.click()


@TestStep(When)
def click_new_evaluation_group_button(self):
  """Click new evaluation group button."""

  locators.new_evaluation_group_button.click()


@TestStep(When)
def enter_new_evaluation_group_name_textfield(self, group_name):
  """Enter new evaluation group name textfield."""

  locators.new_evaluation_group_name_textfield.send_keys(group_name)


@TestStep(When)
def enter_new_evaluation_group_interval_textfield(self, interval):
  """Enter new evaluation group interval textfield."""

  locators.new_evaluation_group_interval_textfield.send_keys(interval)


@TestStep(When)
def click_new_evaluation_group_create_button(self):
  """Click new evaluation group create button."""

  locators.new_evaluation_group_create_button.click()


@TestStep(When)
def enter_contact_point_textfield(self, contact_point):
  """Enter contact point textfield."""

  locators.contact_point_textfield.send_keys(contact_point)
