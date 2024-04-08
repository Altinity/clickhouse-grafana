import time

from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from steps.ui import *
from steps.panel.locators import locators
# from steps.common import *
from selenium.webdriver import ActionChains

@TestStep(When)
def wait_fill_actual_toggle(self):
    """Wait Fill/Actual toggle to be clickable."""

    wait_for_element_to_be_clickable(
        select_type=SelectBy.CSS_SELECTOR, element="[data-testid='data-testid radio-button']"
    )


@TestStep(When)
def click_fill_toggle(self):
    """Click Fill toggle."""

    locators.fill.click()


@TestStep(When)
def click_actual_toggle(self):
    """Click Actual toggle."""

    locators.actual.click()


@TestStep(When)
def click_select_datasource_button(self):
    """Click select datasource button."""

    locators.select_datasource_button.click()


@TestStep(When)
def click_datasource_in_select_datasource_dropdown(self, datasource_name):
    """Click select datasource button."""

    locators.select_datasource(datasource_name=datasource_name).click()


@TestStep(When)
def click_sql_editor_toggle(self):
    """Click SQL editor toggle."""
    locators.sql_editor_toggle.click()


@TestStep(When)
def wait_sql_editor_toggle(self):
    """Wait SQL editor toggle to be loaded."""

    wait_for_element_to_be_present(
        select_type=SelectBy.CSS_SELECTOR, element=f"[id*='option-sql']"
    )


@TestStep(When)
def select_first_query_row(self):
    """Select first query row in SQL editor."""
    locators.row_in_sql_editor.click()


@TestStep(When)
def click_on_the_visualization(self):
    """Click on the visualization."""
    locators.visualization.click()


@TestStep(When)
def go_to_sql_editor(self):
    """Wait sql editor toggle and click it."""
    with By("waiting sql editor toggle"):
        wait_sql_editor_toggle()

    with By("clicking SQL Editor toggle"):
        click_sql_editor_toggle()


@TestStep(When)
def wait_sql_editor_input(self):
    """Wait SQL editor input field."""
    wait_for_element_to_be_present(
        select_type=SelectBy.CSS_SELECTOR, element=f"[class='view-lines monaco-mouse-cursor-text']"
    )

@TestStep(When)
def select_input_query(self):
    """Select input query using triple click on textarea."""

    ActionChains(self.context.driver).double_click(locators.sql_editor_input).click(locators.sql_editor_input).perform()


@TestStep(When)
def enter_sql_editor_input(self, request):
    """Enter SQL request into sql editor input field."""

    # note(self.context.driver.find_element(SelectBy.XPATH, '/html/body').text)
    with By("waiting SQL editor"):
        wait_sql_editor_input()

    with By("selecting input string"):
        select_input_query()

    with By("entering request"):
        locators.input_in_sql_editor.send_keys(request)


@TestStep(When)
def actual(self):
    """Wait Fill/Actual toggle and click actual."""

    with By("waiting actual toggle"):
        wait_fill_actual_toggle()

    with By("clicking actual toggle"):
        click_actual_toggle()


@TestStep(When)
def fill(self):
    """Wait Fill/Actual toggle and click fill."""

    with By("waiting fill toggle"):
        wait_fill_actual_toggle()

    with By("clicking fill toggle"):
        click_fill_toggle()


@TestStep(When)
def wait_visualization(self):
    """Wait visualization to be loaded."""

    wait_for_element_to_be_visible(
        select_type=SelectBy.CSS_SELECTOR, element=f"[class='css-1hy9z4n']"
    )


@TestStep(When)
def take_visualization_screenshot(self, screenshot_name):
    """Take screenshot for visualization."""

    locators.visualization.screenshot(f'./tests/testflows/screenshots/{screenshot_name}.png')


@TestStep(Then)
def take_screenshot_for_visualization(self, screenshot_name):
    with Then(f"I wait visualization to be loaded"):
        wait_visualization()

    with Then("I take screenshot"):
        take_visualization_screenshot(screenshot_name=screenshot_name)
