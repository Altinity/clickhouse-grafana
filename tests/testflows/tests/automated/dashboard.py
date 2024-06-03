from testflows.core import *
from testflows.connect import Shell
from testflows.asserts import error

from steps.login import *
from steps.common import *
from steps.dashboards.locators import locators as dashboards_locators
from steps.dashboard.locators import locators as dashboard_locators
from steps.dashboards.view import *
from steps.dashboard.view import *
from requirements.requirements import *

from steps.panel.view import *


@TestScenario
@Requirements(RQ_SRS_Plugin_Dashboards("1.0"))
def dashboard_check(self):
    """Check that Plugin supports creating dashboard."""
    for attempt in retries(delay=10, timeout=50):
        with attempt:
            with When("I create new dashboard"):
                create_dashboard(dashboard_name="dashboard_check")

            with When("I go to dashboards view"):
                open_dashboards_view()

            with Then("I check dashboard is created"):
                with By("checking dashboard exists"):
                    assert check_dashboard_exists(dashboard_name="dashboard_check") is True, error()


@TestScenario
@Requirements(RQ_SRS_Plugin_Panels("1.0"))
def panel_check(self):
    """Check that Plugin supports creating panels."""

    with Given("I create new dashboard"):
        create_dashboard(dashboard_name="dashboard_panel")

    with When("I open dashboard"):
        open_dashboard(dashboard_name="dashboard_panel")

    with When("I add visualization for panel"):
        add_visualization()

    with delay():
        click_select_datasource_button()

    click_datasource_in_select_datasource_dropdown(datasource_name='clickhouse')

    with delay():
        with When("I open SQL editor"):
            go_to_sql_editor()

    with When("I enter query to SQL editor"):
        enter_sql_editor_input(request="SELECT now() - Interval number minute, number from numbers(60)")

    with delay():
        with Then("I click on the visualization to see result"):
            click_on_the_visualization()

    with Then("I check panel is created"):
        with By("taking screenshot"):
            take_screenshot_for_visualization(screenshot_name="panel_check")

        with By("checking screenshot"):
            assert check_screenshot(screenshot_name="panel_check") is True, error()


