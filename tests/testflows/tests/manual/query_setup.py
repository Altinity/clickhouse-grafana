from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_QuerySetupInterface("1.0"))
def ui_check(self):
    """Check that query setup interface displayed correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with Then("I check query setup interface"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_QuerySetup("1.0"))
@Name("query setup")
def feature(self):
    """Check that Plugin supports query setup."""

    for scenario in loads(current_module(), Scenario):
        scenario()