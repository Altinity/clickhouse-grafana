import os
import json
import time
import urllib.parse
import urllib.request

from testflows.core import *
from testflows.asserts import error

from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui

from requirements.requirements import *

# regression.py runs on the host and the clickhouse service publishes 8123
CLICKHOUSE_HTTP = "http://localhost:8123/"

DATASOURCE_UID = "P7E099F39B84EA795"
LOGS_LIMIT = 1000
HISTOGRAM_WARNING = "does not support full-range histograms"

# message comes right after the timestamp: toLogs() renders the first String column as
# the log line, so any other order shows the level value instead of the message
LOGS_QUERY = (
    "SELECT event_time, message, level, service, host, duration_ms "
    "FROM default.test_logs_volume WHERE $timeFilter ORDER BY event_time DESC "
    f"LIMIT {LOGS_LIMIT}"
)

PANES = {
    "782": {
        "datasource": DATASOURCE_UID,
        "queries": [
            {
                "refId": "A",
                "datasource": {"type": "vertamedia-clickhouse-datasource", "uid": DATASOURCE_UID},
                "query": LOGS_QUERY,
                "rawQuery": LOGS_QUERY,
                "format": "logs",
                "dateTimeColDataType": "event_time",
                "dateTimeType": "DATETIME",
                "database": "default",
                "table": "test_logs_volume",
                "extrapolate": False,
                "editorMode": "sql",
            }
        ],
        "range": {"from": "now-24h", "to": "now"},
    }
}


def aggregate_in_query_log(started_at):
    """query_log filter matching the histogram aggregate run since `started_at`."""
    # NOT ILIKE '%query_log%' stops the filter matching itself: it carries every pattern below
    return (
        f"type = 'QueryFinish' AND event_time >= toDateTime({started_at}) "
        "AND query ILIKE '%multiSearchAny%' AND query ILIKE '%test_logs_volume%' "
        "AND query ILIKE '%GROUP BY%' AND query NOT ILIKE '%query_log%'"
    )


@TestStep
def clickhouse_query(self, sql):
    """Run a query against the ClickHouse HTTP interface and return its output."""
    request = urllib.request.Request(CLICKHOUSE_HTTP, data=sql.encode("utf-8"))
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8").strip()


@TestStep(When)
def open_explore_with_logs(self):
    """Open the Explore pane with the logs query and wait until log rows render."""
    driver = self.context.driver

    with By("noting the ClickHouse clock before anything is queried"):
        # pins the query_log checks to this run, so a warm container cannot pass them
        # on rows an earlier run left behind
        self.context.logs_volume_started_at = int(
            clickhouse_query(sql="SELECT toUnixTimestamp(now())")
        )

    with And("opening the Explore pane"):
        ui.open_endpoint(
            endpoint=f"{self.context.endpoint}explore"
            f"?schemaVersion=1&panes={urllib.parse.quote(json.dumps(PANES))}"
        )

    with And("waiting for the Explore toolbar"):
        # the hyphenated 'data-testid explore-toolbar' exists since Grafana 12.4.0
        for attempt in retries(delay=2, timeout=60):
            with attempt:
                ui.wait_for_element_to_be_visible(
                    select_type=SelectBy.CSS_SELECTOR,
                    element="[data-testid='data-testid explore-toolbar']",
                )

    with And("waiting for log rows"):
        # the virtualized Logs panel tags every rendered line with data-log-index
        for attempt in retries(delay=2, timeout=120):
            with attempt:
                rows = driver.find_elements(
                    SelectBy.CSS_SELECTOR,
                    "[data-testid='logRows'] [data-log-index]"
                    ", [data-testid='logRows'] [class*='logs-row']"
                    ", [data-testid='data-testid logs-panel'] [class*='logs-row']",
                )
                assert len(rows) > 0, error()


def legend_labels(driver):
    """Collect the level names rendered as logs volume histogram legend entries."""
    # 13.2 legend entries are '<level>\nTotal: <value>' under a per-series testid;
    # the older markup exposed them as '[class*=VizLegend] button' instead
    elements = driver.find_elements(
        SelectBy.CSS_SELECTOR, "[data-testid^='data-testid VizLegend series']"
    )
    labels = set()
    for element in elements:
        text = element.text.strip()
        if text:
            labels.add(text.splitlines()[0].strip().lower())
    return labels


