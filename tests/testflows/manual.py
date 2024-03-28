#!/usr/bin/env python3
import os
import sys

from testflows.core import *
from tests.manual.steps import *
from requirements.requirements import *

append_path(sys.path, "..")


@TestModule
@Name("Grafana Datasource Plugin For Clickhouse")
@Specifications(QA_SRS_Altinity_Grafana_Datasource_Plugin_For_ClickHouse)
@Flags(MANUAL)
@Requirements(
    RQ_SRS_Plugin("1.0"),
    RQ_SRS_Plugin_DockerComposeEnvironment("1.0"),
    RQ_SRS_Plugin_VersionCompatibility("1.0")
)
def regression(self):

    try:
        with Given("I launch docker-compose test environment on Plugin versions 2.5.4, 3.0.0"):
            with By("running frontend"):
                note("docker-compose run --rm frontend_builder")

            with By("running backend"):
                note("docker-compose run --rm backend_builder")

            with By("adding grafana token"):
                note("""echo 'export GRAFANA_ACCESS_POLICY_TOKEN="{grafana_token}"' >.release_env\n
                docker-compose run --rm plugin_signer""")

            with By("starting grafana server"):
                note("docker-compose up -d grafana")

            with By("running plugin on version 2.5.4"):
                note("CLICKHOUSE_PLUGIN_VERSION=2.5.4 docker-compose up -d grafana_external_install")

        Feature(run=load("testflows.tests.manual.alerts", "feature"))
        Feature(run=load("testflows.tests.manual.annotations", "feature"))
        Feature(run=load("testflows.tests.manual.data_source_setup_view", "feature"))
        Feature(run=load("testflows.tests.manual.dashboard", "feature"))
        Feature(run=load("testflows.tests.manual.functions", "feature"))
        Feature(run=load("testflows.tests.manual.macros", "feature"))
        Feature(run=load("testflows.tests.manual.multi_user_usage", "feature"))
        Feature(run=load("testflows.tests.manual.query_inspector", "feature"))
        Feature(run=load("testflows.tests.manual.query_options", "feature"))
        Feature(run=load("testflows.tests.manual.query_setup", "feature"))
        Feature(run=load("testflows.tests.manual.raw_sql_editor", "feature"))
        Feature(run=load("testflows.tests.manual.supported_types", "feature"))
        Feature(run=load("testflows.tests.manual.variables", "feature"))
        Feature(run=load("testflows.tests.manual.visualization_types", "feature"))

    finally:
        with Finally("I delete docker-compose test environment"):
            with By("deleting grafana docker containers"):
                note("docker stop clickhouse-grafana_grafana_external_install_1"
                     "docker rm clickhouse-grafana_grafana_external_install_1")
                note("docker stop clickhouse-grafana_grafana_1"
                     "docker rm clickhouse-grafana_grafana_1")
            with And("deleting clickhouse container"):
                note("docker stop clickhouse-grafana_clickhouse_1"
                     "docker rm clickhouse-grafana_clickhouse_1")
            pass


if main():
    regression()
