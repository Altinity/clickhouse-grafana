import time

from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from steps.ui import *
from steps.dashboard.locators import locators
from steps.delay import delay
from selenium.webdriver import ActionChains


@TestStep(When)
def wait_panel_menu_button(self, panel_name):
    """Wait panel menu button for panel."""

    wait_for_element_to_be_present(
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

    wait_for_element_to_be_clickable(
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
    wait_for_element_to_be_visible(
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
def saving_dashboard(self, dashboard_name):
    """Save current dashboard"""
    with By("clicking save in dashboard view"):
        click_save_button()

    with By("entering dashboard name"):
        change_title_for_dashboard(dashboard_name=dashboard_name)

    with By("clicking save button"):
        click_save_dashboard_button()


@TestStep(When)
def open_panel(self, panel_name):
    """Open panel view for panel."""
    with delay():
        with When(f"I open dropdown menu for panel {panel_name}"):
            open_dropdown_menu_for_panel(panel_name=panel_name)

    with delay():
        with When("I open panel view"):
            edit_panel(panel_name=panel_name)

@TestStep(Then)
def check_panel_exists(self):
    try:
        pass
    except:
        pass


@TestStep(Then)
def take_screenshot_for_panel(self, panel_name, screenshot_name):
    """Wait panel to be loaded and take screenshot."""
    with Then(f"I wait {panel_name} to be loaded"):
        wait_panel(panel_name=panel_name)

    with Then("I take screenshot"):
        take_panel_screenshot(panel_name=panel_name, screenshot_name=screenshot_name)


@TestStep(When)
def open_new_dashboard_view(self):
    """Open new dashboard view."""
    open_endpoint(endpoint=f"{self.context.endpoint}dashboard/new")


@TestStep(When)
def add_visualization(self):
    """Add visualization for dashboard."""

    with delay():
        with By("Clicking add button"):
            click_add_button()

    with By("Clicking add visualization button"):
        click_add_visualization_button()