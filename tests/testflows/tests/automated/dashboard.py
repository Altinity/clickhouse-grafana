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

    with When("I create new dashboard"):
        create_dashboard(dashboard_name="abc")

    with When("I go to dashboards view"):
        open_dashboards_view()

    with Then("I check dashboard is created"):
        assert check_dashboard_exists(dashboard_name="abc") is True


@TestScenario
@Requirements(RQ_SRS_Plugin_Panels("1.0"))
def panel_check(self):
    """Check that Plugin supports creating panels."""

    with Given("I create new dashboard"):
        create_dashboard(dashboard_name="abc")

    with When("I open dashboard"):
        open_dashboard(dashboard_name="abc")

    with When("I add visualization for panel"):
        add_visualization()

    with delay():
        click_select_datasource_button()

    click_datasource_in_select_datasource_dropdown(datasource_name='clickhouse')

    with delay():
        with When("I open SQL editor"):
            go_to_sql_editor()

    with When("I enter query to SQL editor"):
        enter_sql_editor_input(request="SELECT now(), 1")

    with delay():
        with Then("I click on the visualization to see result"):
            click_on_the_visualization()

    with Then("I check panel is created"):
        with By("taking screenshot"):
            take_screenshot_for_visualization(screenshot_name="panel_check")
        with By("checking screenshot"):
            pass
#
# @TestScenario
# @Okayed("Ok")
# @Requirements(RQ_SRS_Plugin_Panels_Repeated("1.0"))
# def create_repeated_panel(self):
#     """Check that Plugin supports creating repeated panels"""
#     with Given("I create new dashboard"):
#         create_dashboard()
#
#     with When("I add variable with two values",
#               description="Click edit dashboard > click 'Add variable' button"
#                           "SELECT number from numbers(2)"):
#         add_variable(variable_type="query")
#         open_picture(picture="tests/manual/screenshots/options_for_variable_for_repeated_panels.png")
#
#     with When("I create new panel"):
#         create_panel()
#
#     with When("I setup repeated panels"):
#         open_picture(picture="tests/manual/screenshots/panel_setup_for_repeated_panel.png")
#         pass
#
#     with Then("I check two panels are created"):
#         open_picture(picture="tests/manual/screenshots/repeated_panels.png")
#         pass

#
# @TestScenario
# @Okayed("Ok")
# @Requirements(RQ_SRS_Plugin_TimeRangeSelector("1.0"))
# def time_range_selector_for_dashboard(self):
#     """Check that Plugin supports time range selector for dashboard"""
#
#     with Given("I go to clickhouse dashboard"):
#         pass
#
#     with When("I change time range in the time range dropdown menu"):
#         pass
#
#     with Then("I check time range for visualization is changed and the same for different Plugin versions"):
#         pass
#
#
# @TestScenario
# @Okayed("Ok")
# @Requirements(RQ_SRS_Plugin_TimeRangeSelector_Zoom("1.0"))
# def time_range_selector_zoom_for_dashboard(self):
#     """Check that Plugin supports zoom for dashboards"""
#
#     with Given("I go to clickhouse dashboard"):
#         pass
#
#     with When("I change time range", description="zoom in"):
#         with By("selecting an area on the visualization"):
#             pass
#
#     with Then("I check time range for visualization is changed and the same for different Plugin versions"):
#         pass
#
#     with And("I check time range is changed in dropdown menu"):
#         pass
#
#     with When("I change time range", description="zoom out"):
#         with By("double-clicking on the visualization"):
#             pass
#
#     with Then("I check time range for visualization is changed and the same for different Plugin versions"):
#         pass
#
#     with And("I check time range is changed in dropdown menu"):
#         pass
#
#
# @TestScenario
# @Okayed("Ok")
# @Requirements(RQ_SRS_Plugin_TimeRangeSelector("1.0"))
# def time_range_selector_for_panel(self):
#     """Check that Plugin supports time range selector for panel"""
#
#     with Given("I go to clickhouse dashboard"):
#         pass
#
#     with Given("I go to repeated postgres panel", description="I click edit"):
#         pass
#
#     with When("I change time range in the time range dropdown menu"):
#         pass
#
#     with Then("I check time range for visualization is changed and the same for different Plugin versions"):
#         pass
#
#
# @TestScenario
# @Okayed("Ok")
# @Requirements(RQ_SRS_Plugin_TimeRangeSelector_Zoom("1.0"))
# def time_range_selector_zoom_for_panel(self):
#     """Check that Plugin supports zoom for panels"""
#
#     with Given("I go to clickhouse dashboard"):
#         pass
#
#     with Given("I go to repeated postgres panel", description="I click edit"):
#         pass
#
#     with When("I change time range", description="zoom in"):
#         with By("selecting an area on the visualization"):
#             pass
#
#     with Then("I check time range for visualization is changed and the same for different Plugin versions"):
#         pass
#
#     with And("I check time range is changed in dropdown menu"):
#         pass
#
#     with When("I change time range", description="zoom out"):
#         with By("double-clicking on the visualization"):
#             pass
#
#     with Then("I check time range for visualization is changed and the same for different Plugin versions"):
#         pass
#
#     with And("I check time range is changed in dropdown menu"):
#         pass


@TestScenario
@Requirements(RQ_SRS_Plugin_FillActual)
def changing_size_of_visualization(self):
    """Check that Plugin supports changing size of visualization."""

    with Given("I go to clickhouse dashboard"):
        open_dashboard(dashboard_name="clickhouse dashboard")

    with Given("I go to subquery example panel", description="I click edit"):
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

    with Then("I compare two screenshots"):
        assert compare_screenshots(screenshot_name_1="fill", screenshot_name_2="actual") is False, error()


@TestFeature
@Name("dashboards")
def feature(self):
    """Check that Plugin supports Grafana dashboards."""

    for scenario in loads(current_module(), Scenario):
        scenario()
