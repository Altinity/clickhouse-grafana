from requirements.requirements import *
from testflows.core import *
from compare_tests.steps import *


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_Table("1.0"))
def table(self):
    """Check that the Plugin support $table macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I specify Table in Query Settings tab"):
        pass

    with When("I create visualizations for this table using $table macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_DateCol("1.0"))
def dateCol(self):
    """Check that the Plugin support $dateCol macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: Date, "
                           "UInt8"):
        create_table()

    with When("I specify Column:Date in Query Settings tab"):
        pass

    with When("I create visualizations for this table using $dateCol macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_DateTimeCol("1.0"))
def dateTimeCol(self):
    """Check that the Plugin support $dateTimeCol macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: DateTime, "
                           "UInt8"):
        create_table()

    with When("I specify Column:DateTime in Query Settings tab"):
        pass

    with When("I create visualizations for this table using $dateTimeCol macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_From("1.0"))
def from_macro(self):
    """Check that the Plugin support $from macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using $from macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_To("1.0"))
def to(self):
    """Check that the Plugin support $to macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using $to macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_Interval("1.0"))
def interval(self):
    """Check that the Plugin support $to macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using $interval macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_TimeFilterByColumn("1.0"))
def timeFilterByColumn(self):
    """Check that the Plugin support $timeFilterByColumn($column) macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using $timeFilterByColumn($column) macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_TimeSeries("1.0"))
def timeSeries(self):
    """Check that the Plugin support $timeSeries macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using $timeSeries macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_NaturalTimeSeries("1.0"))
def naturalTimeSeries(self):
    """Check that the Plugin support $naturalTimeSeries macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using $naturalTimeSeries macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_Unescape("1.0"))
def unescape(self):
    """Check that the Plugin support $unescape($variable) macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using $unescape($variable) macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_Adhoc("1.0"))
def adhoc(self):
    """Check that the Plugin support $adhoc macro."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When("I create visualizations for this table using $adhoc macro"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros("1.0"))
@Name("macros")
def feature(self):
    """Check that Plugin support macros in SQL queries."""

    for scenario in loads(current_module(), Scenario):
        scenario()
