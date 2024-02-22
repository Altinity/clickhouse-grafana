from requirements.requirements import *
from testflows.core import *
from compare_tests.steps import *


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_Rate("1.0"))
def rate(self):
    """Check that the Plugin support $rate function."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using rate function for different plugin versions"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_Columns("1.0"))
def columns(self):
    """Check that the Plugin support $columns function."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using columns function for different plugin versions",
              description="query for visualization contain fill option"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_RateColumns("1.0"))
def rateColumns(self):
    """Check that the Plugin support $rateColumns function."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using rateColumns function for different plugin versions"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_PerSecond("1.0"))
def perSecond(self):
    """Check that the Plugin support $perSecond function."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using perSecond function for different plugin versions"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_PerSecondColumns("1.0"))
def perSecondColumns(self):
    """Check that the Plugin support $perSecondColumns function."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using perSecondColumns function for different plugin versions"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_Delta("1.0"))
def delta(self):
    """Check that the Plugin support $delta function."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using delta function for different plugin versions"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_DeltaColumns("1.0"))
def deltaColumns(self):
    """Check that the Plugin support $deltaColumns function."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using deltaColumns function for different plugin versions"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_Increase("1.0"))
def increase(self):
    """Check that the Plugin support $increase function."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using increase function for different plugin versions"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_IncreaseColumns("1.0"))
def increaseColumns(self):
    """Check that the Plugin support $increaseColumns function."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using increaseColumns function for different plugin versions"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_Functions("1.0"))
@Name("functions")
def feature(self):
    """Check that Plugin support functions in SQL queries."""

    for scenario in loads(current_module(), Scenario):
        scenario()
