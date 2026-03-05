from testflows.core import *

from requirements.requirements import *
from tests.automated.data_source_setup.outlines import (
    check_default_values,
    check_default_context_window,
)


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_datetime(self):
    """Check that plugin supports setting up default values with DateTime timestamp type."""

    check_default_values(
        default_column_timestamp_type="DateTime",
        default_datetime_field="EventTime",
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'EventTime'",
    )


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_timestamp(self):
    """Check that plugin supports setting up default values with timestamp default timestamp type."""

    check_default_values(
        default_column_timestamp_type="timestamp",
        default_timestamp_field="level",
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'level'",
    )


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_datetime64(self):
    """Check that plugin supports setting up default values with DateTime64 timestamp type."""

    check_default_values(
        default_column_timestamp_type="DateTime64",
        default_datetime64_field="d64",
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'd64'",
    )


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_float(self):
    """Check that plugin supports setting up default values with Float timestamp type."""

    check_default_values(
        default_column_timestamp_type="Float",
        default_float_field="move_factor",
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'move_factor'",
    )


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_timestamp_64_3(self):
    """Check that plugin supports setting up default values with Timestamp64(3) timestamp type."""

    check_default_values(
        default_column_timestamp_type="Timestamp64(3)",
        default_timestamp_64_3_field="file_size",
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'file_size'",
    )


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_timestamp_64_6(self):
    """Check that plugin supports setting up default values with Timestamp64(6) timestamp type."""

    check_default_values(
        default_column_timestamp_type="Timestamp64(6)",
        default_timestamp_64_6_field="active_parts",
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'active_parts'",
    )


@TestScenario
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0")
)
def check_default_values_timestamp_64_9(self):
    """Check that plugin supports setting up default values with Timestamp64(9) timestamp type."""

    check_default_values(
        default_column_timestamp_type="Timestamp64(9)",
        default_timestamp_64_9_field="errors",
        default_date_field="EventDate",
        check_reformatted_query="SELECT 'EventDate', 'errors'",
    )


@TestScenario
def check_default_context_window_10(self):
    """Check default context window for 10 entries."""

    check_default_context_window(default_context_window="10 entries")


@TestScenario
def check_default_context_window_20(self):
    """Check default context window for 20 entries."""

    check_default_context_window(default_context_window="20 entries")

@TestScenario
def check_default_context_window_50(self):
    """Check default context window for 50 entries."""

    check_default_context_window(default_context_window="50 entries")

@TestScenario
def check_default_context_window_100(self):
    """Check default context window for 100 entries."""

    check_default_context_window(default_context_window="100 entries")


@TestFeature
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0"),
)
@Name("data source setup default values")
def feature(self):
    """Check that Plugin supports default values and context window configuration."""

    for scenario in loads(current_module(), Scenario):
        scenario()
