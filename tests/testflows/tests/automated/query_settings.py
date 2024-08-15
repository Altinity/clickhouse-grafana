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


@TestScenario
@Requirements(RQ_SRS_Plugin_QueryOptions_MaxDataPoints("1.0"))
def max_data_points(self):
    """Check that grafana plugin supports specifying max data points using query options."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the run query"):
        with delay():
            panel.click_run_query_button()

    with Then("I check default interval"):
        with delay():
            assert query_options.get_interval_value() == '20s', error()

    try:
        with Then("I enter 'Max data points'"):
            with delay():
                query_options.enter_max_data_points(max_data_points='6')

        with Then("I click on the run query"):
            with delay():
                panel.click_run_query_button()

        with Then("I check reformatted query after clicking toggle"):
            with delay():
                assert "intDiv(toUInt32(EventTime), 3600) * 3600" in sql_editor.get_reformatted_query(query_name='A'), error()

        with Then("I check Interval text field is changed"):
            with delay():
                assert query_options.get_interval_value() == '1h', error()

    finally:
        with Finally("I return 'Max data points' text field back"):
            with delay():
                query_options.enter_max_data_points(max_data_points='')


@TestScenario
@Requirements(RQ_SRS_Plugin_QueryOptions_MinInterval("1.0"))
def min_interval(self):
    """Check that grafana plugin supports specifying 'Min interval' textfield."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the run query"):
        with delay():
            panel.click_run_query_button()

    with Then("I check default interval"):
        with delay():
            assert query_options.get_interval_value() == '20s', error()

    try:
        with Then("I enter 'Min interval'"):
            with delay():
                query_options.enter_min_interval(min_interval='5m')

        with Then("I click on the run query"):
            with delay():
                panel.click_run_query_button()

        with Then("I check reformatted query after clicking toggle"):
            with delay():
                assert "intDiv(toUInt32(EventTime), 300) * 300" in sql_editor.get_reformatted_query(query_name='A'), error()

        with Then("I check Interval text field is changed"):
            with delay():
                assert query_options.get_interval_value() == '5m', error()

    finally:
        with Finally("I return 'Min interval' text field back"):
            with delay():
                query_options.enter_min_interval(min_interval='')


@TestScenario
@Requirements(RQ_SRS_Plugin_QueryOptions_TimeShift("1.0"))
def time_shift(self):
    """Check that grafana plugin supports specifying 'Time shift' textfield."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the run query"):
        with delay():
            panel.click_run_query_button()

    with When("I get time from and time to from reformatted query"):
        with delay():
            time_from_before_time_shift = sql_editor.get_time_to_in_seconds(query_name='A')
            time_to_before_time_shift = sql_editor.get_time_to_in_seconds(query_name='A')
    try:
        with Then("I enter 'Time shift'"):
            with delay():
                query_options.enter_time_shift(time_shift='3h')

        with Then("I click on the run query"):
            with delay():
                panel.click_run_query_button()

        with Then("I check reformatted query contains properly defined time from and time to"):
            with delay():
                assert time_to_before_time_shift - sql_editor.get_time_to_in_seconds(query_name='A') > 3*60*60 - 60, error()
                assert time_from_before_time_shift - sql_editor.get_time_from_in_seconds(query_name='A') > 3*60*60 - 60, error()

    finally:
        with Finally("I return 'Time shift' text field back"):
            with delay():
                query_options.enter_time_shift(time_shift='')


@TestScenario
@Requirements(RQ_SRS_Plugin_QueryOptions_RelativeTime("1.0"))
def relative_time(self):
    """Check that grafana plugin supports specifying 'Relative time' textfield."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with Then("I click on the run query"):
        with delay():
            panel.click_run_query_button()

    try:
        with Then("I enter 'Relative time'"):
            with delay():
                query_options.enter_relative_time(relative_time='5m')

        with Then("I click on the run query"):
            with delay():
                panel.click_run_query_button()

        with Then("I check reformatted query contains properly defined time from and time to"):
            with delay():
                assert (sql_editor.get_time_to_in_seconds(query_name='A') - sql_editor.get_time_from_in_seconds(query_name='A')) == 300, error()


    finally:
        with Finally("I return 'Relative time' text field back"):
            with delay():
                query_options.enter_relative_time(relative_time='')


@TestOutline
def hide_time_info(self, is_relative_time_specified, is_time_shift_specified):
    """Check that grafana plugin supports `Hide time info` toggle."""

    with Given("I define a query"):
        query = define("query", "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t")

    with When("I enter query to SQL editor"):
        panel.enter_sql_editor_input(query=query)

    with When("I click on the run query"):
        with delay():
            panel.click_run_query_button()

    try:
        if is_relative_time_specified:
            with When("I enter 'Relative time'"):
                with delay():
                    query_options.enter_relative_time(relative_time='5m')

        if is_time_shift_specified:
            with When("I enter 'Time shift'"):
                with delay():
                    query_options.enter_time_shift(time_shift='5m')

        with When("I click on the run query"):
            with delay():
                panel.click_run_query_button()

        with Then("I check panel title contains information about time"):
            with delay():
                assert query_options.check_relative_time_info_exists() is True, error()

        with When("I click 'Hide time info' toggle"):
            query_options.click_hide_time_info_toggle()

        with When("I click on the run query"):
            with delay():
                panel.click_run_query_button()

        with Then("I check panel title does not contain information about time"):
            with delay():
                assert query_options.check_relative_time_info_exists() is False, error()

    finally:
        with Finally("I return 'Hide time info' toggle status back"):
            with delay():
                query_options.click_hide_time_info_toggle()

        with Finally("I return 'Relative time' and 'Time shift' text fields back"):
            with delay():
                query_options.enter_relative_time(relative_time='')
                query_options.enter_time_shift(time_shift='')


@TestScenario
@Requirements(RQ_SRS_Plugin_QueryOptions_HideTimeInfo("1.0"))
def hide_time_info_with_relative_time(self):
    """Check that grafana plugin supports `Hide time info` toggle if relative time specified."""

    hide_time_info(is_relative_time_specified=True, is_time_shift_specified=False)


@TestScenario
@Requirements(RQ_SRS_Plugin_QueryOptions_HideTimeInfo("1.0"))
def hide_time_info_with_time_shift(self):
    """Check that grafana plugin supports `Hide time info` toggle if time shift specified."""

    hide_time_info(is_relative_time_specified=False, is_time_shift_specified=True)


@TestScenario
@Requirements(RQ_SRS_Plugin_QueryOptions_HideTimeInfo("1.0"))
def hide_time_info_with_relative_time_and_time_shift(self):
    """Check that grafana plugin supports `Hide time info` toggle if relative time and time shift specified."""

    hide_time_info(is_relative_time_specified=True, is_time_shift_specified=True)


@TestFeature
@Requirements(RQ_SRS_Plugin_QueryOptions("1.0"))
@Name("query options")
def feature(self):
    """Check that grafana plugin supports query options."""

    with Given("I define dashboard name for tests"):
        dashboard_name = define("dashboard_name", "a_query_settings")

    with When("I create new altinity datasource"):
        actions.create_new_altinity_datasource(datasource_name='query_editor', url="http://clickhouse:8123",)

    with Given("I create new dashboard"):
        actions.create_dashboard(dashboard_name=dashboard_name)

    with When("I add visualization for panel"):
        dashboard.add_visualization()

    with When("I select datasource"):
        with delay():
            panel.select_datasource_in_panel_view(datasource_name='query_editor')

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

    with Then("I open query options"):
        with delay():
            query_options.click_query_options_dropdown()

    for scenario in loads(current_module(), Scenario):
        scenario()