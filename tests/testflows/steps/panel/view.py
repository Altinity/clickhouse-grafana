from testflows.core import *
from testflows.asserts import error

from steps.delay import delay
from steps.panel.locators import locators
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui


@TestStep(When)
def wait_fill_actual_toggle(self):
    """Wait Fill/Actual toggle to be clickable."""

    ui.wait_for_element_to_be_clickable(
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

    ui.wait_for_element_to_be_present(
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
    ui.wait_for_element_to_be_present(
        select_type=SelectBy.CSS_SELECTOR, element=f"[class='view-lines monaco-mouse-cursor-text']"
    )


@TestStep(When)
def select_input_query(self):
    """Select input query using triple click on textarea."""

    ActionChains(self.context.driver).double_click(locators.sql_editor_input).click(locators.sql_editor_input).perform()


@TestStep(When)
def clear_panel_title(self):
    """Clear panel title."""
    locators.panel_title_textfield.clear()


@TestStep(When)
def enter_panel_title(self, panel_title):
    """Enter panel title."""
    locators.panel_title_textfield.send_keys(panel_title)


@TestStep(When)
def change_panel_title(self, panel_title):
    """Change panel title"""
    with By("clearing panel title"):
        clear_panel_title()

    with And("entering new panel title"):
        enter_panel_title(panel_title=panel_title)


@TestStep(When)
def change_repeat_by_variable_option(self, variable_name):
    """Change repeat by variable option."""

    locators.repeat_by_variable_dropdown.send_keys(variable_name)


@TestStep(When)
def enter_sql_editor_input(self, query):
    """Enter SQL request into sql editor input field."""

    with By("waiting SQL editor"):
        wait_sql_editor_input()

    with By("selecting input string"):
        select_input_query()

    with By("entering request"):
        locators.input_in_sql_editor.send_keys(query)


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

    ui.wait_for_element_to_be_visible(
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


@TestStep(When)
def double_click_on_visualization(self):
    """Double-click on visualization to change time range"""

    ActionChains(self.context.driver).double_click(locators.visualization).click(locators.visualization).perform()


@TestStep(When)
def wait_datasource_in_datasource_dropdown(self, datasource_name):
    """Wait panel menu button for panel."""

    ui.wait_for_element_to_be_clickable(
        select_type=SelectBy.XPATH, element=f"//div[@data-testid='data-source-card' and .//text()='{datasource_name}']"
    )


@TestStep(When)
def select_datasource_in_panel_view(self, datasource_name):
    """Select datasource in datasource dropdown."""
    with By("clicking datasource dropdown"):
        click_select_datasource_button()
    with By("waiting datasource in datasource dropdown"):
        wait_datasource_in_datasource_dropdown(datasource_name=datasource_name)
    with delay():
        with By("selecting datasource in dropdown"):
            click_datasource_in_select_datasource_dropdown(datasource_name=datasource_name)


@TestStep(Then)
def check_panel_error_exists(self):
    """Check panel error exists."""
    with By("checking error"):
        try:
            ui.wait_for_element_to_be_visible(
                select_type=SelectBy.CSS_SELECTOR,
                element="[data-testid='data-testid Panel status error']"
            )
            return True
        except:
            return False


@TestStep(When)
def click_inspect_query_button(self):
    """Click inspect query button."""

    locators.query_inspector_button.click()


@TestStep(When)
def click_inspect_query_refresh_button(self):
    """Click inspect query button."""

    locators.query_inspector_refresh_button.click()


@TestStep(When)
def get_query_inspector_url_text(self):
    """Get url text from query inspector."""

    with By("getting url from query inspector"):
        return locators.query_inspector_url.text


@TestStep(Then)
def check_query_inspector_request(self, headers):
    """Check url in query inspector."""

    with By("opening query inspector"):
        with delay():
            click_inspect_query_button()

    with By("clicking refresh button in query inspector"):
        with delay():
            click_inspect_query_refresh_button()

    with By("checking url contains necessary headers"):
        for header in headers:
            with By(f"checking url contains {header} header"):
                assert header in get_query_inspector_url_text(), error()
