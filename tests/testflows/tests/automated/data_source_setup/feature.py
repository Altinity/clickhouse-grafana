from testflows.core import *

from requirements.requirements import *


@TestFeature
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DataSourceName("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_SaveAndTestButton("1.0"),
    RQ_SRS_Plugin_Dashboards("1.0"),
    RQ_SRS_Plugin_Panels("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_ServerAccess("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection("1.0"),
)
@Name("data source setup")
def feature(self):
    """Check that Plugin supports Grafana datasource setup (all sub-features)."""

    Feature(run=load("tests.automated.data_source_setup.connection", "feature"))
    Feature(run=load("tests.automated.data_source_setup.settings", "feature"))
    Feature(run=load("tests.automated.data_source_setup.default_values", "feature"))
