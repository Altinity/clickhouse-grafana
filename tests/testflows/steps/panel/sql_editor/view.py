from testflows.core import *
from testflows.asserts import error

from steps.delay import delay
from steps.panel.sql_editor.locators import locators

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui


@TestStep(When)
def click_extrapolation_toggle(self, query_name):
    """Click extrapolation toggle."""

    locators.extrapolation_toggle(query_name=query_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def enter_step(self, step, query_name):
    """Enter step."""

    locators.step_textfield(query_name=query_name, grafana_version=self.context.grafana_version).clear()
    locators.step_textfield(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(step)
    locators.step_textfield(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def enter_resolution(self, resolution, query_name):
    """Enter resolution."""

    locators.resolution_dropdown(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(resolution)
    locators.resolution_dropdown(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def enter_format_as(self, format_as, query_name):
    """Enter format as."""

    locators.format_as_dropdown(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(format_as)
    locators.format_as_dropdown(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def click_add_metadata_toggle(self, query_name):
    """Click Add metadata toggle."""

    locators.add_metadata_toggle(query_name=query_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_skip_comments_toggle(self, query_name):
    """Click Skip Comments toggle."""

    locators.skip_comments_toggle(query_name=query_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def enter_round(self, round, query_name):
    """Enter Round."""

    locators.round_textfield(query_name=query_name, grafana_version=self.context.grafana_version).clear()
    locators.round_textfield(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(round)
    locators.round_textfield(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def click_show_help_button(self, query_name):
    """Click Show help button."""

    locators.show_help_button(query_name=query_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_show_generated_sql_button(self, query_name):
    """Click Show generated SQL button."""

    locators.show_generated_sql_button(query_name=query_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def get_reformatted_query(self, query_name):
    """Get reformatted query for sql query."""

    return locators.reformatted_query(query_name=query_name, grafana_version=self.context.grafana_version).text


@TestStep(When)
def get_time_from_in_seconds(self, query_name):
    """Get time_from in seconds from reformatted query."""

    reformatted_query = locators.reformatted_query(query_name=query_name, grafana_version=self.context.grafana_version).text
    return int(reformatted_query[reformatted_query.find(">= toDate(") + 10: reformatted_query.find(") AND EventDate <=")])


@TestStep(When)
def get_time_to_in_seconds(self, query_name):
    """Get time_to in seconds from reformatted query."""

    reformatted_query = locators.reformatted_query(query_name=query_name, grafana_version=self.context.grafana_version).text
    return int(reformatted_query[reformatted_query.find("<= toDate(") + 10: reformatted_query.find(") AND EventTime >=")])


@TestStep(When)
def get_help_text(self, query_name):
    """Get help for sql query."""

    return locators.help_macros(query_name=query_name, grafana_version=self.context.grafana_version).text + locators.help_functions(query_name=query_name, grafana_version=self.context.grafana_version).text


@TestStep(When)
def get_sql_editor_text(self, query_name):
    """Get SQL Editor query."""

    return locators.input_in_sql_editor(query_name=query_name, grafana_version=self.context.grafana_version).text


@TestStep(When)
def get_step_text(self, query_name):
    """Get SQL Editor step option."""

    return locators.step_textfield(query_name=query_name, grafana_version=self.context.grafana_version).get_attribute('value')


@TestStep(When)
def get_round_text(self, query_name):
    """Get SQL Editor step option."""

    return locators.round_textfield(query_name=query_name, grafana_version=self.context.grafana_version).get_attribute('value')