from testflows.core import *
from steps.delay import delay
from testflows.asserts import error


import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor

from requirements.requirements import *

help_macros = """$table - replaced with selected table name from Query Builder
$dateCol - replaced with Date:Col value from Query Builder
$dateTimeCol - replaced with Column:DateTime or Column:TimeStamp value from Query Builder
$from - replaced with (timestamp with ms)/1000 value of UI selected "Time Range:From"
$to - replaced with (timestamp with ms)/1000 value of UI selected "Time Range:To"
$interval - replaced with selected "Group by time interval" value (as a number of seconds)
$timeFilter - replaced with currently selected "Time Range". Require Column:Date and Column:DateTime or Column:TimeStamp to be selected
$timeSeries - replaced with special ClickHouse construction to convert results as time-series data. Use it as "SELECT $timeSeries...". Require Column:DateTime or Column:TimeStamp to be selected
$naturalTimeSeries - replaced with special ClickHouse construction to convert results as time-series data in logical/natural units. Use it as "SELECT $naturalTimeSeries...". Require Column:DateTime or Column:TimeStamp to be selected
$unescape - unescapes variable value by removing single quotes. Used for multiple-value string variables: "SELECT $unescape($column) FROM requests WHERE $unescape($column) = 5"
$adhoc - replaced with a rendered ad-hoc filter expression, or "1" if no ad-hoc filters exist
$conditionalTest - add `SQL predicate` filter expression only if $variable have non empty value
A description of macros is available by typing their names in Raw Editor"""

