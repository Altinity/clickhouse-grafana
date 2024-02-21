#!/usr/bin/env python3
import os
import sys

from testflows.core import *

append_path(sys.path, "..")


from requirements.requirements import *
from compare_tests.steps import *


@TestModule
@Name("Grafana Datasource Plugin For Clickhouse")
@Specifications(QA_SRS_Altinity_Grafana_Datasource_Plugin_For_ClickHouse)
@Flags(MANUAL)
@Requirements(
  RQ_SRS_Plugin("1.0"),
  RQ_SRS_Plugin_DockerComposeEnvironment("1.0")
)
def regression(self):

    try:
        with Given("I launch docker-compose test environment on versions 2.5.1, 3.0.0"):
            pass

        Feature(run=load("testflows.compare.data_source_setup_view", "feature"))

    finally:
        with Finally("I delete docker-compose test environment"):
            pass
