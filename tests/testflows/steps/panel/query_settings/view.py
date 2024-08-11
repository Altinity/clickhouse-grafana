from testflows.core import *
from testflows.asserts import error

from steps.delay import delay
from steps.panel.query_settings.locators import locators

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui


@TestStep(When)
def click_go_to_query_button(self, query_name):
    """Click Go to Query button."""

    locators.go_to_query_button(query_name=query_name).click()


@TestStep(When)
def enter_database(self, database, query_name):
    """Enter Database."""

    locators.database_dropdown(query_name=query_name).click()
    locators.database_dropdown(query_name=query_name).send_keys(database)
    locators.database_dropdown(query_name=query_name).send_keys(Keys.ENTER)


@TestStep(When)
def enter_table(self, table, query_name):
    """Enter Table."""

    locators.table_dropdown(query_name=query_name).click()
    locators.table_dropdown(query_name=query_name).send_keys(table)
    locators.table_dropdown(query_name=query_name).send_keys(Keys.ENTER)


@TestStep(When)
def enter_column_timestamp_type(self, column_timestamp_type, query_name):
    """Enter Column timestamp type."""

    locators.column_timestamp_type_dropdown(query_name=query_name).click()
    locators.column_timestamp_type_dropdown(query_name=query_name).send_keys(column_timestamp_type)
    locators.column_timestamp_type_dropdown(query_name=query_name).send_keys(Keys.ENTER)


@TestStep(When)
def enter_timestamp_column(self, timestamp_column, query_name):
    """Enter Timestamp Column."""

    locators.timestamp_column_dropdown(query_name=query_name).click()
    locators.timestamp_column_dropdown(query_name=query_name).send_keys(timestamp_column)
    locators.timestamp_column_dropdown(query_name=query_name).send_keys(Keys.ENTER)


@TestStep(When)
def enter_date_column(self, date_column, query_name):
    """Enter Date Column."""

    locators.date_column_dropdown(query_name=query_name).click()
    locators.date_column_dropdown(query_name=query_name).send_keys(date_column)
    locators.date_column_dropdown(query_name=query_name).send_keys(Keys.ENTER)
