from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
@Okayed("Ok")
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
        note("create table ch(time timestamp, x UInt8) engine = MergeTree order by time")
        note("insert into ch select now() -1000 + number*10 , number from numbers(100)")
        create_table()

    with When("I create visualizations for this table using rate function for different plugin versions"):
        note("$rate(countIf(x <10) AS good, countIf(x > 10) AS bad) FROM ch")
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/rate_function.png")
        pass


@TestScenario
@Okayed("Ok")
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
        note("create table ch(time timestamp, x UInt8) engine = MergeTree order by time")
        note("insert into ch select now() -1000 + number*10 , number from numbers(100)")
        create_table()

    with When("I create visualizations for this table using columns function for different plugin versions"):
        note("$columns(x, count(*) c) FROM ch")
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/column_function.png")
        pass


@TestScenario
@Okayed("Ok")
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
        note("create table ch(time timestamp, x UInt8) engine = MergeTree order by time")
        note("insert into ch select now() -1000 + number*10 , number from numbers(100)")
        create_table()

    with When("I create visualizations for this table using rateColumns function for different plugin versions"):
        note("$rateColumns(x, count(*) c) FROM ch")
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/rateColumns_function.png")
        pass


@TestScenario
@Okayed("Ok")
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
        note("create table ch(time timestamp, x UInt8) engine = MergeTree order by time")
        note("insert into ch select now() -1000 + number*10 , number from numbers(100)")
        create_table()

    with When("I create visualizations for this table using perSecond function for different plugin versions"):
        note("$perSecond(x) FROM ch")
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/perSecond_function.png")
        pass


@TestScenario
@Okayed("Ok")
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
        note("create table ch(time timestamp, x UInt8) engine = MergeTree order by time")
        note("insert into ch select now() -1000 + number*10 , number from numbers(100)")
        create_table()

    with When("I create visualizations for this table using perSecondColumns function for different plugin versions"):
        note("$perSecondColumns(time, x) FROM ch WHERE x > 10")
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/perSecondColumn_function.png")
        pass


@TestScenario
@Okayed("Ok")
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
        note("create table ch(time timestamp, x UInt8) engine = MergeTree order by time")
        note("insert into ch select now() -1000 + number*10 , number from numbers(100)")
        create_table()

    with When("I create visualizations for this table using delta function for different plugin versions"):
        note("$delta(x) FROM ch")
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/delta_function.png")
        pass


@TestScenario
@Okayed("Ok")
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
        note("create table ch(time timestamp, x UInt8) engine = MergeTree order by time")
        note("insert into ch select now() -1000 + number*10 , number from numbers(100)")
        create_table()

    with When("I create visualizations for this table using deltaColumns function for different plugin versions"):
        note("$deltaColumns(x, x) FROM ch")
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/deltaColumns_function.png")
        pass


@TestScenario
@Okayed("Ok")
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
        note("create table ch(time timestamp, x UInt8) engine = MergeTree order by time")
        note("insert into ch select now() number*100 , number from numbers(100)")
        create_table()

    with When("I create visualizations for this table using increase function for different plugin versions"):
        note("$increase(x) FROM ch")
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/increase_function.png")
        pass


@TestScenario
@Okayed("Ok")
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
        note("create table ch(time timestamp, x UInt8) engine = MergeTree order by time")
        note("insert into ch select now() number*100 , number from numbers(100)")
        create_table()

    with When("I create visualizations for this table using increaseColumns function for different plugin versions"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/increaseColumns_function.png")
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_Functions("1.0"))
@Name("functions")
def feature(self):
    """Check that Plugin support functions in SQL queries."""

    for scenario in loads(current_module(), Scenario):
        scenario()
