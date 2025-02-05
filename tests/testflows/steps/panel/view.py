from testflows.core import *
from testflows.asserts import error

from regression import grafana_version
from steps.delay import delay
from steps.panel.locators import locators
from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
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

@TestStep
def click_data_options_expand_button(self):
    """Click data options expand button."""

    locators.query_inspector_data_options_expand_button.click()


@TestStep
def enter_data_options_dropdown(self, column):
    """Enter data options dropdown."""

    locators.query_inspector_data_options_dropdown.click()
    locators.query_inspector_data_options_dropdown.send_keys(column)
    locators.query_inspector_data_options_dropdown.send_keys(Keys.ENTER)

@TestStep
def change_column_for_download(self, column):
    """Change column for download."""

    with By("clicking data options expand button"):
        with delay():
            click_data_options_expand_button()

    with By("entering column name into data options dropdown"):
        with delay():
            enter_data_options_dropdown(column=column)

@TestStep(When)
def click_sql_editor_toggle(self, query_name):
    """Click SQL editor toggle."""
    locators.sql_editor_toggle(query_name, grafana_version=self.context.grafana_version).click()


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
def click_add_query_button(self):
    """Click Add query button."""
    locators.add_query_button.click()


@TestStep(When)
def click_expression_button(self):
    """Click Expression button."""
    locators.expression_button.click()


@TestStep(When)
def go_to_sql_editor(self, query_name='A'):
    """Wait sql editor toggle and click it."""
    with By("waiting sql editor toggle"):
        wait_sql_editor_toggle()

    with By("clicking SQL Editor toggle"):
        click_sql_editor_toggle(query_name=query_name)


@TestStep(When)
def wait_sql_editor_input(self):
    """Wait SQL editor input field."""
    ui.wait_for_element_to_be_present(
        select_type=SelectBy.CSS_SELECTOR, element=f"[class='view-lines monaco-mouse-cursor-text']"
    )


