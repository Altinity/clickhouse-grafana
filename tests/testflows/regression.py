#!/usr/bin/env python3
import sys

from steps.common import *
from steps.cluster import *
from requirements.requirements import *
from steps.login.view import *
from steps.common import *
from steps.ui import *
append_path(sys.path, "..")


def argparser(parser):
    parser.add_argument(
        "--before",
        metavar="before",
        type=int,
        help="delay before steps",
        default=0
    )
    parser.add_argument(
        "--after",
        metavar="after",
        type=int,
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

    with Given("docker-compose cluster"):
        self.context.cluster = cluster(frame=inspect.currentframe())

    with And("webdriver"):
        self.context.driver = create_driver()

    with And("I wait for grafana to be started"):
        for attempt in retries(delay=10, timeout=50):
            with attempt:
                open_endpoint(endpoint=self.context.endpoint)


    with delay():
        with Given("I login in grafana"):
            login()

    # pause()
    # with delay():
    #     open_endpoint(endpoint=self.context.endpoint+'plugins')
    # Feature(run=load("testflows.tests.automated.e2e", "feature"))
    Feature(run=load("testflows.tests.automated.dashboard", "feature"))


if main():
    regression()
