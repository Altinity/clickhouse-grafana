from testflows.core import *
from testflows.asserts import error

import steps.ui as ui
from steps.delay import delay
from steps.panel.query_options.locators import locators

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By as SelectBy


@TestStep(When)
def click_query_options_dropdown(self):
    """Click query options dropdown."""

    locators.query_options_dropdown.click()


@TestStep(When)
def enter_max_data_points(self, max_data_points):
    """Enter max data points."""

    locators.max_data_points_textfield.clear()
    locators.max_data_points_textfield.send_keys(max_data_points)
    locators.max_data_points_textfield.send_keys(Keys.ENTER)


@TestStep(When)
def enter_min_interval(self, min_interval):
    """Enter min interval."""

    locators.min_interval_textfield.clear()
    locators.min_interval_textfield.send_keys(min_interval)
    locators.min_interval_textfield.send_keys(Keys.ENTER)


@TestStep(When)
def enter_relative_time(self, relative_time):
    """Enter relative time."""

    locators.relative_time_textfield.clear()
    locators.relative_time_textfield.send_keys(Keys.BACK_SPACE)
    locators.relative_time_textfield.send_keys(Keys.BACK_SPACE)
    locators.relative_time_textfield.send_keys(relative_time)
    locators.relative_time_textfield.send_keys(Keys.ENTER)


@TestStep(When)
def enter_time_shift(self, time_shift):
    """Enter time shift time."""

    locators.time_shift_textfield.clear()
    locators.time_shift_textfield.send_keys(Keys.BACK_SPACE)
    locators.time_shift_textfield.send_keys(Keys.BACK_SPACE)
    locators.time_shift_textfield.send_keys(time_shift)
    locators.time_shift_textfield.send_keys(Keys.ENTER)


@TestStep(When)
def get_interval_value(self):
    """Get Interval value."""

    return locators.interval_field.text


@TestStep(When)
def click_hide_time_info_toggle(self):
    """Click Hide time info toggle."""

    locators.hide_time_info_toggle.click()


@TestStep(When)
def get_max_data_points_value(self):
    """Get Max data points value."""

    return locators.max_data_points_textfield.get_attribute('value')


@TestStep(When)
def get_min_interval_value(self):
    """Get Min interval value."""

    return locators.min_interval_textfield.get_attribute('value')


@TestStep(When)
def get_relative_time_value(self):
    """Get Relative time value."""

    return locators.relative_time_textfield.get_attribute('value')


@TestStep(When)
def get_time_shift_value(self):
    """Get Time shift value."""

    return locators.time_shift_textfield.get_attribute('value')


@TestStep(When)
def get_max_data_points_default(self):
    """Get Max data points default."""

    return locators.max_data_points_textfield.get_attribute('placeholder')


@TestStep(When)
def get_min_interval_default(self):
    """Get Min interval default."""

    return locators.min_interval_textfield.get_attribute('placeholder')


@TestStep(When)
def get_relative_time_default(self):
    """Get Relative time default."""

    return locators.relative_time_textfield.get_attribute('placeholder')


@TestStep(When)
def get_time_shift_default(self):
    """Get Time shift default."""

    return locators.time_shift_textfield.get_attribute('placeholder')


@TestStep(Then)
def check_relative_time_info_exists(self):
    """Check that relative time info exists."""
    with By(f"checking relative time info text is displayed"):
        try:
            ui.wait_for_element_to_be_present(
                select_type=SelectBy.XPATH,
                element=f'//*[@data-testid="title-items-container"]//*[contains(@class, "panel-header-item")]'
            )
            return True
        except:
            return False


@TestStep(Then)
def check_time_shift_info_exists(self):
    """Check that time shift info exists."""
    with By(f"checking shift info text is displayed"):
        try:
            ui.wait_for_element_to_be_present(
                select_type=SelectBy.XPATH,
                element=f'//*[@data-testid="title-items-container"]//*[contains(@class, "panel-header-item")]'
            )
            return True
        except:
            return False
