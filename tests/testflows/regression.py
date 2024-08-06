#!/usr/bin/env python3
import os
import sys
import inspect

from testflows.core import *
from steps.delay import delay
from requirements.requirements import *

import steps.ui as ui
import steps.cluster as cluster
import steps.login.view as login

append_path(sys.path, "..")


def argparser(parser):
    parser.add_argument(
        "--before",
        metavar="before",
        type=float,
        help="delay before steps",
        default=0
    )
    parser.add_argument(
        "--after",
        metavar="after",
        type=float,
        help="delay after steps",
        default=0
    )


@TestModule
@Name("Grafana Datasource Plugin For Clickhouse")
@ArgumentParser(argparser)
@Specifications(QA_SRS_Altinity_Grafana_Datasource_Plugin_For_ClickHouse)
@Requirements(
    RQ_SRS_Plugin("1.0"),
    RQ_SRS_Plugin_DockerComposeEnvironment("1.0"),
    RQ_SRS_Plugin_VersionCompatibility("1.0")
)
def regression(self, before, after):

    self.context.browser = "chrome"
    self.context.local = False
    self.context.global_wait_time = 30
    self.context.endpoint = "http://grafana:3000/"
    self.context.before = before
    self.context.after = after
    self.context.server_name = "test.example.com"
    
    project_root_dir = os.path.join(current_dir(),"..","..")
    self.context.project_root_dir = project_root_dir

    with Given("docker compose cluster"):
        self.context.cluster = cluster.cluster(frame=inspect.currentframe())

    with And("I copy CA Cert"):
        self.context.ca_cert = self.context.cluster.command(None, "cat \"" + os.path.join(project_root_dir, "docker", "clickhouse", "ca-cert.pem") + "\"").output

    with And("I copy Client Cert"):
        self.context.client_cert = self.context.cluster.command(None, "cat \"" + os.path.join(project_root_dir, "docker", "clickhouse", "client-cert.pem") + "\"").output

    with And("I copy Client Key"):
        self.context.client_key = self.context.cluster.command(None, "cat \"" + os.path.join(project_root_dir, "docker", "clickhouse", "client-key.pem") + "\"").output

    with And("webdriver"):
        self.context.driver = ui.create_driver()

    with And("I wait for grafana to be started"):
        for attempt in retries(delay=10, timeout=50):
            with attempt:
                ui.open_endpoint(endpoint=self.context.endpoint)

    with delay():
        with Given("I login in grafana"):
            login.login()

    Feature(run=load("testflows.tests.automated.data_source_setup", "feature"))
    Feature(run=load("testflows.tests.automated.e2e", "feature"))


if main():
    regression()