@TestScenario
@Requirements(RQ_SRS_Plugin_Panels_Repeated("1.0"))
def repeated_panel(self):
    """Check that Plugin supports creating repeated panels"""

    with Given("I create new dashboard"):
        with delay():
            create_dashboard(dashboard_name="dashboard_repeated_panel")

    with When("I open dashboard"):
        open_dashboard(dashboard_name="dashboard_repeated_panel")

    with And("I add variable with two values",
             description="Click edit dashboard > click 'Add variable' button"
                         "SELECT number from numbers(2)"):
        with delay():
            create_new_variable(query="SELECT number from numbers(2)", datasource_name="clickhouse")

    with And("I open dashboard with variable"):
        open_dashboard(dashboard_name="dashboard_repeated_panel")

    with And("I create new panel"):
        with delay():
            add_visualization()

    with And("I setup repeated panel"):
        with By("changing panel title"):
            change_panel_title(panel_title="Repeated ${query0}")
        with By("setting up repeat option"):
            change_repeat_by_variable_option(variable_name="query0")

    with Then("I check two panels are created"):
        for attempt in retries(delay=10, timeout=50):
            with attempt:

                with Then("I open dashboard"):
                    open_dashboard(dashboard_name="dashboard_repeated_panel")

                assert check_panel_exists(picture="Repeated 1") is True
                assert check_panel_exists(picture="Repeated 2") is True


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector("1.0"))
def time_range_selector_for_dashboard(self):
    """Check that Plugin supports time range selector for dashboard"""

    with Given("I go to clickhouse dashboard"):
        open_dashboard(dashboard_name="clickhouse dashboard")

    with When("I take screenshot for subquery example panel before time ranges change"):
        take_screenshot_for_panel(panel_name="subquery example",
                                  screenshot_name="subquery_example_before_time_range_selector_changes")

    with When("I change time range in the time range dropdown menu"):
        with delay():
            change_time_range_selector_for_dashboard(from_time="now-7h", to_time="now-h")

    with When("I take screenshot for subquery example panel after time ranges change"):
        take_screenshot_for_panel(panel_name="subquery example",
                                  screenshot_name="subquery_example_after_time_range_selector_changes")

    with Then("I compare two screenshots"):
        assert compare_screenshots(
            screenshot_name_1="subquery_example_before_time_range_selector_changes",
            screenshot_name_2="subquery_example_after_time_range_selector_changes"
        ) is False, error()


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector_Zoom("1.0"))
def time_range_selector_zoom_for_dashboard(self):
    """Check that Plugin supports zoom for dashboards"""

    with Given("I go to clickhouse dashboard"):
        open_dashboard(dashboard_name="clickhouse dashboard")

    with And("I take screenshot for subquery example panel before double click"):
        take_screenshot_for_panel(
            panel_name="subquery example",
            screenshot_name="subquery_example_before_double_click"
        )

    with And("I change time range"):
        with delay():
            with By("double-clicking on the visualization"):
                double_click_on_panel()

    with And("I take screenshot for subquery example panel after double click"):
        take_screenshot_for_panel(
            panel_name="subquery example",
            screenshot_name="subquery_example_after_double_click"
        )

    with Then("I compare screenshots"):
        assert compare_screenshots(
            screenshot_name_1="subquery_example_before_double_click",
            screenshot_name_2="subquery_example_after_double_click"
        ) is False, error()


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector("1.0"))
def time_range_selector_for_panel(self):
    """Check that Plugin supports time range selector for panel"""

    with Given("I go to clickhouse dashboard"):
        open_dashboard(dashboard_name="clickhouse dashboard")

    with And("I go to subquery example panel", description="I click edit"):
        open_panel(dashboard_name="subquery example")

    with When("I take screenshot for subquery example panel before time ranges change"):
        take_screenshot_for_visualization(
            screenshot_name="subquery_example_before_time_range_selector_changes"
        )

    with And("I change time range in the time range dropdown menu"):
        change_time_range_selector_for_dashboard(from_time="now-7h", to_time="now-h")

    with And("I take screenshot for subquery example panel after time ranges change"):
        take_screenshot_for_visualization(
            screenshot_name="subquery_example_after_time_range_selector_changes"
        )

    with Then("I compare two screenshots"):
        assert compare_screenshots(
            screenshot_name_1="subquery_example_before_time_range_selector_changes",
            screenshot_name_2="subquery_example_after_time_range_selector_changes"
        ) is False, error()


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector_Zoom("1.0"))
def time_range_selector_zoom_for_panel(self):
    """Check that Plugin supports zoom for panels"""

    with Given("I go to clickhouse dashboard"):
        open_dashboard(dashboard_name="clickhouse dashboard")

    with And("I go to subquery example panel", description="I click edit"):
        open_panel(dashboard_name="subquery example")

    with And("I take screenshot for subquery example panel before double click"):
        take_screenshot_for_panel(
            panel_name="subquery example",
            screenshot_name="subquery_example_before_double_click"
        )

    with And("I change time range", description="double_click"):
        with delay():
            with By("double-clicking on the visualization"):
                double_click_on_visualization()

    with And("I take screenshot for subquery example panel after double click"):
        take_screenshot_for_panel(
            panel_name="subquery example",
            screenshot_name="subquery_example_after_double_click"
        )

    with Then("I compare screenshots"):
        assert compare_screenshots(
            screenshot_name_1="subquery_example_before_double_click",
            screenshot_name_2="subquery_example_after_double_click"
        ) is False, error()


@TestScenario
@Requirements(RQ_SRS_Plugin_FillActual)
def changing_size_of_visualization(self):
    """Check that Plugin supports changing size of visualization."""

    with Given("I go to clickhouse dashboard"):
        open_dashboard(dashboard_name="clickhouse dashboard")

    with And("I go to subquery example panel", description="I click edit"):
        open_panel(panel_name="subquery example")

    with delay():
        with When("I click on Actual toggle"):
            actual()

    with Then("I take screenshot for Actual visualization"):
        take_screenshot_for_visualization(screenshot_name="actual")

    with delay():
        with When("I click on Fill toggle"):
            fill()

    with Then("I take screenshot for Fill visualization"):
        take_screenshot_for_visualization(screenshot_name="fill")

    with And("I compare two screenshots"):
        assert compare_screenshots(screenshot_name_1="fill", screenshot_name_2="actual") is False, error()

    with delay():
        with Then("I open SQL editor"):
            go_to_sql_editor()


@TestFeature
@Name("dashboards")
def feature(self):
    """Check that Plugin supports Grafana dashboards."""

    for scenario in loads(current_module(), Scenario):
        scenario()