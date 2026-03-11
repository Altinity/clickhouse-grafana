from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

from selenium.webdriver.common.by import By as SelectBy

import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor
from steps.panel.locators import locators as panel_locators

from requirements.requirements import *


@TestScenario
def search_filter_in_variable_dropdown(self):
    """Check that $__searchFilter works correctly in template variable queries.

    Opens the pre-provisioned dashboard that uses $__searchFilter in a variable query:
      SELECT DISTINCT country FROM default.test_grafana WHERE country LIKE ${__searchFilter:sqlstring}

    Steps:
      1. Open the dashboard with $__searchFilter variable
      2. Type 'N' into the variable dropdown to trigger server-side search filtering
      3. Verify that 'NL' appears in the filtered dropdown options
      4. Select 'NL' from the filtered dropdown
      5. Open panel edit and check the generated SQL contains 'NL'
    """

    dashboard_name = "$__searchFilter in template variables"

    with Given(f"I open dashboard {dashboard_name}"):
        with delay():
            dashboards.open_dashboard(dashboard_name=dashboard_name)

    with When("I click on the country variable dropdown"):
        with delay():
            panel.click_variable_dropdown(variable_name="country")

    with And("I type 'N' to trigger $__searchFilter filtering"):
        import time
        time.sleep(1)
        panel_locators.variable_dropdown(variable_name="country").send_keys("N")
        time.sleep(2)

    with Then("I check that 'NL' appears in the filtered dropdown options"):
        driver = current().context.driver
        # Grafana renders dropdown options as <span> inside <div class='...-grafana-select-option-body'>
        option_elements = driver.find_elements(
            SelectBy.XPATH,
            "//div[contains(@class, 'grafana-select-option-body')]//span"
        )
        option_texts = [opt.text for opt in option_elements if opt.text]
        debug(f"Dropdown options after typing 'N': {option_texts}")
        assert 'NL' in option_texts, error()

    with When("I select 'NL' from the filtered dropdown"):
        with delay():
            driver = current().context.driver
            for opt in driver.find_elements(
                SelectBy.XPATH,
                "//div[contains(@class, 'grafana-select-option-body')]//span"
            ):
                if opt.text == 'NL':
                    opt.click()
                    break

    with Then("I verify 'NL' is selected as the variable value"):
        with delay():
            selected_value = panel.get_variable_dropdown_value(variable_name="country")
            debug(f"Selected variable value: {selected_value}")
            assert "NL" in selected_value, error()

    with When("I open panel edit view to check generated SQL"):
        with delay():
            dashboard.open_panel(panel_name="$__searchFilter in template variables")

    with And("I open SQL editor"):
        with delay():
            panel.go_to_sql_editor(query_name='A')

    with And("I click Show generated SQL button"):
        with delay():
            sql_editor.click_show_generated_sql_button(query_name='A')

    with Then("I check that the generated SQL contains 'NL'"):
        with delay():
            reformatted_query = sql_editor.get_reformatted_query(query_name='A')
            debug(f"Generated SQL: {reformatted_query}")
            assert "NL" in reformatted_query, error()


@TestFeature
@Name("search filter")
def feature(self):
    """Check $__searchFilter functionality in template variable queries."""

    for scenario in loads(current_module(), Scenario):
        scenario()
