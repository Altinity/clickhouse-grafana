from testflows.core import *

from steps.delay import delay
from selenium.webdriver import ActionChains
from steps.dashboard.locators import locators
from selenium.webdriver.common.by import By as SelectBy
from selenium.common.exceptions import NoSuchElementException

import steps.ui as ui


@TestStep(When)
def wait_panel_menu_button(self, panel_name):
    """Wait panel menu button for panel."""

    ui.wait_for_element_to_be_present(
        select_type=SelectBy.CSS_SELECTOR, element=f"[data-testid='data-testid Panel menu {panel_name}']"
    )


@TestStep(When)
def click_menu_button_for_panel(self, panel_name):
    """Click menu button for panel."""

    locators.menu_button_for_panel(panel_name=panel_name).click()


@TestStep(When)
def move_cursor_to_menu_button(self, panel_name):
    """Move cursor to menu button, this makes menu button be visible."""

    ActionChains(self.context.driver).move_to_element(locators.menu_button_for_panel(panel_name=panel_name)).perform()


@TestStep(When)
def wait_edit_button_in_panel_menu(self):
    """Wait edit button in dropdown menu for panel."""

    ui.wait_for_element_to_be_clickable(
        select_type=SelectBy.CSS_SELECTOR, element="[data-testid='data-testid Panel menu item Edit']"
    )


@TestStep(When)
def click_edit_button(self):
    """Click edit button in dropdown menu for panel."""

    locators.edit_button_for_panel().click()


@TestStep(When)
def click_add_button(self):
    """Click add button."""
    locators.add_button.click()


@TestStep(When)
def click_add_visualization_button(self):
    """Click add visualization button in add dropdown."""
    locators.add_visualization.click()


@TestStep(When)
def open_dropdown_menu_for_panel(self, panel_name):
    """Open dropdown menu for panel."""

    with By(f"waiting panel menu for {panel_name} to be loaded"):
        wait_panel_menu_button(panel_name=panel_name)

    with And("moving cursor to menu button"):
        move_cursor_to_menu_button(panel_name=panel_name)

    with And("clicking menu button"):
        click_menu_button_for_panel(panel_name=panel_name)


@TestStep(When)
def edit_panel(self, panel_name):
    """Open dropdown menu for panel."""

    with By(f"waiting edit button for {panel_name}"):
        wait_edit_button_in_panel_menu()

    with By("clicking edit button"):
        click_edit_button()


@TestStep(When)
def wait_panel(self, panel_name):
    """Wait panel to be loaded."""
    ui.wait_for_element_to_be_visible(
        select_type=SelectBy.CSS_SELECTOR, element=f"[data-testid='data-testid Panel header {panel_name}']"
    )


@TestStep(When)
def take_panel_screenshot(self, panel_name, screenshot_name):
    """Take screenshot for panel."""
    locators.panel(panel_name=f'{panel_name}').screenshot(f'./screenshots/{screenshot_name}.png')


@TestStep(When)
def click_save_button(self):
    """Open saving menu for dashboard."""
    locators.save_dashboard.click()


@TestStep(When)
def change_title_for_dashboard(self, dashboard_name):
    """Change title for dashboard in saving menu."""
    locators.save_dashboard_title.clear()

    locators.save_dashboard_title.send_keys(dashboard_name)


@TestStep(When)
def click_save_dashboard_button(self):
    """Save dashboard."""
    locators.save_dashboard_button.click()


@TestStep(When)
def saving_dashboard(self, dashboard_name=None):
    """Save current dashboard"""
    with By("clicking save in dashboard view"):
        with delay():
            click_save_button()

    if not (dashboard_name is None):
        with By("entering dashboard name"):
            with delay():
                change_title_for_dashboard(dashboard_name=dashboard_name)

    with By("clicking save button"):
        with delay():
            click_save_dashboard_button()


@TestStep(When)
def open_panel(self, panel_name):
    """Open panel view for panel."""
    with delay():
        with When(f"I open dropdown menu for panel {panel_name}"):
            open_dropdown_menu_for_panel(panel_name=panel_name)

    with When("I open panel view"):
        edit_panel(panel_name=panel_name)


@TestStep(When)
def click_dahsboard_settings_button(self):
    """Click dashboard settings button."""
    locators.dashboard_settings_button.click()


@TestStep(When)
def click_variables_tab(self):
    """Click variables tab."""
    locators.variables_tab.click()


