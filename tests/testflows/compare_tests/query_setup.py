from requirements.requirements import *
from testflows.core import *
from compare_tests.steps import *


def auto_complete_in_queries(self):
    pass

def query_options(self):
    pass

@TestScenario
def reformat_query(self):
    pass


@TestFeature
@Requirements(RQ_SRS_Plugin_QuerySetup("1.0"),
              RQ_SRS_Plugin_QuerySetupInterface("1.0"))
@Name("query setup")
def feature(self):
    """Check that Plugin supports query setup."""

    for scenario in loads(current_module(), Scenario):
        scenario()