@TestStep(Then)
def wait_for_histogram_legend(self, levels=("error", "info")):
    """Wait until the logs volume histogram has rendered its per-level legend."""
    driver = self.context.driver
    for attempt in retries(delay=2, timeout=120):
        with attempt:
            labels = legend_labels(driver)
            assert set(levels).issubset(labels), error(f"legend labels: {sorted(labels)}")


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def explore_logs_histogram_is_full_range(self):
    """Check that Explore renders a per-level logs volume histogram and no longer
    warns that the datasource cannot produce full-range histograms."""

    driver = self.context.driver

    with Given("I open Explore with a logs query"):
        open_explore_with_logs()

    with When("I wait for the histogram legend to render"):
        wait_for_histogram_legend()

    with Then("I check the unsupported-histogram warning never appears"):
        # the supplementary request is fired after the logs response, so keep polling
        for poll in range(10):
            if poll:
                time.sleep(2)
            assert HISTOGRAM_WARNING not in driver.page_source, error()

    with And("I check the legend lists the seeded levels"):
        labels = legend_labels(driver)
        note(f"legend labels: {sorted(labels)}")
        assert "error" in labels, error()
        assert "info" in labels, error()

    with Finally("I save a screenshot of the rendered histogram"):
        screenshots_dir = os.path.join(current_dir(), "..", "..", "screenshots")
        os.makedirs(screenshots_dir, exist_ok=True)
        driver.save_screenshot(
            os.path.join(screenshots_dir, "logs_volume_histogram_782.png")
        )


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def explore_logs_histogram_runs_server_side_aggregate(self):
    """Check that the histogram is computed by ClickHouse: the per-level aggregate
    query reaches the server instead of being derived in the browser."""

    with Given("I open Explore with a logs query"):
        open_explore_with_logs()

    with When("I wait for the histogram legend to render"):
        wait_for_histogram_legend()

    with Then("I check the aggregate query reached ClickHouse"):
        query_log_filter = aggregate_in_query_log(self.context.logs_volume_started_at)
        for attempt in retries(delay=2, timeout=60):
            with attempt:
                clickhouse_query(sql="SYSTEM FLUSH LOGS")
                count = clickhouse_query(
                    sql=f"SELECT count() FROM system.query_log WHERE {query_log_filter}"
                )
                note(f"matching query_log rows: {count}")
                assert int(count) >= 1, error()


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def explore_logs_histogram_counts_more_than_the_logs_limit(self):
    """Check that the histogram covers the whole time range: replaying the aggregate
    query ClickHouse actually ran counts more rows than the logs LIMIT returned."""

    with Given("I open Explore with a logs query"):
        open_explore_with_logs()

    with When("I wait for the histogram legend to render"):
        wait_for_histogram_legend()

    aggregate_sql = None

    with And("I take the aggregate query ClickHouse ran"):
        query_log_filter = aggregate_in_query_log(self.context.logs_volume_started_at)
        for attempt in retries(delay=2, timeout=60):
            with attempt:
                clickhouse_query(sql="SYSTEM FLUSH LOGS")
                aggregate_sql = clickhouse_query(
                    sql=f"SELECT query FROM system.query_log WHERE {query_log_filter} "
                    "ORDER BY event_time DESC LIMIT 1 FORMAT TabSeparatedRaw"
                )
                assert aggregate_sql, error()

        # the plugin appends 'FORMAT JSON', which cannot stay inside a subquery
        aggregate_sql = aggregate_sql.strip().rstrip(";").strip()
        if aggregate_sql.upper().endswith("FORMAT JSON"):
            aggregate_sql = aggregate_sql[: -len("FORMAT JSON")].strip()
        note(f"aggregate query: {aggregate_sql[:400]}")

    with Then("I check the histogram counts more rows than the logs limit"):
        total = clickhouse_query(
            sql="SELECT sum(critical + error + warning + info + debug + trace + unknown) "
            f"FROM ({aggregate_sql})"
        )
        note(f"rows covered by the histogram: {total} (logs limit: {LOGS_LIMIT})")
        assert int(total) > LOGS_LIMIT, error()


@TestFeature
@Name("logs volume histogram")
def feature(self):
    """Tests for the Explore logs volume histogram.

    Regression tests for https://github.com/Altinity/clickhouse-grafana/issues/782
    """

    scenario_names = getattr(self.context, "scenario_names", None)
    for scenario in loads(current_module(), Scenario):
        if scenario_names and scenario.__name__ not in scenario_names:
            continue
        scenario()