@TestStep(When)
def click_add_variable_button(self):
    """Click add variable button."""
    locators.add_variable_button.click()


@TestStep(When)
def enter_variable_query(self, query):
    """Enter variable query."""
    locators.query_field_for_variable.send_keys(query)


@TestStep(When)
def select_datasource(self, datasource_name):
    """Select datasource."""
    locators.select_data_source_dropdown.send_keys(datasource_name)


@TestStep(When)
def click_include_all_options_checkbox(self):
    """Click All option checkbox for variable setup."""
    locators.include_all_options_checkbox.click()


@TestStep(When)
def click_run_query_button(self):
    """Click run variable query button."""
    locators.run_variable_query_button.click()


@TestStep(When)
def click_apply_variable(self):
    """Click apply button in variable settings."""
    locators.apply_variable_button.click()


@TestStep(When)
def create_new_variable(self, query, datasource_name):
    """Create new variable."""

    with By("clicking dashboard settings button"):
        with delay():
            click_dahsboard_settings_button()

    with And("clicking variables tab"):
        click_variables_tab()

    with And("clicking add variable button"):
        with delay():
            click_add_variable_button()

    with And("entering variable query"):
        enter_variable_query(query=query)

    with And("clicking include all option checkbox"):
        with delay():
            click_include_all_options_checkbox()

    with And("selecting datasource"):
        select_datasource(datasource_name=datasource_name)

    with And("clicking run query"):
        with delay():
            click_run_query_button()

    with And("clicking apply variable"):
        click_apply_variable()


@TestStep(Then)
def check_panel_exists(self, panel_name):
    """Check dashboard contains panel."""
    with By("checking dashboard exists"):
        try:
            locators.panel(panel_name=panel_name)
            return True
        except NoSuchElementException:
            return False


@TestStep(Then)
def take_screenshot_for_panel(self, panel_name, screenshot_name):
    """Wait panel to be loaded and take screenshot."""
    with Then(f"I wait {panel_name} to be loaded"):
        wait_panel(panel_name=panel_name)

    with Then("I take screenshot"):
        take_panel_screenshot(panel_name=panel_name, screenshot_name=screenshot_name)


@TestStep(When)
def open_new_dashboard_endpoint(self, endpoint=None):
    """Open new dashboard view."""
    if endpoint is None:
        endpoint = f"{self.context.endpoint}dashboard/new"

    ui.open_endpoint(endpoint=endpoint)


@TestStep(When)
def add_visualization(self):
    """Add visualization for dashboard."""

    with delay():
        with By("Clicking add button"):
            click_add_button()

    with By("Clicking add visualization button"):
        click_add_visualization_button()


@TestStep(When)
def open_time_range_dropdown(self):
    """Open time range dropdown"""

    locators.time_range_dropdown.click()


@TestStep(When)
def enter_from_time(self, from_time):
    """Enter from field in time range dropdown."""

    locators.time_range_from_field.send_keys(from_time)


@TestStep(When)
def enter_to_time(self, to_time):
    """Enter to field in time range dropdown."""

    locators.time_range_to_field.send_keys(to_time)


@TestStep(When)
def time_range_apply_field(self):
    """Click Apply button in time range dropdown."""

    locators.time_range_apply_field.click()


@TestStep(When)
def change_time_range_selector_for_dashboard(from_time, to_time):
    """Change time range selector for dashboard"""
    with By("opening time range dropdown"):
        open_time_range_dropdown()

    with And("entering from_time"):
        enter_from_time(from_time=from_time)

    with And("entering to_time"):
        enter_to_time(to_time=to_time)

    with And("clicking on visualization to update it"):
        time_range_apply_field()


@TestStep(When)
def double_click_on_panel(self):
    """Double-click on panel to change time range"""

    ActionChains(self.context.driver).double_click(locators.visualization).click(locators.visualization).perform()


@TestStep(When)
def check_green_alert_for_panel(self):
    """Check that panel title contains green alert."""
    with By("checking green alert exists"):
        try:
            assert 'path d="M12 20.86a2.75' in locators.alert_for_panel.get_attribute('innerHTML')
            return True

        except:
            return False


@TestStep(When)
def check_red_alert_for_panel(self):
    """Check that panel title contains red alert."""
    with By("checking reg alert exists"):
        try:
            assert 'path d="M18.17' in locators.alert_for_panel.get_attribute('innerHTML')
            return True

        except:
            return False
