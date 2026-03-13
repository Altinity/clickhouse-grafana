import time

from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

from selenium.webdriver.common.by import By as SelectBy
from selenium.webdriver.common.keys import Keys

import steps.ui as ui
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards


@TestStep(Given)
def populate_opentelemetry_span_log(self):
    """Run queries via Grafana Explore to populate system.opentelemetry_span_log.

    Since opentelemetry_start_trace_probability=1 is set in the ClickHouse config,
    every query executed through the datasource generates trace spans.
    """

    driver = self.context.driver

    with By("opening Grafana Explore"):
        ui.open_endpoint(endpoint=f"{self.context.endpoint}explore")

    with And("waiting for Explore page to load"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                ui.wait_for_element_to_be_visible(
                    select_type=SelectBy.CSS_SELECTOR,
                    element="[data-testid='data-testid explore toolbar']"
                    ", [class*='explore']"
                    ", [data-testid='data-testid Explore']",
                )

    with And("running queries to generate trace spans"):
        # Run several queries through Explore to generate traces in opentelemetry_span_log
        queries = [
            "SELECT count() FROM numbers(100000)",
            "SELECT now(), number FROM numbers(10)",
            "SELECT sleep(0.1), number FROM numbers(3)",
            "SYSTEM FLUSH LOGS",
        ]
        for query in queries:
            with By(f"running query: {query}"):
                # Find the Monaco editor input and enter the query
                try:
                    editor_input = driver.find_element(
                        SelectBy.XPATH,
                        "//*[@class='inputarea monaco-mouse-cursor-text']",
                    )
                    editor_input.send_keys(Keys.CONTROL, "a")
                    editor_input.send_keys(query)
                except Exception:
                    debug(f"Could not find Monaco editor, trying alternative input")

                # Click Run query button
                try:
                    run_button = driver.find_element(
                        SelectBy.CSS_SELECTOR,
                        "[data-testid='data-testid RefreshPicker run button']",
                    )
                    run_button.click()
                except Exception:
                    # Try alternative selector
                    run_button = driver.find_element(
                        SelectBy.XPATH,
                        "//button[contains(text(), 'Run query') or @aria-label='Run query']",
                    )
                    run_button.click()

                time.sleep(2)


@TestScenario
def trace_search_table_displays_data(self):
    """Check that the Trace Search table panel displays trace data."""

    with Given("I populate opentelemetry_span_log with trace data"):
        populate_opentelemetry_span_log()

    with When("I open the flamegraph and tracing dashboard"):
        ui.open_endpoint(
            endpoint=f"{self.context.endpoint}d/edimrzy0cijnkf/flamegraph-and-tracing-support?from=now-5m&to=now"
        )

    with Then("I check Trace Search panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(panel_name="Trace Search"), error()

    with And("I check Trace Search table has expected columns"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert panel.check_columns_in_table_view(
                        columns=["Trace ID", "Operation", "Spans", "Duration ms", "Start Time"]
                    ), error()

    with And("I check that Trace ID cells contain data link elements"):
        driver = self.context.driver
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                trace_links = driver.find_elements(
                    SelectBy.CSS_SELECTOR,
                    "[data-testid='data-testid Data link']",
                )
                # Filter to only links pointing to trace_id
                trace_links = [l for l in trace_links if "var-trace_id=" in (l.get_attribute("href") or "")]
                assert len(trace_links) > 0, error()


@TestScenario
def trace_detail_panel_displays_data(self):
    """Check that the Trace Detail panel renders trace spans for the selected trace."""

    with Given("I populate opentelemetry_span_log with trace data"):
        populate_opentelemetry_span_log()

    with When("I open the flamegraph and tracing dashboard"):
        ui.open_endpoint(
            endpoint=f"{self.context.endpoint}d/edimrzy0cijnkf/flamegraph-and-tracing-support?from=now-5m&to=now"
        )

    with And("I wait for the dashboard to load"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(panel_name="Trace Search"), error()

    with Then("I check the Trace Detail panel exists with a selected trace_id"):
        driver = self.context.driver
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    # The panel title contains the selected trace_id value from the template variable
                    panels = driver.find_elements(
                        SelectBy.XPATH,
                        "//*[contains(@data-testid, 'Panel header Trace Detail:')]",
                    )
                    assert len(panels) > 0, error()

    with And("I check the traces visualization renders span data"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    # Grafana traces panel shows trace metadata like duration, services, spans
                    trace_elements = driver.find_elements(
                        SelectBy.XPATH,
                        "//*[contains(text(), 'Services')]"
                        " | //*[contains(text(), 'Duration')]"
                        " | //*[contains(text(), 'Trace Start')]"
                        " | //*[contains(@data-testid, 'TraceView')]",
                    )
                    assert len(trace_elements) > 0, error()


@TestScenario
def data_link_navigates_to_trace(self):
    """Check that clicking a Trace ID data link in the table updates the trace_id variable."""

    with Given("I populate opentelemetry_span_log with trace data"):
        populate_opentelemetry_span_log()

    with When("I open the flamegraph and tracing dashboard"):
        ui.open_endpoint(
            endpoint=f"{self.context.endpoint}d/edimrzy0cijnkf/flamegraph-and-tracing-support?from=now-5m&to=now"
        )

    with And("I wait for Trace Search table to load"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert panel.check_columns_in_table_view(
                        columns=["Trace ID"]
                    ), error()

    with When("I find and click the first Trace ID data link"):
        driver = self.context.driver
        trace_links = []
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                all_data_links = driver.find_elements(
                    SelectBy.CSS_SELECTOR,
                    "[data-testid='data-testid Data link']",
                )
                trace_links = [l for l in all_data_links if "var-trace_id=" in (l.get_attribute("href") or "")]
                assert len(trace_links) > 0, error()

        first_link = trace_links[0]
        expected_trace_id = first_link.text.strip()
        note(f"Clicking trace ID: {expected_trace_id}")
        first_link.click()

    with Then("I verify the URL contains the selected trace_id"):
        time.sleep(3)
        current_url = driver.current_url
        assert f"var-trace_id={expected_trace_id}" in current_url, error()

    with And("I verify the Trace Detail panel title contains the trace_id"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    panels = driver.find_elements(
                        SelectBy.XPATH,
                        f"//*[contains(@data-testid, 'Panel header Trace Detail: {expected_trace_id}')]",
                    )
                    assert len(panels) > 0, error()

    with And("I check there are no error indicators on the panel"):
        with delay():
            error_elements = driver.find_elements(
                SelectBy.XPATH,
                "//*[contains(@data-testid, 'Panel status error')]"
                " | //*[contains(@aria-label, 'Panel status error')]",
            )
            assert len(error_elements) == 0, error()


@TestFeature
@Name("flamegraph and tracing")
def feature(self):
    """Flamegraph and tracing dashboard tests."""

    for scenario in loads(current_module(), Scenario):
        scenario()