help_functions = """$rate(cols...) - function to convert query results as "change rate per interval". Example usage: $rate(countIf(Type = 200) * 60 AS good, countIf(Type != 200) * 60 AS bad) FROM requests
$columns(key, value) - function to query values as an array of [key, value], where key would be used as a label. Example usage: $columns(Type, count() c) FROM requests
$rateColumns(key, value) - is a combination of $columns and $rate. Example usage: $rateColumns(Type, count() c) FROM requests"""


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_AddMetadata("1.0"))
def add_metadata_toggle(self):
    """Check that grafana plugin supports Add metadata toggle."""

    with Given("I define a query"):
        query = define("query", "SELECT now() - number * 1000, number FROM numbers(10)")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

        with Then("I click on the visualization to see results"):
            with delay():
                panel.click_on_the_visualization()

        with Then("I check reformatted query"):
            assert "/* grafana dashboard=a_test_sql_editor, user=1 */" in sql_editor.get_reformatted_query(query_name='A'), error()

    try:
        with Then("I click Add metadata toggle"):
            with delay():
                sql_editor.click_add_metadata_toggle(query_name='A')

        with Then("I check reformatted query after clicking toggle"):
            with delay():
                assert not ("/* grafana dashboard=a_test_sql_editor, user=1 */" in sql_editor.get_reformatted_query(query_name='A')), error()

    finally:
        with Finally("I return Add metadata toggle status back"):
            with delay():
                sql_editor.click_add_metadata_toggle(query_name='A')


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_Step("1.0"))
def step_textfield(self):
    """Check that grafana plugin supports Step textfield."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    try:
        with Then("I enter step in seconds"):
            with delay():
                sql_editor.enter_step(query_name='A', step="100s")

        with Then("I check reformatted query after entering step in seconds"):
            with delay():
                assert "100" in sql_editor.get_reformatted_query(query_name='A'), error()

        with Then("I enter step in minutes"):
            with delay():
                sql_editor.enter_step(query_name='A', step="100m")

        with Then("I check reformatted query after entering step in minutes"):
            with delay():
                assert f"{100*60}" in sql_editor.get_reformatted_query(query_name='A'), error()

        with Then("I enter step in days"):
            with delay():
                sql_editor.enter_step(query_name='A', step="100d")

        with Then("I check reformatted query after entering step in days"):
            with delay():
                assert f"{100*60*60*24}" in sql_editor.get_reformatted_query(query_name='A'), error()

    finally:
        with Finally("I return Step textfield value back"):
            sql_editor.enter_step(query_name='A', step="")


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_Round("1.0"))
def round_textfield(self):
    """Check that grafana plugin supports Round textfield."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    try:
        with Then("I enter round"):
            with delay():
                sql_editor.enter_round(query_name='A', round="100s")

        with Then("I check reformatted contains rounded by 100s 'time from' and 'time to'"):
            with delay():
                assert (sql_editor.get_time_from_in_seconds(query_name='A') % 100) == 0, error()
                assert (sql_editor.get_time_to_in_seconds(query_name='A') % 100) == 0, error()

        with Then("I enter another round"):
            with delay():
                sql_editor.enter_round(query_name='A', round="10000s")

        with Then("I check reformatted query contains rounded by 10000s 'time from' and 'time to'"):
            with delay():
                assert (sql_editor.get_time_from_in_seconds(query_name='A') % 10000) == 0, error()
                assert (sql_editor.get_time_to_in_seconds(query_name='A') % 10000) == 0, error()
    finally:
        with Finally("I return Round textfield value back"):
            with delay():
                sql_editor.enter_round(query_name='A', round="0s")


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_Resolution("1.0"))
def resolution_dropdown(self):
    """Check that grafana plugin supports Resolution dropdown."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with Given("I define an array of resolutions that will be checked"):
        resolutions = define("resolutions", ['1/1', '1/2', '1/3', '1/4', '1/5', '1/10'])

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    try:
        with Then("I enter step"):
            with delay():
                sql_editor.enter_step(query_name='A', step="100s")

        for resolution in resolutions:
            with Then(f"I change resolution to {resolution}"):
                with delay():
                    sql_editor.enter_resolution(query_name='A', resolution=resolution)

            with Then(f"I check {resolution} resolution applied to reformatted query"):
                with delay():
                    assert f'{int(resolution[2:])*100}' in sql_editor.get_reformatted_query(query_name='A'), error()

    finally:
        with Finally("I return Step textfield and Resolution dropdown values back"):
            with delay():
                sql_editor.enter_resolution(query_name='A', resolution='1/1')
                sql_editor.enter_step(query_name='A', step="")


@TestOutline
def format_as_dropdown(self, format_as, columns, table_error=False):
    """Check that grafana plugin supports Format As dropdown."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    try:
        with When("I click table view toggle"):
            panel.click_table_view_toggle()

        with Then("I check table contains 'Time' and 'count()' columns"):
            panel.check_columns_in_table_view(columns=['Time', 'count()'])

        with Then("I change format as"):
            with delay():
                sql_editor.enter_format_as(query_name='A', format_as=format_as)

            with When("I click on run query button"):
                panel.click_run_query_button()

        if table_error:
            with Then("I check table error exists"):
                assert panel.check_error_for_table_view() is True, error()

        elif len(columns) == 0:
            with Then("I check table contains no data"):
                assert panel.check_no_data_text() is True, error()

        else:
            with Then("I check table contains expected columns"):
                assert panel.check_columns_in_table_view(columns=columns) is True, error()

    finally:
        with Finally("I return Format As dropdown value back"):
            with delay():
                sql_editor.enter_format_as(query_name='A', format_as='Time series')

        with And("I turn table view back"):
            with delay():
                panel.click_table_view_toggle()


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_FormatAs("1.0"))
def format_as_dropdown_table(self):
    """Check that grafana plugin supports specifying Format As dropdown as Table."""

    format_as_dropdown(format_as='Table', columns=['t', 'count()'], table_error=False)


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_FormatAs("1.0"))
def format_as_dropdown_logs(self):
    """Check that grafana plugin supports specifying Format As dropdown as Logs."""

    format_as_dropdown(format_as='Logs', columns=[], table_error=False)


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_FormatAs("1.0"))
def format_as_dropdown_traces(self):
    """Check that grafana plugin supports specifying Format As dropdown as Traces."""

    format_as_dropdown(format_as='Traces', columns=[], table_error=True)


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_FormatAs("1.0"))
def format_as_dropdown_flame_graph(self):
    """Check that grafana plugin supports specifying Format As dropdown as Flame Graph."""

    format_as_dropdown(format_as='Flame Graph', columns=['label', 'level', 'value', 'self'], table_error=False)


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_ShowHelp("1.0"))
def help_button(self):
    """Check that grafana plugin supports Show help button."""

    try:
        with Then("I click Show help button"):
            with delay():
                sql_editor.click_show_help_button(query_name='A')

        with (Then("I check show help message")):
            with delay():
                assert help_macros in sql_editor.get_help_text(query_name='A'), error()
                assert help_functions in sql_editor.get_help_text(query_name='A'), error()
    finally:
        with Finally("I collapse help text"):
            with delay():
                sql_editor.click_show_help_button(query_name='A')


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_Extrapolation("1.0"))
def extrapolation_toggle(self):
    """Check that grafana plugin supports Extrapolation toggle."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    try:
        with Then("I enter step"):
            with delay():
                sql_editor.enter_step(query_name='A', step="100s")

        with Then("I click on run query button to see results"):
            with delay():
                panel.click_run_query_button()
                
        with Then("I check extrapolation toggle works correctly"):
            for attempt in retries(delay=10, count=12):
                with attempt:
                    with When("I click on run query button to see results with turned on extrapolation"):
                        panel.click_run_query_button()

                    with When("I take screenshot with extrapolation"):
                        panel.take_screenshot_for_visualization(screenshot_name='extrapolation_toggle_on')

                    with When("I click on the extrapolation toggle to turn extrapolation off"):
                        sql_editor.click_extrapolation_toggle(query_name='A')

                    with When("I click on run query button to see results with turned off extrapolation"):
                        panel.click_run_query_button()

                    with When("I take screenshot without extrapolation"):
                        panel.take_screenshot_for_visualization(screenshot_name='extrapolation_toggle_off')

                    with When("I click on the extrapolation toggle to turn extrapolation on"):
                        sql_editor.click_extrapolation_toggle(query_name='A')

                    with Then("I check screenshots are different"):
                        assert not(actions.compare_screenshots(screenshot_name_1='extrapolation_toggle_on', screenshot_name_2='extrapolation_toggle_off'))

    finally:
        with Finally("I return Step textfield and Resolution dropdown values back"):
            with delay():
                sql_editor.enter_step(query_name='A', step="")


@TestOutline
def skip_comments_toggle(self, query):
    """Check that grafana plugin supports Skip Comments toggle."""

    with When("I enter query in SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the visualization to see results"):
        with delay():
            panel.click_on_the_visualization()

    try:
        with Then("I check reformatted query does not contain the comment"):
            assert not ("COMMENT" in sql_editor.get_reformatted_query(query_name='A')), error()

        with Then("I click Skip Comments toggle", description="to allow user to see the comment"):
            with delay():
                sql_editor.click_skip_comments_toggle(query_name='A')

        with Then("I check reformatted query contains the comment"):
            with delay():
                assert "COMMENT" in sql_editor.get_reformatted_query(query_name='A'), error()

    finally:
        with Finally("I return Skip Comments toggle status back"):
            with delay():
                sql_editor.click_skip_comments_toggle(query_name='A')


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_SkipComments("1.0"))
def multiline_comment(self):
    """Check that grafana plugin supports Skip Comments toggle with multiline comments."""

    with Given("I define a query that contains a comment"):
        query = define("query",
                       "SELECT now() - number * 1000, number FROM numbers(10) /*\nCOMMENT*/")

    skip_comments_toggle(query=query)


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_SkipComments("1.0"))
def double_dash_comment(self):
    """Check that grafana plugin supports Skip Comments toggle with multiline comments."""

    with Given("I define a query that contains a comment"):
        query = define("query",
                       "SELECT now() - number * 1000, number FROM numbers(10) --COMMENT")

    skip_comments_toggle(query=query)


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_SkipComments("1.0"))
def hash_comment(self):
    """Check that grafana plugin supports Skip Comments toggle with multiline comments."""

    with Given("I define a query that contains a comment"):
        query = define("query",
                       "SELECT now() - number * 1000, number FROM numbers(10) #COMMENT")

    skip_comments_toggle(query=query)


@TestScenario
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_SkipComments("1.0"))
def hash_exclamation_comment(self):
    """Check that grafana plugin supports Skip Comments toggle with multiline comments."""

    with Given("I define a query that contains a comment"):
        query = define("query",
                       "SELECT now() - number * 1000, number FROM numbers(10) #!COMMENT")

    skip_comments_toggle(query=query)


@TestFeature
@Requirements(
    RQ_SRS_Plugin_RawSQLEditorInterface("1.0"),
    RQ_SRS_Plugin_RawSQLEditorInterface_ShowGeneratedSQL("1.0"),
    RQ_SRS_Plugin_QuerySetup("1.0"),
    RQ_SRS_Plugin_QuerySettings("1.0"),
    RQ_SRS_Plugin_RawSQLEditorInterface_SQLEditor("1.0")
)
@Name("sql editor")
def feature(self):
    """Check that grafana plugin supports SQL Editor options."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "a_test_sql_editor")

    with When("I create new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='sql_editor', url="http://clickhouse:8123",)

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name=dashboard_name)

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with When("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name='sql_editor')

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