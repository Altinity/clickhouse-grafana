from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_MultiUserUsage_SamePanel("1.0"))
def multi_user_usage_parallel_panel(self):
    """Check that Plugin supports access to the same panel from different users at the same time."""

    with Given("I create new user"):
        open_picture(picture="tests/manual/screenshots/create_user.png")
        create_user()

    with When("I go to the clickhouse dashboard from both users to the same panel"):
        pass

    with Then("I check both users have access to the panel"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_MultiUserUsage_DifferentPanels("1.0"))
def multi_user_usage_different_panels(self):
    """Check that Plugin supports access to different panels from different users at the same time."""

    with Given("I create new user"):
        open_picture(picture="tests/manual/screenshots/create_user.png")
        create_user()

    with When("I go to the clickhouse dashboard from both users to the different panels"):
        pass

    with Then("I check both users have access to panels"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_MultiUserUsage_SameDashboard("1.0"))
def multi_user_usage_parallel_dashboard(self):
    """Check that Plugin supports access to the same dashboard from different users at the same time."""

    with Given("I create new user"):
        open_picture(picture="tests/manual/screenshots/create_user.png")
        create_user()

    with When("I go to the clickhouse dashboard from both users"):
        pass

    with Then("I check both users have access to the dashboard"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_MultiUserUsage_DifferentDashboards("1.0"))
def multi_user_usage_different_dashboards(self):
    """Check that Plugin supports access to different dashboards from different users at the same time."""

    with Given("I create new user"):
        open_picture(picture="tests/manual/screenshots/create_user.png")
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
