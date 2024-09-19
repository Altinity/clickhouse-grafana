from testflows.core import *
from testflows.asserts import error

from steps.delay import delay
from steps.alerting.alert_rules_legacy.new.locators import locators
from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui


@TestStep(When)
def click_create_alert_button(self):
  """Click create alert button."""

  locators.create_alert_button.click()


@TestStep(When)
def enter_name(self, alert_name):
  """Enter name into name textfield."""

  locators.name_textfield.clear()
  locators.name_textfield.send_keys(alert_name)
  locators.name_textfield.send_keys(Keys.ENTER)


@TestStep(When)
def enter_evaluate_every(self, evaluate_every):
  """Enter evaluate every into evaluate every textfield."""

  locators.evaluate_every_textfield.clear()
  locators.evaluate_every_textfield.send_keys(evaluate_every)
  locators.evaluate_every_textfield.send_keys(Keys.ENTER)


@TestStep(When)
def enter_for(self, evaluate_for):
  """Enter for into for textfield."""

  locators.for_textfield.clear()
  locators.for_textfield.send_keys(evaluate_for)
  locators.for_textfield.send_keys(Keys.ENTER)


@TestStep(When)
def enter_options(self, option):
  """Enter evaluate option."""

  locators.options_dropdown.click()
  locators.options_textfield.send_keys(option)
  locators.options_textfield.send_keys(Keys.ENTER)


@TestStep(When)
def enter_input(self, param_number, param_value):
  """Enter evaluate param."""

  locators.input_textfield(param_number=param_number).clear()
  locators.input_textfield(param_number=param_number).send_keys(param_value)
  locators.input_textfield(param_number=param_number).send_keys(Keys.ENTER)


@TestStep(When)
def click_delete_alert_button(self):
  """Click delete alert button."""

  locators.delete_button.click()


@TestStep(When)
def click_confirm_delete_alert_button(self):
  """Click delete confirmation alert button."""

  locators.delete_confirmation_button.click()


@TestStep(When)
def delete_alert(self):
  """Delete alert."""

  with By("clicking delete alert button"):
    with delay():
      click_delete_alert_button()

  with And("clicking delete in confirmation modal"):
    with delay():
      click_confirm_delete_alert_button()


@TestStep(When)
def click_test_rule_button(self):
  """Click test rule button."""

  locators.test_rule_button.click()


@TestStep(When)
def click_state_history_button(self):
  """Click state history button."""

  locators.state_history_button.click()


@TestStep(When)
def close_modal_dialog(self):
  """Close modal dialog."""

  locators.close_modal_button.click()


@TestStep(When)
def change_reduce_function(self, reduce_function, condition_num=0):
  """Change reduce function."""

  locators.reduce_function_dropdown(condition_num=condition_num).click()
  locators.reduce_function_in_dropdown(condition_num=condition_num, reduce_function_name=reduce_function).click()


@TestStep(When)
def change_reduce_function_param(self, param_name, new_param_name):
  """Change reduce function param."""

  locators.reduce_function_param(param_name=param_name).click()
  locators.reduce_function_param_input(param_name=param_name).send_keys(new_param_name)


@TestStep(When)
def click_add_condition_button(self):
  """Click add condition button"""

  locators.add_condition_button.click()


@TestStep(When)
def click_remove_condition_button(self, condition_number):
  """Click add condition button"""

  locators.remove_condition_button(condition_number=condition_number).click()


@TestStep(When)
def enter_condition_query(self, query):
  """Enter condition query."""

  locators.add_condition_query.click()
  locators.add_condition_query.send_keys(query)
  locators.add_condition_query.send_keys(Keys.ENTER)


@TestStep(When)
def click_no_data_dropdown(self):
  """Click no data dropdown."""

  locators.no_data_dropdown.click()
