from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
@Okayed("Ok")
def query_inspector_data_tab(self):
    """Check that Plugin support Data tab in query inspector"""

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

    with When("I go press Query inspector button"):
        pass

    with When("I go to Data tab"):
        pass

    with Then("I check data in Data tab is correct and the same for different Plugin versions"):
        open_picture(picture="tests/manual/screenshots/data_tab.png")
        pass


@TestScenario
@Okayed("Ok")
def query_inspector_stats_tab(self):
    """Check that Plugin support Stats tab in query inspector"""

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

    with When("I go press Query inspector button"):
        pass

    with When("I go to Stats tab"):
        pass

    with Then("I check stats in Stats tab is correct and the same for different Plugin versions"):
        open_picture(picture="tests/manual/screenshots/stats_tab.png")
        pass


@TestScenario
@Okayed("Ok")
def query_inspector_json_tab(self):
    """Check that Plugin support JSON tab in query inspector"""

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

    with When("I go press Query inspector button"):
        pass

    with When("I go to JSON tab"):
        pass

    with Then("I check query in JSON tab is correct and the same for different Plugin versions"):
        open_picture(picture="tests/manual/screenshots/JSON_tab.png")
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_QueryInspector_QueryTab)
def query_inspector_query_tab(self):
    """Check that Plugin support Query tab in query inspector"""

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

    with When("I go press Query inspector button"):
        pass

    with When("I go to Query tab"):
        pass

    with Then("I check data in Query tab is correct and the same for different Plugin versions"):
        open_picture(picture="tests/manual/screenshots/query_tab.png")
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_QueryInspector("1.0"))
@Name("query inspector")
def feature(self):
    """Check that Plugin support query inspector."""

    for scenario in loads(current_module(), Scenario):
        scenario()
