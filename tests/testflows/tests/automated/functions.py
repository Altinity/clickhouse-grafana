from os import listdir
from testflows.core import *
from steps.delay import delay

from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor
import steps.panel.query_options.view as query_options

from requirements.requirements import *

@TestCheck
def function_check(self, query, expected_reformatted_query):
    """Check that grafana plugin supports functions correctly."""

    with Given("I define a query"):
        query = define("query", query)

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the run query"):
        with delay():
            panel.click_run_query_button()


    with Then("I check reformatted query"):
        with delay():
            assert expected_reformatted_query in sql_editor.get_reformatted_query(query_name='A'), error()


@TestOutline
def function(self, function_name):
    """Check that grafana plugin supports functions correctly."""

    with Given(f"I define tests for {function_name} function"):
        tests = [f for f in listdir(f"{self.context.project_root_dir}/tests/testflows/tests/automated/functions/{function_name}/")]

    for test in tests:
        with Check(test):
            f = open(f"{self.context.project_root_dir}/tests/testflows/tests/automated/functions/{function_name}/" + test)
            input_query = define("input_query", f.readline())[0:-1]
            expected_output = define("expected_output", f.readline())
            f.close()
            Check(test=function_check)(query=input_query, expected_reformatted_query=expected_output)


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_Columns("1.0"))
def columns_function(self):
    """Check that grafana plugin supports $columns function."""

    function(function_name="columns")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_Delta("1.0"))
def delta_function(self):
    """Check that grafana plugin supports $delta function."""

    function(function_name="delta")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_DeltaColumns("1.0"))
def deltaColumns_function(self):
    """Check that grafana plugin supports $deltaColumns function."""

    function(function_name="deltaColumns")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_DeltaColumnsAggregated("1.0"))
def deltaColumnsAggregated_function(self):
    """Check that grafana plugin supports $deltaColumnsAggregated function."""

    function(function_name="deltaColumnsAggregated")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_Increase("1.0"))
def increase_function(self):
    """Check that grafana plugin supports $increase function."""

    function(function_name="increase")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_IncreaseColumns("1.0"))
def increaseColumns_function(self):
    """Check that grafana plugin supports $increaseColumns function."""

    function(function_name="increaseColumns")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_IncreaseColumnsAggregated("1.0"))
def increaseColumnsAggregated_function(self):
    """Check that grafana plugin supports $increaseColumnsAggregated function."""

    function(function_name="increaseColumnsAggregated")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_PerSecond("1.0"))
def perSecond_function(self):
    """Check that grafana plugin supports $perSecond function."""

    function(function_name="perSecond")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_PerSecondColumns("1.0"))
def perSecondColumns_function(self):
    """Check that grafana plugin supports $perSecondColumns function."""

    function(function_name="perSecondColumns")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_PerSecondColumnsAggregated("1.0"))
def perSecondColumnsAggregated_function(self):
    """Check that grafana plugin supports $perSecondColumnsAggregated function."""

    function(function_name="perSecondColumnsAggregated")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_Rate("1.0"))
def rate_function(self):
    """Check that grafana plugin supports $rate function."""

    function(function_name="rate")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_RateColumns("1.0"))
def rateColumns_function(self):
    """Check that grafana plugin supports $rateColumns function."""

    function(function_name="rateColumns")


@TestScenario
@Requirements(RQ_SRS_Plugin_Functions_RateColumnsAggregated("1.0"))
def rateColumnsAggregated_function(self):
    """Check that grafana plugin supports $rateColumnsAggregated function."""

    function(function_name="rateColumnsAggregated")


@TestFeature
@Requirements(
    RQ_SRS_Plugin_Functions("1.0"),
)
@Name("functions")
def feature(self):
    """Check that grafana plugin supports query options."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "functions")

    with When("I create new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='functions', url="http://clickhouse:8123",)

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name=dashboard_name)

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with When("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name='functions')

    with When("I open SQL editor"):
        with delay():
            panel.go_to_sql_editor()

    with When("I turn off window functions"):
        with delay():
            sql_editor.click_use_window_functions_toggle(query_name='A')

    with Then("I click Show generated SQL button",
              description="opened to check reformatted queries in scenarios"):
        with delay():
            sql_editor.click_show_generated_sql_button(query_name='A')

    for scenario in loads(current_module(), Scenario):
        scenario()
