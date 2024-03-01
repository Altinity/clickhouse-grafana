from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
@XFailed("Can't specify query")
@Requirements(RQ_SRS_Plugin_Annotations("1.0"))
def annotations(self):
    """Check that annotations works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with When("I go to annotation setup page", description="click 'Dashboard settings' button >"
                                                           " go to Annotations tab >"
                                                           " click 'Add annotation query' button"):
        pass

    with When("I setup annotation for clickhouse dashboard"):
        open_picture(picture="tests/manual/screenshots/annotations_setup_page.png")
        pass

    with And("I go to repeated postgres panel"):
        pass

    with Then("I check that annotations are appeared in dashboard"):
        pass


@TestFeature
@Name("annotations")
def feature(self):
    """Check that Plugin support annotations in SQL queries."""

    for scenario in loads(current_module(), Scenario):
        scenario()