@TestStep(When)
def select_input_query(self, query_name):
    """Select input query using triple click on textarea."""

    locators.input_in_sql_editor(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(Keys.CONTROL, 'a')

 
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
def enter_sql_editor_input(self, query, query_name='A'):
    """Enter SQL request into sql editor input field."""

    with By("waiting SQL editor"):
        with delay():
            wait_sql_editor_input()

    with By("selecting input string"):
        with delay():
            select_input_query(query_name=query_name)

    with By("entering request"):
        with delay():
            locators.input_in_sql_editor(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(query + ' ')
            locators.input_in_sql_editor(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def get_input_query(self, query_name='A'):
    """Get SQL query."""

    return locators.input_in_sql_editor(query_name=query_name, grafana_version=self.context.grafana_version).text


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
        select_type=SelectBy.CSS_SELECTOR, element=f"[data-testid='data-testid panel content']"
    )


@TestStep(When)
def take_visualization_screenshot(self, screenshot_name):
    """Take screenshot for visualization."""

    locators.visualization.screenshot(f'./screenshots/{screenshot_name}.png')

@TestStep(When)
def click_annotation_toggle(self, annotation_name):
    """Click annotation toggle."""

    locators.annotation_toggle(annotation_name=annotation_name).click()

@TestStep
def refresh_annotation(self, annotation_name):
    """Turn annotation off and on."""

    with By("turning annotation off"):
        with delay():
            click_annotation_toggle(annotation_name=annotation_name)

    with By("turning annotation on"):
        with delay():
            click_annotation_toggle(annotation_name=annotation_name)


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
    with By(f"waiting datasource={datasource_name} in datasource dropdown"):
        wait_datasource_in_datasource_dropdown(datasource_name=datasource_name)
    with delay():
        with By(f"selecting datasource={datasource_name} in dropdown"):
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

@TestStep(When)
def click_query_inspector_close_button(self):
    """Click query inspector close button."""

    locators.query_inspector_close_button.click()


@TestStep(When)
def click_query_inspector_data_tab(self):
    """Click query inspector data tab."""

    locators.query_inspector_data_tab.click()


@TestStep(When)
def click_query_inspector_download_csv_button(self):
    """Click query inspector download csv button."""

    locators.query_inspector_download_csv_button.click()


@TestStep(Then)
def check_query_inspector_request(self, url_parts):
    """Check url in query inspector."""

    with By("opening query inspector"):
        with delay(after=0.5):
            click_inspect_query_button()

    with By("clicking refresh button in query inspector"):
        with delay(after=0.5):
            click_inspect_query_refresh_button()

    try:
        with By("checking url contains necessary parts"):
            for url_part in url_parts:
                with By(f"checking url contains {url_part}"):
                    assert url_part in get_query_inspector_url_text(), error()
    finally:
        with Finally("I close query inspector window"):
            with By("clicking query inspector close button"):
                click_query_inspector_close_button()


@TestStep(When)
def change_query_name(self, query_name, new_query_name):
    """Change query name."""

    locators.query_name_field(query_name=query_name, grafana_version=self.context.grafana_version).click()
    locators.query_name_textfield(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(new_query_name)
    locators.query_name_textfield(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def change_expression_name(self, expression_name, new_expression_name):
    """Change expression name."""

    locators.expression_name_field(expression_name=expression_name, grafana_version=self.context.grafana_version).click()
    locators.expression_name_textfield(expression_name=expression_name, grafana_version=self.context.grafana_version).send_keys(new_expression_name)
    locators.expression_name_textfield(expression_name=expression_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def click_duplicate_query(self, query_name):
    """Click duplicate query."""

    locators.duplicate_query_button(query_name=query_name).click()


@TestStep(When)
def click_duplicate_expression(self, expression_name):
    """Click duplicate expression."""

    locators.duplicate_expression_button(expression_name=expression_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_hide_response_query(self, query_name):
    """Click hide response query button."""

    locators.hide_response_query_button(query_name=query_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_hide_response_expression(self, expression_name):
    """Click hide response expression button."""

    locators.hide_response_expression_button(expression_name=expression_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_delete_query(self, query_name):
    """Click delete query button."""

    locators.delete_query_button(query_name=query_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_hide_response_expression(self, expression_name):
    """Click delete expression button."""

    locators.delete_expression_button(expression_name=expression_name, grafana_version=self.context.grafana_version).click()


@TestStep(When)
def enter_expression_operation(self, expression_name, operation_type):
    """Enter expression operation type."""

    locators.expression_operation_dropdown(expression_name=expression_name, grafana_version=self.context.grafana_version).send_keys(operation_type)
    locators.expression_operation_dropdown(expression_name=expression_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def enter_expression(self, expression_name, expression):
    """Enter expression."""

    locators.expression_textfield(expression_name=expression_name, grafana_version=self.context.grafana_version).send_keys(expression)
    locators.expression_textfield(expression_name=expression_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def enter_time(self, time_from, time_to):
    """Enter time."""

    with When("I open time modal"):
        with delay():
            locators.time_picker_button.click()

    with When("I enter time from"):
        with delay():
            locators.time_picker_from_textfield.clear()
            locators.time_picker_from_textfield.send_keys(time_from)

    with When("I enter time to"):
        with delay():
            locators.time_picker_to_textfield.clear()
            locators.time_picker_to_textfield.send_keys(time_to)

    with When("I click submit button"):
        with delay():
            locators.time_picker_submit_button.click()


@TestStep(When)
def enter_data_source_for_query(self, query_name, datasource_name):
    """Enter data source for query."""

    locators.data_source_picker(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(datasource_name)
    locators.data_source_picker(query_name=query_name, grafana_version=self.context.grafana_version).send_keys(Keys.ENTER)


@TestStep(When)
def click_apply_button(self):
    """Click apply button for panel."""

    locators.apply_button.click()


@TestStep(When)
def click_discard_button(self):
    """Click discard button for panel."""

    locators.discard_button(grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_run_query_button(self):
    """Click Run Query button."""

    locators.run_query_button.click()


@TestStep(When)
def click_table_view_toggle(self):
    """Click table view toggle."""

    locators.table_view_toggle.click()


@TestStep(When)
def click_alert_tab(self):
    """Click alert tab."""

    locators.alert_tab(grafana_version=self.context.grafana_version).click()


@TestStep(Then)
def check_data_is_missing_text(self):
    """Check that 'Data is missing a time field' text is displayed."""
    with By("checking 'Data is missing a time field' text is displayed"):
        try:
            ui.wait_for_element_to_be_visible(
                select_type=SelectBy.XPATH,
                element='//*[text()="Data is missing a time field"]'
            )
            return True
        except:
            return False


@TestStep(Then)
def check_columns_in_table_view(self, columns):
    """Check that columns in table view is displayed."""
    with By(f"checking {','.join(columns)} columns is displayed"):
        try:
            for column_name in columns:
                ui.wait_for_element_to_be_visible(
                    select_type=SelectBy.XPATH,
                    element=f'//*[text()="{column_name}"]'
                )
            return True
        except:
            return False


@TestStep(Then)
def check_no_data_text(self):
    """Check that columns in table view is displayed."""
    with By(f"checking 'No data' text is displayed"):
        try:
            ui.wait_for_element_to_be_visible(
                select_type=SelectBy.XPATH,
                element=f'//*[text()="No data"]'
            )
            return True
        except:
            return False


@TestStep(Then)
def check_error_for_table_view(self):
    """Check that columns in table view is displayed."""
    with By(f"checking 'No data' text is displayed"):
        try:
            ui.wait_for_element_to_be_visible(
                select_type=SelectBy.XPATH,
                element=f'//*[text()="No data"]'
            )
            return True
        except:
            return False


@TestStep(Then)
def get_value_from_table(self, time):
    """Get value from table."""

    return locators.column_row(time=time).text


@TestStep(When)
def click_save_button(self):
    """Click save button."""

    locators.save_button(grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_adhoc_dropdown(self, adhoc_name):
    """Click adhoc dropdown."""

    locators.adhoc(adhoc_name=adhoc_name).click()


@TestStep(When)
def get_adhoc_dropdown_value(self, adhoc_name):
    """Get adhoc dropdown html."""

    return locators.adhoc(adhoc_name=adhoc_name).text.split(' ')[2]

@TestStep(When)
def change_adhoc_value_order(self, adhoc_name, adhoc_label, value_order=0):
    """Change adhoc value."""

    with By("clicking on adhoc dropdown"):
        with delay():
            click_adhoc_dropdown(adhoc_name=adhoc_name)

    with By("choosing value from adhoc dropdown"):
        with delay():
            choose_value_from_adhoc_dropdown(adhoc_label=adhoc_label, value_order=value_order)


@TestStep(When)
def change_adhoc_value(self,adhoc_name, adhoc_label, variable_value):
    """Change adhoc value."""

    with By("clicking on adhoc dropdown"):
        with delay():
            click_adhoc_dropdown(adhoc_name=adhoc_name)

    with By("entering value into adhoc dropdown"):
        with delay():
            enter_value_adhoc_dropdown(adhoc_label=adhoc_label, variable_value=variable_value)


@TestStep(When)
def get_dropdown_values_set(self, adhoc_name, adhoc_label):
    """Get dropdown values set."""

    values_set = set()
    with When(f"I get 0 dropdown value"):
        change_adhoc_value_order(adhoc_name=adhoc_name, adhoc_label=adhoc_label, value_order=0)
        value = get_adhoc_dropdown_value(adhoc_name=adhoc_name)

    order = 1
    while not (value in values_set):
        values_set.add(value)
        with When(f"I get {order} dropdown value"):
            change_adhoc_value_order(adhoc_name=adhoc_name, adhoc_label=adhoc_label, value_order=order)
            value = get_adhoc_dropdown_value(adhoc_name=adhoc_name)
        order+=1

    return values_set


@TestStep(When)
def choose_value_from_adhoc_dropdown(self, adhoc_label, value_order):
    """Choose value from adhoc dropdown value."""

    for i in range(value_order):
        locators.adhoc_dropdown(label=adhoc_label).send_keys(Keys.ARROW_DOWN)

    locators.adhoc_dropdown(label=adhoc_label).send_keys(Keys.ENTER)


@TestStep(When)
def enter_value_adhoc_dropdown(self, adhoc_label, variable_value):
    """Enter value adhoc dropdown value."""

    locators.adhoc_dropdown(label=adhoc_label).send_keys(variable_value)
    locators.adhoc_dropdown(label=adhoc_label).send_keys(Keys.ENTER)


@TestStep(When)
def click_remove_adhoc_filter_button(self, adhoc_name):
    """Click remove adhoc filter button."""

    locators.remove_adhoc_button(adhoc_name=adhoc_name).click()


@TestStep(When)
def click_add_adhoc_filter_button(self):
    """Click add adhoc filter button."""

    locators.add_adhoc_filter_button.click()

@TestStep(When)
def click_save_confirmation_button(self):
    """Click save confirmation button."""

    locators.save_confirmations_button(grafana_version=self.context.grafana_version).click()


@TestStep(When)
def click_refresh_button(self):
    """Click refresh button."""

    locators.refresh_button.click()

@TestStep(When)
def save_dashboard(self):
    """Save dashboard from panel view."""
    with By("clicking save button"):
        with delay():
            click_save_button()

    with And("clicking save confirmation button"):
        with delay(before=0.5, after=0.5):
            click_save_confirmation_button()

@TestStep(When)
def check_no_labels_on_visualization(self, labels):
    """Check there is no labels in the panel."""

    for label in labels:
        with By(f"searching for label {label}"):
            try:
                ui.wait_for_element_to_be_visible(
                    select_type=SelectBy.XPATH,
                    element=f'//*[@data-viz-panel-key]//*[contains(text(), "{label}")]'
                )
                return False
            except:
                return True