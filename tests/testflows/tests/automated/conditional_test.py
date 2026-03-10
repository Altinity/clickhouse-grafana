from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

from selenium.webdriver.common.by import By as SelectBy

import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor

from requirements.requirements import *


@TestOutline
def check_conditional_test_panel(self, dashboard_name, panel_name, variable_name, variable_value,
                                 expected_in_sql, not_expected_in_sql=None):
    """Open a pre-provisioned dashboard panel, change variable, and verify generated SQL."""

    with Given(f"I open dashboard {dashboard_name}"):
        dashboards.open_dashboard(dashboard_name=dashboard_name)

    try:
        with When(f"I open panel {panel_name}"):
            with delay():
                dashboard.open_panel(panel_name=panel_name)

        with And("I open SQL editor"):
            with delay():
                panel.go_to_sql_editor()

        with And("I click Show generated SQL button"):
            with delay():
                sql_editor.click_show_generated_sql_button(query_name='A')

        with When(f"I change {variable_name} to {variable_value}"):
            with delay():
                panel.change_variable_value(variable_name=variable_name, variable_value=variable_value)

        with And("I re-click Show generated SQL button after variable change"):
            with delay():
                try:
                    sql_editor.click_show_generated_sql_button(query_name='A')
                except Exception:
                    pass

        with Then("I check reformatted query"):
            for attempt in retries(delay=5, count=6):
                with attempt:
                    with delay():
                        reformatted_query = sql_editor.get_reformatted_query(query_name='A')
                        note(f"reformatted_query: {reformatted_query}")
                        for expected in expected_in_sql:
                            assert expected in reformatted_query, error()
                        if not_expected_in_sql:
                            for not_expected in not_expected_in_sql:
                                assert not_expected not in reformatted_query, error()

    finally:
        with Finally("I discard changes for panel"):
            for attempt in retries(delay=2, count=3):
                with attempt:
                    with delay(after=0.5):
                        try:
                            panel.click_back_to_dashboard_button()
                        except Exception:
                            btn = self.context.driver.find_element(
                                SelectBy.XPATH,
                                '//button[@data-testid="data-testid Back to dashboard button"]'
                            )
                            self.context.driver.execute_script("arguments[0].click();", btn)

        with And("I discard changes for dashboard"):
            for attempt in retries(delay=2, count=3):
                with attempt:
                    with delay(after=0.5):
                        dashboard.discard_changes_for_dashboard()


@TestScenario
def check_2_params_if_branch(self):
    """Check $conditionalTest with 2 parameters uses SQL_if when query variable has a value.
    Dashboard: $conditionalTest 3 params issue 869, panel: 2 params conditionalTest with query variable.
    Query: $conditionalTest(AND cte2_tenant in ($Tenant), $Tenant)
    Tenant=tenant1 -> should include AND cte2_tenant in."""

    check_conditional_test_panel(
        dashboard_name="$conditionalTest 3 params issue 869",
        panel_name="2 params conditionalTest with query variable",
        variable_name="Tenant",
        variable_value="tenant1",
        expected_in_sql=["AND cte2_tenant in"],
    )


@TestScenario
def check_3_params_if_branch(self):
    """Check $conditionalTest with 3 parameters uses SQL_if when query variable has a value (issue #869).
    Dashboard: $conditionalTest 3 params issue 869, panel: 3 params conditionalTest with query variable.
    Query: $conditionalTest(AND cte2_tenant in ($Tenant), AND cte2_tenant = 'default_tenant', $Tenant)
    Tenant=tenant1 -> should use SQL_if (AND cte2_tenant in), not SQL_else (AND cte2_tenant = 'default_tenant')."""

    check_conditional_test_panel(
        dashboard_name="$conditionalTest 3 params issue 869",
        panel_name="3 params conditionalTest with query variable",
        variable_name="Tenant",
        variable_value="tenant1",
        expected_in_sql=["AND cte2_tenant in"],
        not_expected_in_sql=["AND cte2_tenant = 'default_tenant'"],
    )


@TestScenario
def check_3_params_else_branch_textbox_set(self):
    """Check $conditionalTest with 3 parameters uses SQL_if when textbox variable has a value (issue #869).
    Dashboard: $conditionalTest 3 params issue 869, panel: 3 params conditionalTest with textbox variable.
    Query: $conditionalTest(AND name = '$TextFilter', AND name IS NOT NULL, $TextFilter)
    TextFilter=hello -> should use SQL_if (AND name = 'hello'), not SQL_else (AND name IS NOT NULL)."""

    check_conditional_test_panel(
        dashboard_name="$conditionalTest 3 params issue 869",
        panel_name="3 params conditionalTest with textbox variable",
        variable_name="TextFilter",
        variable_value="hello",
        expected_in_sql=["AND name ="],
        not_expected_in_sql=["AND name IS NOT NULL"],
    )


@TestScenario
def check_3_params_else_branch_textbox_empty(self):
    """Check $conditionalTest with 3 parameters uses SQL_else when textbox variable is empty (issue #869).
    Dashboard: $conditionalTest 3 params issue 869, panel: 3 params conditionalTest with textbox variable.
    Query: $conditionalTest(AND name = '$TextFilter', AND name IS NOT NULL, $TextFilter)
    TextFilter is empty by default -> should use SQL_else (AND name IS NOT NULL)."""

    check_conditional_test_panel(
        dashboard_name="$conditionalTest 3 params issue 869",
        panel_name="3 params conditionalTest with textbox variable",
        variable_name="TextFilter",
        variable_value="",
        expected_in_sql=["AND name IS NOT NULL"],
        not_expected_in_sql=["AND name = '"],
    )


@TestFeature
@Name("conditional test")
def feature(self):
    """Check that $conditionalTest macro works correctly with 2 and 3 parameters
    using pre-provisioned dashboards."""

    for scenario in loads(current_module(), Scenario):
        scenario()
