from testflows.core import *

from steps.delay import delay
from selenium.webdriver import ActionChains
from steps.dashboard.locators import locators
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By as SelectBy
from selenium.common.exceptions import NoSuchElementException

import steps.ui as ui


@TestStep(When)
def select_input_query(self, query_name):
    """Select input query using ctrl + a on textarea."""

    locators.input_in_sql_editor.send_keys(Keys.CONTROL, "a")


@TestStep(When)
def enter_sql_editor_input(self, query, query_name="A"):
    """Enter SQL request into sql editor input field."""

    with By("selecting input string"):
        with delay():
            select_input_query(query_name=query_name)

    with By("entering request"):
        with delay():
            locators.input_in_sql_editor.send_keys(query + " ")
            locators.input_in_sql_editor.send_keys(Keys.ENTER)


@TestStep(When)
def enter_database(self, database):
    """Enter Database."""

    locators.database_dropdown.click()
    locators.database_dropdown.send_keys(database)
    locators.database_dropdown.send_keys(Keys.ENTER)


@TestStep(When)
def enter_table(self, table):
    """Enter Table."""

    locators.table_dropdown.click()
    locators.table_dropdown.send_keys(table)
    locators.table_dropdown.send_keys(Keys.ENTER)


@TestStep(When)
def enter_column_timestamp_type(self, column_timestamp_type):
    """Enter Column timestamp type."""

    locators.column_timestamp_type_dropdown.click()
    locators.column_timestamp_type_dropdown.send_keys(column_timestamp_type)
    locators.column_timestamp_type_dropdown.send_keys(Keys.ENTER)


@TestStep(When)
def enter_timestamp_column(self, timestamp_column):
    """Enter Timestamp Column."""

    locators.timestamp_column_dropdown.click()
    locators.timestamp_column_dropdown.send_keys(timestamp_column)
    locators.timestamp_column_dropdown.send_keys(Keys.ENTER)


@TestStep(When)
def enter_date_column(self, date_column):
    """Enter Date Column."""

    locators.date_column_dropdown.click()
    locators.date_column_dropdown.send_keys(date_column)
    locators.date_column_dropdown.send_keys(Keys.ENTER)


@TestStep(When)
def setup_query_settings_for_variable(
    self,
    database="default",
    table="test_grafana",
    column_timestamp_type="DateTime",
    timestamp_column="event_time",
    date_column="",
):
    """Setup all macro in Query Settings."""

    with When("I setup database"):
        with delay():
            enter_database(database=database)

    with When("I setup table"):
        with delay():
            enter_table(table=table)

    with When("I setup column timestamp type"):
        with delay():
            enter_column_timestamp_type(column_timestamp_type=column_timestamp_type)

    with When("I setup timestamp column"):
        with delay():
            enter_timestamp_column(timestamp_column=timestamp_column)


@TestStep(When)
def click_go_to_query_button(self):
    """Click Go to Query button."""

    locators.go_to_query_button.click()


@TestStep(When)
def click_show_generated_sql_button(self):
    """Click Show generated SQL button."""

    locators.show_generated_sql_button.click()


@TestStep(When)
def get_reformatted_query(self):
    """Get reformatted query for sql query."""

    return locators.reformatted_query.text


@TestStep(When)
def get_values_preview(self):
    """Get values preview."""

    return locators.values_preview.text


@TestStep(When)
def wait_panel_menu_button(self, panel_name):
    """Wait panel menu button for panel."""

    ui.wait_for_element_to_be_present(
        select_type=SelectBy.CSS_SELECTOR,
        element=f"[data-testid='data-testid Panel menu {panel_name}']",
    )


@TestStep(When)
def enter_variable_name(self, variable_name):
    """Enter variable name."""

    locators.variable_name_textfield.clear()
    locators.variable_name_textfield.send_keys(variable_name)
    locators.variable_name_textfield.send_keys(Keys.ENTER)


@TestStep(When)
def create_variable_for_dashboard(self, datasource_name, query):
    """Create variable for dashboard."""

    with When("I click edit button"):
        with delay():
            click_edit_button()

    with And("I click dashboard settings button"):
        with delay():
            click_dashboard_settings_button()

    with And("I click variables tab"):
        with delay():
            click_variables_tab()

    with And("I click add variable button"):
        with delay():
            click_add_variable_button()

    with And("I select datasource"):
        with delay():
            select_datasource(datasource_name=datasource_name)

    with And("I set up query settings for variable"):
        with delay():
            setup_query_settings_for_variable()

    with And("I click go to query button"):
        with delay():
            click_go_to_query_button()

    with And("I enter query"):
        with delay():
            enter_sql_editor_input(query=query)

    with And("I click run query"):
        with delay():
            click_run_query_button()

    with And("I click save dashboard"):
        with delay():
            saving_dashboard()


@TestStep(When)
def click_menu_button_for_panel(self, panel_name):
    """Click menu button for panel."""

    locators.menu_button_for_panel(panel_name=panel_name).click()


@TestStep(When)
def move_cursor_to_panel_header(self, panel_name):
    """Move cursor to panel header, this makes menu button be visible."""

    ActionChains(self.context.driver).move_to_element(
        locators.panel(panel_name=panel_name)
    ).perform()


@TestStep(When)
def move_cursor_to_menu_button(self, panel_name):
    """Move cursor to menu button, this makes menu button be visible."""

    # First hover over panel header to make menu button visible in Grafana 11+
    move_cursor_to_panel_header(panel_name=panel_name)

    # Wait for the menu button to appear
    ui.wait_for_element_to_be_present(
        select_type=SelectBy.CSS_SELECTOR,
        element=f"[data-testid='data-testid Panel menu {panel_name}']",
    )

    ActionChains(self.context.driver).move_to_element(
        locators.menu_button_for_panel(panel_name=panel_name)
    ).perform()


