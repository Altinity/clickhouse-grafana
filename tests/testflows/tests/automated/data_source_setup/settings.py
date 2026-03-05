from testflows.core import *

from requirements.requirements import *
from tests.automated.data_source_setup.outlines import check_creating_datasource_and_panel


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_UsePostRequests("1.0"),)
def check_success_use_post_method(self):
    """Check that altinity datasources with `Use POST method` toggle turned on use post http requests."""
    check_creating_datasource_and_panel(
        datasource_name="test_post_method_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        use_post_method=True,
        query="INSERT INTO default.test_alerts select 'test', now() - number, now() - number, number from numbers(10)",
        check_visualization=False,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_UsePostRequests("1.0"))
def check_fail_use_post_method(self):
    """Check that altinity datasources with `Use POST method` toggle turned off use get http requests."""
    check_creating_datasource_and_panel(
        datasource_name="test_post_method_not_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        use_post_method=False,
        query="INSERT INTO default.test_alerts select 'test', now() - number, now() - number, number from numbers(10)",
        check_visualization=False,
        check_visualization_alert=True
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_AddCORSFlagToRequests("1.0"))
def check_success_cors_headers(self):
    """Check that plugin supports datasources with add CORS flag toggle turned on."""
    check_creating_datasource_and_panel(
        datasource_name="test_cors_flag_success",
        url="http://clickhouse:8123",
        add_cors_flag=True,
        check_url_in_query_inspector=True,
        url_parts=["add_http_cors_header=1"]
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_HTTPCompression("1.0"))
def check_success_use_compression(self):
    """Check that plugin supports datasources with use compression toggle turned on."""
    check_creating_datasource_and_panel(
        datasource_name="test_use_compression_success",
        url="http://clickhouse:8123",
        use_compression=True,
        check_url_in_query_inspector=True,
        url_parts=["enable_http_compression"]
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_DefaultDataSource("1.0"))
def check_success_default_datasource(self):
    """Check that plugin supports datasources with default toggle turned on."""
    check_creating_datasource_and_panel(
        datasource_name="test_success_default_datasource",
        url="http://clickhouse:8123",
        default=True,
        check_datasource_is_default=True
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_DefaultDatabase("1.0"))
def check_success_default_database(self):
    """Check that plugin supports datasources with specified default database and
    query that contains table from this database."""
    check_creating_datasource_and_panel(
        datasource_name="test_success_default_database",
        url="http://clickhouse:8123",
        default_database="system",
        query="SELECT * FROM backups",
        check_visualization=False,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_DefaultDatabase("1.0"))
def check_fail_default_database(self):
    """Check that plugin not supports datasources without specified default database and
    query that contains table from this database."""
    check_creating_datasource_and_panel(
        datasource_name="test_fail_default_database",
        url="http://clickhouse:8123",
        query="SELECT * FROM backups",
        check_visualization_alert=True,
        check_visualization=False,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_BrowserAccess("1.0"))
def check_success_browser_access(self):
    """Check that plugin not supports datasources with browser access."""
    check_creating_datasource_and_panel(
        datasource_name="test_success_browser_access",
        access_type='Browser',
        check_url_in_query_inspector=True,
        url_parts=["clickhouse:8123"]
    )


@TestFeature
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_DataSourceName("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_SaveAndTestButton("1.0"),
    RQ_SRS_Plugin_Dashboards("1.0"),
    RQ_SRS_Plugin_Panels("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection("1.0"),
)
@Name("data source setup settings")
def feature(self):
    """Check that Plugin supports datasource settings like POST method, CORS, compression, etc."""

    for scenario in loads(current_module(), Scenario):
        scenario()
