from testflows.core import *
from steps.delay import delay
from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor

from requirements.requirements import *


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_Table("1.0"))
def table(self):
    """Check that grafana plugin supports $table macro."""

    with Given("I define a query"):
        query = define("query", "SELECT '$table'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    with Then("I check reformatted query contains table name"):
        with delay():
            assert "default.test_alerts" in sql_editor.get_reformatted_query(query_name='A'), error()


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_DateCol("1.0"))
def dateCol(self):
    """Check that grafana plugin supports $dateCol macro."""

    with Given("I define a query"):
        query = define("query", "SELECT '$dateCol'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    with Then("I check reformatted query contains dateCol"):
        with delay():
            assert "EventDate" in sql_editor.get_reformatted_query(query_name='A'), error()


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_DateTimeCol("1.0"))
def dateTimeCol(self):
    """Check that grafana plugin supports $dateTimeCol macro."""

    with Given("I define a query"):
        query = define("query", "SELECT '$dateTimeCol'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    with Then("I check reformatted query contains dateTimeCol"):
        with delay():
            assert "EventTime" in sql_editor.get_reformatted_query(query_name='A'), error()


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_Interval("1.0"))
def interval(self):
    """Check that grafana plugin supports $interval macro."""

    with Given("I define a query"):
        query = define("query", "SELECT '$interval'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    with Then("I check reformatted query contains interval"):
        with delay():
            assert "30" in sql_editor.get_reformatted_query(query_name='A'), error()


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_TimeFilterByColumn("1.0"))
def timeFilter(self):
    """Check that grafana plugin supports $timeFilter macro."""

    with Given("I define a query"):
        query = define("query", "SELECT '$timeFilter'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    with Then("I check reformatted query contains timeFilter"):
        with delay():
            assert "EventDate >= toDate" in sql_editor.get_reformatted_query(query_name='A'), error()
            assert "EventDate <= toDate" in sql_editor.get_reformatted_query(query_name='A'), error()
            assert "EventTime >= toDateTime" in sql_editor.get_reformatted_query(query_name='A'), error()
            assert "EventTime <= toDateTime" in sql_editor.get_reformatted_query(query_name='A'), error()



@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_TimeFilterByColumn("1.0"))
def timeFilterByColumn(self):
    """Check that grafana plugin supports $timeFilterByColumn macro."""

    with Given("I define a query"):
        query = define("query", "SELECT '$timeFilterByColumn(column_name)'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    with Then("I check reformatted query contains timeFilterByColumn"):
        with delay():
            assert "column_name >= toDateTime" in sql_editor.get_reformatted_query(query_name='A'), error()
            assert "column_name <= toDateTime" in sql_editor.get_reformatted_query(query_name='A'), error()


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_TimeSeries("1.0"))
def timeSeries(self):
    """Check that grafana plugin supports $timeSeries macro."""

    with Given("I define a query"):
        query = define("query", "SELECT '$timeSeries'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    with Then("I check reformatted query contains timeSeries"):
        with delay():
            assert "(intDiv(toUInt32(EventTime), 30) * 30) * 1000" in sql_editor.get_reformatted_query(query_name='A'), error()


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_NaturalTimeSeries("1.0"))
def naturalTimeSeries(self):
    """Check that grafana plugin supports $naturalTimeSeries macro."""

    with Given("I define a query"):
        query = define("query", "SELECT '$naturalTimeSeries'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    with Then("I check reformatted query contains naturalTimeSeries"):
        with delay():
            assert "toUInt32(toStartOfFiveMinute(EventTime)) * 1000" in sql_editor.get_reformatted_query(query_name='A'), error()


@TestScenario
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros_Unescape("1.0"))
def unescape(self):
    """Check that grafana plugin supports unescape macro."""

    with Given("I define a query"):
        query = define("query", "SELECT '$unescape('1')'")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    with Then("I check reformatted query contains unescape"):
        with delay():
            assert "SELECT '1'" in sql_editor.get_reformatted_query(query_name='A'), error()


@TestFeature
@Requirements(RQ_SRS_Plugin_QuerySettings_Macros("1.0"))
@Name("macros")
def feature(self):
    """Check that grafana plugin supports macros."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "test_macros")

    with When("I create new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='macros', url="http://clickhouse:8123",)

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name=dashboard_name)

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with When("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name='macros')

    with When("I setup query settings for queries"):
        with delay():
            actions.setup_query_settings()

    with When("I open SQL editor"):
        with delay():
            panel.go_to_sql_editor()

    with Then("I click Show generated SQL button",
              description="opened to check reformatted queries in scenarios"):
        with delay():
            sql_editor.click_show_generated_sql_button(query_name='A')

    for scenario in loads(current_module(), Scenario):
        scenario()