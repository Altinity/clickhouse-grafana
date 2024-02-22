from requirements.requirements import *
from testflows.core import *
from compare_tests.steps import *


@TestScenario
def max_data_points_option(self):
    """Check that Plugin support max data points option"""

    with Given("I go to clickhouse dashboard"):
        pass

    with Given("I go to repeated postgres panel"):
        pass

    with When("I go to Query options"):
        pass

    with When("I change Max data points"):
        pass

    with When("I check visualization is changed and visualizations from different versions are simular"):
        pass


@TestScenario
def min_interval(self):
    """Check that Plugin support min interval option"""

    with Given("I go to clickhouse dashboard"):
        pass

    with Given("I go to repeated postgres panel"):
        pass

    with When("I go to Query options"):
        pass

    with When("I change Min interval"):
        pass

    with When("I check visualization is changed and visualizations from different versions are simular"):
        pass


@TestScenario
def relative_time(self):
    """Check that Plugin support relative time option"""

    with Given("I go to clickhouse dashboard"):
        pass

    with Given("I go to repeated postgres panel"):
        pass

    with When("I go to Query options"):
        pass

    with When("I change Relative time"):
        pass

    with When("I check visualization is changed and visualizations from different versions are simular"):
        pass


@TestScenario
def time_shift(self):
    """Check that Plugin support time shift option"""

    with Given("I go to clickhouse dashboard"):
        pass

    with Given("I go to repeated postgres panel"):
        pass

    with When("I go to Query options"):
        pass

    with When("I change Time shift"):
        pass

    with When("I check visualization is changed and visualizations from different versions are simular"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_QueryOptions("1.0"))
@Name("query options")
def feature(self):
    """Check that Plugin supports query options for visualizations."""

    for scenario in loads(current_module(), Scenario):
        scenario()