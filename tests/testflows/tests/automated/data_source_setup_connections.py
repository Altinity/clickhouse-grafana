from testflows.core import *

from requirements.requirements import *
from tests.automated.data_source_setup import (
    check_existing_data_sources,
    check_success_basic_auth,
    check_fail_basic_auth,
    check_success_use_post_method,
    check_fail_use_post_method,
    check_success_ca_cert,
    check_fail_ca_cert,
    check_success_tls_client_auth,
    check_fail_tls_client_auth,
    check_success_use_yandex_cloud,
    check_fail_use_yandex_cloud,
    check_success_cors_headers,
    check_success_use_compression,
    check_success_default_datasource,
    check_success_default_database,
    check_fail_default_database,
    check_success_skip_tls_verify,
    check_fail_skip_tls_verify,
    check_success_browser_access,
)


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
@Name("data source setup connections")
def feature(self):
    """Check that Plugin supports Grafana datasource connection and auth scenarios."""

    scenarios = [
        check_existing_data_sources,
        check_success_basic_auth,
        check_fail_basic_auth,
        check_success_use_post_method,
        check_fail_use_post_method,
        check_success_ca_cert,
        check_fail_ca_cert,
        check_success_tls_client_auth,
        check_fail_tls_client_auth,
        check_success_use_yandex_cloud,
        check_fail_use_yandex_cloud,
        check_success_cors_headers,
        check_success_use_compression,
        check_success_default_datasource,
        check_success_default_database,
        check_fail_default_database,
        check_success_skip_tls_verify,
        check_fail_skip_tls_verify,
        check_success_browser_access,
    ]

    for scenario in scenarios:
        scenario()