@TestStep(When)
def wait_edit_button_in_panel_menu(self):
    """Wait edit button in dropdown menu for panel."""

    ui.wait_for_element_to_be_clickable(
        select_type=SelectBy.CSS_SELECTOR,
        element="[data-testid='data-testid Panel menu item Edit']",
    )


@TestStep(When)
def click_edit_button_for_panel(self):
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
def scroll_to_panel(self, panel_name):
    """Scroll until panel is presented."""

    driver = self.context.driver
    driver.execute_script(
        "arguments[0].scrollIntoView();", locators.panel(panel_name=panel_name)
    )


@TestStep(When)
def open_dropdown_menu_for_panel(self, panel_name):
    """Open dropdown menu for panel."""

    with By("waiting for panel to be visible"):
        wait_panel(panel_name=panel_name)

    with By("moving cursor to menu button"):
        with delay():
            move_cursor_to_menu_button(panel_name=panel_name)

    with And("clicking menu button"):
        with delay():
            click_menu_button_for_panel(panel_name=panel_name)


@TestStep(When)
def edit_panel(self, panel_name):
    """Open dropdown menu for panel."""

    with By(f"waiting edit button for {panel_name}"):
        wait_edit_button_in_panel_menu()

    with By("clicking edit button"):
        click_edit_button_for_panel()


@TestStep(When)
def wait_panel(self, panel_name):
    """Wait panel to be loaded."""
    ui.wait_for_element_to_be_visible(
        select_type=SelectBy.CSS_SELECTOR,
        element=f"[data-testid='data-testid Panel header {panel_name}']",
    )


@TestStep(When)
def take_panel_screenshot(self, panel_name, screenshot_name):
    """Take screenshot for panel."""
    locators.panel(panel_name=f"{panel_name}").screenshot(
        f"./screenshots/{screenshot_name}.png"
    )


@TestStep(When)
def click_save_button(self):
    """Open saving menu for dashboard."""
    locators.save_dashboard(grafana_version=self.context.grafana_version).click()


@TestStep(When)
def change_title_for_dashboard(self, dashboard_name):
    """Change title for dashboard in saving menu."""
    locators.save_dashboard_title(grafana_version=self.context.grafana_version).clear()

    locators.save_dashboard_title(
        grafana_version=self.context.grafana_version
    ).send_keys(dashboard_name)


@TestStep(When)
def click_save_dashboard_button(self):
    """Save dashboard."""
    locators.save_dashboard_button(grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_edit_button(self):
    """Click edit button."""

    locators.edit_button.click()


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
        with delay(before=0.5):
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
def click_dashboard_settings_button(self):
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
    locators.select_data_source_dropdown.send_keys(Keys.ENTER)


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
def click_edit_button(self):
    """Click edit button."""

    locators.edit_button.click()


@TestStep(When)
def enter_variable_type(self, variable_type):
    """Enter variable type."""

    locators.variable_type_dropdown.click()
    locators.variable_type_dropdown.send_keys(variable_type)
    locators.variable_type_dropdown.send_keys(Keys.ENTER)


@TestStep(When)
def create_new_variable(
    self, datasource_name, variable_type, query=None, run_query=False
):
    """Create new variable."""

    with By("clicking edit button"):
        with delay():
            click_edit_button()

    with And("clicking dashboard settings button"):
        with delay():
            click_dashboard_settings_button()

    with And("clicking variables tab"):
        with delay():
            click_variables_tab()

    with And("clicking add variable button"):
        with delay():
            click_add_variable_button()

    with And("entering variable type"):
        with delay():
            enter_variable_type(variable_type=variable_type)

    if not (query is None):
        with And("entering variable query"):
            with delay():
                enter_variable_query(query=query)

    with And("selecting datasource"):
        with delay():
            select_datasource(datasource_name=datasource_name)

    if run_query:
        with And("clicking run query"):
            with delay():
                click_run_query_button()


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

    if (self.context.grafana_version is None) or (
        int(self.context.grafana_version.split(".")[0]) > 10
    ):
        with delay():
            with By("clicking edit button"):
                click_edit_button()

    with delay():
        with By("clicking add button"):
            click_add_button()

    with By("clicking add visualization button"):
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
def click_exit_edit_button(self):
    """Click exit edit button."""

    locators.exit_edit_button.click()


@TestStep(When)
def click_discard_changes_confirmation_button(self):
    """Click discard changes confirmation button."""

    locators.discard_changes_confirmation_button.click()


@TestStep(When)
def discard_changes_for_dashboard(self):
    """Discard changes for panel."""

    with By("clicking exit edit button"):
        with delay():
            click_exit_edit_button()

    # with By("clicking discard changes confirmation"):
    #     with delay():
    #         click_discard_changes_confirmation_button()


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

    ActionChains(self.context.driver).double_click(locators.visualization).click(
        locators.visualization
    ).perform()


@TestStep(When)
def check_green_alert_for_panel(self):
    """Check that panel title contains green alert."""
    with By("checking green alert exists"):
        try:
            assert 'path d="M12 20.86a2.75' in locators.alert_for_panel.get_attribute(
                "innerHTML"
            )
            return True

        except:
            return False


@TestStep(When)
def check_red_alert_for_panel(self):
    """Check that panel title contains red alert."""
    with By("checking reg alert exists"):
        try:
            assert 'path d="M18.17' in locators.alert_for_panel.get_attribute(
                "innerHTML"
            )
            return True

        except:
            return False
