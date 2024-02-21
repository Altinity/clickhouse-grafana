from requirements.requirements import *
from testflows.core import *
from compare_tests.steps import *


@TestScenario
@Requirements(RQ_SRS_Plugin_Dashboards("1.0"))
def dashboard_check(self):
    pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Panels("1.0"))
def panel_check(self):
    pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Panels_Repeated("1.0"))
def create_repeated_panel(self):
    pass


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector("1.0"))
def time_range_selector(self):
    pass


@TestScenario
@Requirements(RQ_SRS_Plugin_TimeRangeSelector_Zoom("1.0"))
def time_range_selector_zoom(self):
    pass


@TestFeature
@Requirements(RQ_SRS_Plugin_Functions("1.0"))
@Name("dashboards")
def feature(self):
    """Check that Plugin support grafana dashboards."""

    for scenario in loads(current_module(), Scenario):
        scenario()
