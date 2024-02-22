from requirements.requirements import *
from testflows.core import *
from compare_tests.steps import *


@TestScenario
@Requirements(RQ_SRS_Plugin_MultiUserUsage_SamePanel("1.0"))
def multi_user_usage_parallel(self):
    """Check that Plugin supports access to the same panel from different users at the same time."""

    with Given("I create new user"):
        create_user()

    with When("I go to the clickhouse dashboard from both users to the same panel"):
        pass

    with Then("I check both users have access to the panel"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_MultiUserUsage_DifferentPanels("1.0"))
def multi_user_usage_different_panels(self):
    """Check that Plugin supports access to different panels from different users at the same time."""

    with Given("I create new user"):
        create_user()

    with When("I go to the clickhouse dashboard from both users to the different panels"):
        pass

    with Then("I check both users have access to panels"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_MultiUserUsage_SameDashboard("1.0"))
def multi_user_usage_parallel(self):
    """Check that Plugin supports access to the same dashboard from different users at the same time."""

    with Given("I create new user"):
        create_user()

    with When("I go to the clickhouse dashboard from both users"):
        pass

    with Then("I check both users have access to the dashboard"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_MultiUserUsage_DifferentDashboards("1.0"))
def multi_user_usage_different_panels(self):
    """Check that Plugin supports access to different dashboards from different users at the same time."""

    with Given("I create new user"):
        create_user()

    with When("I go to the different dashboards from both users"):
        pass

    with Then("I check both users have access to dashboards"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_MultiUserUsage("1.0"))
@Name("multi-user usage")
def feature(self):
    """Check that Plugin supports multi-user usage access."""

    for scenario in loads(current_module(), Scenario):
        scenario()
