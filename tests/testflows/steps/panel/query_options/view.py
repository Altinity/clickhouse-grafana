from testflows.core import *
from testflows.asserts import error

from steps.delay import delay
from steps.panel.query_options.locators import locators
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui


@TestStep(When)
def click_query_options_dropdown(self):
    """Click query options dropdown."""

    locators.query_options_dropdown.click()


@TestStep(When)
def enter_max_data_points(self, max_data_points):
    """Enter max data points."""

    locators.max_data_points_textfield.send_keys(max_data_points)


@TestStep(When)
def enter_min_interval(self, min_interval):
    """Enter min interval."""

    locators.min_interval_textfield.send_keys(min_interval)

@TestStep(When)
def enter_relative_time(self, relative_time):
    """Enter relative time."""

    locators.relative_time_textfield.send_keys(relative_time)


@TestStep(When)
def enter_time_shift(self, time_shift):
    """Enter time shift time."""

    locators.time_shift_textfield.send_keys(time_shift)


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
