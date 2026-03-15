from testflows.core import *

from requirements.requirements import *
from tests.automated.data_source_setup import (
    check_default_values_datetime,
    check_default_values_timestamp,
    check_default_values_datetime64,
    check_default_values_float,
    check_default_values_timestamp_64_3,
    check_default_values_timestamp_64_6,
    check_default_values_timestamp_64_9,
    check_default_context_window_10,
    check_default_context_window_20,
    check_default_context_window_50,
    check_default_context_window_100,
)


@TestFeature
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesToggle("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DefaultValuesSetup("1.0"),
)
@Name("data source setup defaults")
def feature(self):
    """Check that Plugin supports default values and context window configuration."""

    scenarios = [
        check_default_values_datetime,
        check_default_values_timestamp,
        check_default_values_datetime64,
        check_default_values_float,
        check_default_values_timestamp_64_3,
        check_default_values_timestamp_64_6,
        check_default_values_timestamp_64_9,
        check_default_context_window_10,
        check_default_context_window_20,
        check_default_context_window_50,
        check_default_context_window_100,
    ]

    for scenario in scenarios:
        scenario()
