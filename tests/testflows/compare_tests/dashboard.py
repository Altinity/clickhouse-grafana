from requirements.requirements import *
from testflows.core import *
from compare_tests.steps import *


@TestScenario
@Requirements(RQ_SRS_Plugin_Dashboards("1.0"))
def dashboard_check(self):
    """Check that Plugin supports creating dashboard."""

    with When("I create new dashboard"):
        create_dashboard()

    with Then("I check dashboard is created"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Panels("1.0"))
def panel_check(self):
    """Check that Plugin supports creating panels."""

    with Given("I create new dashboard"):
        create_dashboard()

    with When("I create new panel"):
        create_panel()

    with Then("I check panel is created"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Panels_Repeated("1.0"))
def create_repeated_panel(self):
    """Check that Plugin supports creating repeated panels"""
    with Given("I create new dashboard"):
        create_dashboard()

    with When("I add variable with multiple values"):
        add_variable(variable_type="query")

    with When("I create new panel"):
        create_panel()

    with When("I setup repeated panels"):
        pass

    with Then("I check two panels are created"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector("1.0"))
def time_range_selector_for_dashboard(self):
    """Check that Plugin supports time range selector for dashboard"""

    with Given("I go to clickhouse dashboard"):
        pass

    with When("I change time range in the time range dropdown menu"):
        pass

    with Then("I check time range for visualization is changed and the same for different Plugin versions"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector_Zoom("1.0"))
def time_range_selector_zoom_for_dashboard(self):
    """Check that Plugin supports zoom for dashboards"""

    with Given("I go to clickhouse dashboard"):
        pass

    with When("I change time range", description="zoom in"):
        with By("selecting an area on the visualization"):
            pass

    with Then("I check time range for visualization is changed and the same for different Plugin versions"):
        pass

    with And("I check time range is changed in dropdown menu"):
        pass

    with When("I change time range", description="zoom out"):
        with By("double-clicking on the visualization"):
            pass

    with Then("I check time range for visualization is changed and the same for different Plugin versions"):
        pass

    with And("I check time range is changed in dropdown menu"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector("1.0"))
def time_range_selector_for_panel(self):
    """Check that Plugin supports time range selector for panel"""

    with Given("I go to clickhouse dashboard"):
        pass

    with Given("I go to repeated postgres panel"):
        pass

    with When("I change time range in the time range dropdown menu"):
        pass

    with Then("I check time range for visualization is changed and the same for different Plugin versions"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector_Zoom("1.0"))
def time_range_selector_zoom_for_panel(self):
    """Check that Plugin supports zoom for panels"""

    with Given("I go to clickhouse dashboard"):
        pass

    with Given("I go to repeated postgres panel"):
        pass

    with When("I change time range", description="zoom in"):
        with By("selecting an area on the visualization"):
            pass

    with Then("I check time range for visualization is changed and the same for different Plugin versions"):
        pass

    with And("I check time range is changed in dropdown menu"):
        pass

    with When("I change time range", description="zoom out"):
        with By("double-clicking on the visualization"):
            pass

    with Then("I check time range for visualization is changed and the same for different Plugin versions"):
        pass

    with And("I check time range is changed in dropdown menu"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_FillActual)
def changing_size_of_visualization(self):
    """Check that Plugin supports changing size of visualization."""

    with Given("I go to clickhouse dashboard"):
        pass

    with Given("I go to repeated postgres panel"):
        pass

    with When("I click on Fill/Actual toggle"):
        pass

    with Then("I check size of the visualization is changed and the same for different Plugin versions"):
        pass

    with When("I click on Fill/Actual toggle second time"):
        pass

    with Then("I check size of the visualization is changed and the same for different Plugin versions"):
        pass


@TestFeature
@Name("dashboards")
def feature(self):
    """Check that Plugin supports Grafana dashboards."""

    for scenario in loads(current_module(), Scenario):
        scenario()
