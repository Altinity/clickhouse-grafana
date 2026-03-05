from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

import steps.connections.datasources.view as datasources
import steps.connections.datasources.altinity_edit.view as datasources_altinity_edit

from requirements.requirements import *
from tests.automated.data_source_setup.outlines import check_creating_datasource_and_panel


@TestScenario
def check_existing_data_sources(self):
    """Check that existing data sources are connected."""

    with Given("I open connections data sources view"):
        datasources.open_connections_datasources_endpoint()

    with When("I get list of data sources"):
        data_sources_names = [
            "clickhouse",
            "clickhouse-get",
            "clickhouse-x-auth",
            "gh-api",
            "trickster"
        ]

    with When("I check data sources"):
        for datasource_name in data_sources_names:
            with delay():
                with Given("I open connections data sources view"):
                    datasources.open_connections_datasources_endpoint()

            with When(f"I open data source setup for data source {datasource_name}"):
                datasources.click_datasource_in_datasources_view(datasource_name=datasource_name)

            with delay():
                with When("I click save and test button"):
                    datasources_altinity_edit.click_save_and_test_button()

            with Then("I check save and test button works correctly"):
                with delay():
                    assert datasources_altinity_edit.check_alert_success() is True, error()


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_BasicAuth("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_success_basic_auth(self):
    """Check that plugin supports datasources with `Basic auth` toggle turned on and correct username and password."""
    check_creating_datasource_and_panel(
        datasource_name="test_basic_auth_success",
        url="http://clickhouse:8123",
        basic_auth=True,
        username="demo",
        password="demo"
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_BasicAuth("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_fail_basic_auth(self):
    """Check that plugin supports datasources with `Basic auth` toggle turned on and correct username and incorrect password."""
    check_creating_datasource_and_panel(
        datasource_name="test_basic_auth_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        basic_auth=True,
        username="demo",
        password="incorrect_password",
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_Auth_WithCACert("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_success_ca_cert(self):
    """Check that plugin supports datasources `With CA Cert` toggle turned on and correct CA Cert."""
    check_creating_datasource_and_panel(
        datasource_name="test_with_ca_cert_success",
        url="http://clickhouse:8123",
        with_ca_cert=True,
        ca_cert=None
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_Auth_WithCACert("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_fail_ca_cert(self):
    """Check that plugin supports datasources `With CA Cert` toggle turned on and correct CA Cert."""
    check_creating_datasource_and_panel(
        datasource_name="test_with_ca_cert_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        with_ca_cert=True,
        ca_cert="incorrect_ca_cert"
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_TLS_SSLAuthDetails("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_success_tls_client_auth(self):
    """Check that plugin supports datasources with `TLS Client Auth` toggle turned on and correct `TLS/SSL Auth Details`."""
    check_creating_datasource_and_panel(
        datasource_name="test_with_tls_client_auth_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key=None,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_TLS_SSLAuthDetails("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),)
def check_fail_tls_client_auth(self):
    """Check that plugin supports datasources with `TLS Client Auth` toggle turned on and incorrect `TLS/SSL Auth Details`."""
    check_creating_datasource_and_panel(
        datasource_name="test_with_tls_client_auth_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key="incorrect_client_key",
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_UseYandexCloudAuthorizationHeaders("1.0"))
def check_success_use_yandex_cloud(self):
    """Check that plugin supports datasources with Yandex.Cloud authorization and correct username and password."""
    check_creating_datasource_and_panel(
        datasource_name="test_use_yandex_cloud_success",
        successful_connection=True,
        url="http://clickhouse:8123",
        use_yandex_cloud_authorization=True,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_UseYandexCloudAuthorizationHeaders("1.0"))
def check_fail_use_yandex_cloud(self):
    """Check that plugin supports datasources with Yandex.Cloud authorization and correct username and incorrect password."""
    check_creating_datasource_and_panel(
        datasource_name="test_use_yandex_cloud_not_success",
        successful_connection=False,
        url="http://clickhouse:8123",
        use_yandex_cloud_authorization=True,
        yandex_cloud_password="incorrect_password"
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_Auth_SkipTLSVerify("1.0"))
def check_success_skip_tls_verify(self):
    """Check that plugin supports datasources with Skip TLS Verify toggle turned on
    with secured port and without CA cert configured."""
    check_creating_datasource_and_panel(
        datasource_name="test_success_skip_tls_verify",
        url="https://clickhouse:8443",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key=None,
        skip_tls_verify=True,
    )


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_Auth_SkipTLSVerify("1.0"))
def check_fail_skip_tls_verify(self):
    """Check that plugin not supports datasources with Skip TLS Verify toggle turned off
    with secured port and without CA cert configured."""
    check_creating_datasource_and_panel(
        datasource_name="test_fail_skip_tls_verify",
        url="https://clickhouse:8443",
        tls_client_auth=True,
        server_name=None,
        client_cert=None,
        client_key=None,
        skip_tls_verify=False,
        successful_connection=False,
    )


@TestFeature
@Requirements(
    RQ_SRS_Plugin_DataSourceSetupView("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_SaveAndTestButton("1.0"),
    RQ_SRS_Plugin_DataSourceSetupView_Auth("1.0"),
)
@Name("data source setup connection")
def feature(self):
    """Check that Plugin supports datasource connection and authentication setup."""

    for scenario in loads(current_module(), Scenario):
        scenario()
