from testflows.core import *
from testflows.asserts import error

from selenium.webdriver.common.by import By as SelectBy

import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor
from steps.delay import delay

from requirements.requirements import *

DASHBOARD_NAME = "Test Advanced Logs Labels"
PANEL_NAME = "Advanced Logs Labels"

MODAL_XPATH = "//div[@role='dialog'][.//h2[text()='Advanced log fields settings']]"
# UInt64 fixture value above 2^53 (row number=0), must keep exact digits end-to-end
BIG_UINT64 = "11189782786942380395"


def modal_button(driver, label):
    """Find a button inside the Advanced log fields settings modal by its visible text."""
    return driver.find_element(
        SelectBy.XPATH, f"{MODAL_XPATH}//button[.//span[text()='{label}']]"
    )


def save_button_disabled(driver):
    return modal_button(driver, "Save").get_attribute("disabled") is not None


def set_field_mode(driver, field, mode_label):
    # RadioButtonGroup overlays the radio <input> on its <label>, which makes a
    # label click "intercepted" by the input — click the input itself via JS
    radio = driver.find_element(
        SelectBy.XPATH,
        f"{MODAL_XPATH}//div[@data-testid='field-card-{field}']"
        f"//input[@type='radio'][@title='{mode_label}']",
    )
    driver.execute_script("arguments[0].click();", radio)


def open_advanced_logs_modal(driver):
    """Open the modal from the query editor toolbar and wait for the async
    field list (system.columns sample query) to finish loading."""
    for attempt in retries(delay=2, timeout=30):
        with attempt:
            driver.find_element(
                SelectBy.XPATH, "//button[.//text()='Advanced log fields settings']"
            ).click()
            driver.find_element(SelectBy.XPATH, MODAL_XPATH)
    for attempt in retries(delay=2, timeout=30):
        with attempt:
            driver.find_element(
                SelectBy.CSS_SELECTOR, "[data-testid='field-card-_map']"
            )


def wait_log_rows(driver, marker="advanced log line"):
    for attempt in retries(delay=2, timeout=30):
        with attempt:
            assert marker in driver.page_source, error()


def expand_log_row(driver, marker="advanced log line"):
    """Open log details for the first row matching the deterministic message text.

    Clicking the log line body toggles details (enableLogDetails=true); anchoring on
    the fixture message text avoids depending on Grafana's log row DOM structure.
    """
    for attempt in retries(delay=2, timeout=30):
        with attempt:
            rows = driver.find_elements(
                SelectBy.XPATH, f"//*[contains(text(),'{marker}')]"
            )
            assert len(rows) > 0, error()
            # JS click: log rows have overlay elements that intercept native clicks
            driver.execute_script("arguments[0].click();", rows[0])


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def modal_smoke(self):
    """Check that the Advanced log fields settings modal opens, lists complex
    fields, tracks modifications with a badge and Save enablement, and resets."""

    driver = self.context.driver

    with Given("I open the Advanced Logs Labels dashboard"):
        dashboards.open_dashboard(dashboard_name=DASHBOARD_NAME)

    try:
        with When("I open the panel for edit"):
            with delay():
                dashboard.open_panel(panel_name=PANEL_NAME)

        with And("I switch to SQL editor",
                 description="the toolbar with the Advanced button is part of the SQL editor view"):
            with delay():
                panel.go_to_sql_editor(query_name="A")

        with And("I open the Advanced log fields settings modal"):
            open_advanced_logs_modal(driver)

        with Then("I check field cards exist for complex columns"):
            for field in ("_map", "attrs", "tags"):
                card = driver.find_element(
                    SelectBy.CSS_SELECTOR, f"[data-testid='field-card-{field}']"
                )
                assert card is not None, error()

        with And("I check Save button is disabled initially"):
            assert save_button_disabled(driver) is True, error()

        with When("I change _map mode to Hide"):
            # Map fields offer Expand/Hide/Raw (body); Single exists only for Array/Dynamic/Variant
            with delay():
                set_field_mode(driver, "_map", "Hide")

        with Then("I check modified badge appears and Save is enabled"):
            for attempt in retries(delay=1, timeout=15):
                with attempt:
                    driver.find_element(
                        SelectBy.CSS_SELECTOR, "[data-testid='modified-badge-_map']"
                    )
                    assert save_button_disabled(driver) is False, error()

        with When("I click Reset to defaults"):
            with delay():
                modal_button(driver, "Reset to defaults").click()

        with Then("I check badge is gone and Save is disabled again"):
            for attempt in retries(delay=1, timeout=15):
                with attempt:
                    badges = driver.find_elements(
                        SelectBy.CSS_SELECTOR, "[data-testid='modified-badge-_map']"
                    )
                    assert len(badges) == 0, error()
                    assert save_button_disabled(driver) is True, error()

    finally:
        with Finally("I dismiss the modal"):
            try:
                modal_button(driver, "Cancel").click()
            except Exception:
                pass

        with And("I go back to dashboard"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay():
                dashboard.discard_changes_for_dashboard()


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def expand_map_labels(self):
    """Check that with default settings (Expand, depth 1) logs rows expose
    labels derived from _map keys via the bracket accessor naming."""

    driver = self.context.driver

    with Given("I open the Advanced Logs Labels dashboard"):
        dashboards.open_dashboard(dashboard_name=DASHBOARD_NAME)

    with When("I wait for log rows to render"):
        wait_log_rows(driver)

    with And("I expand the first log row"):
        with delay():
            expand_log_row(driver)

    with Then("I check at least one _map-derived label is present"):
        # label keys are named _map['<key>'] by depth-1 Map expansion
        for attempt in retries(delay=2, timeout=30):
            with attempt:
                page = driver.page_source
                assert "map_key" in page, error()
                assert "_map['map_key" in page, error()


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def filter_click_generates_valid_sql(self):
    """Check that clicking the '+' filter icon on a _map-derived label produces
    an adhoc filter that generates valid ClickHouse SQL with a bracket accessor.

    Regression test for https://github.com/Altinity/clickhouse-grafana/issues/678
    """

    driver = self.context.driver

    with Given("I open the Advanced Logs Labels dashboard"):
        dashboards.open_dashboard(dashboard_name=DASHBOARD_NAME)

    with When("I wait for log rows to render"):
        wait_log_rows(driver)

    with And("I expand the first log row"):
        with delay():
            expand_log_row(driver)

    with And("I click the '+' filter icon for a _map-derived label"):
        for attempt in retries(delay=2, timeout=30):
            with attempt:
                # prefer the filter button in the details row of a _map label;
                # fall back to the first 'Filter for value' button in the details
                buttons = driver.find_elements(
                    SelectBy.XPATH,
                    '//tr[contains(., "_map[")]//button[starts-with(@aria-label, "Filter for")]',
                )
                if not buttons:
                    buttons = driver.find_elements(
                        SelectBy.XPATH,
                        '//button[starts-with(@aria-label, "Filter for")]',
                    )
                assert len(buttons) > 0, error()
                buttons[0].click()

    with Then("I check the panel re-renders without an error alert"):
        with delay(after=2):
            assert "data-testid Alert error" not in driver.page_source, error()
            assert panel.check_panel_error_exists() is False, error()

    try:
        with When("I open the panel for edit"):
            with delay():
                dashboard.open_panel(panel_name=PANEL_NAME)

        with And("I open SQL editor for query A"):
            with delay():
                panel.go_to_sql_editor(query_name="A")

        with And("I ensure Show generated SQL is enabled"):
            with delay():
                try:
                    sql_editor.get_reformatted_query(query_name="A")
                except Exception:
                    sql_editor.click_show_generated_sql_button(query_name="A")

        with Then("I check generated SQL contains the Map bracket accessor"):
            for attempt in retries(delay=2, timeout=30):
                with attempt:
                    reformatted_query = sql_editor.get_reformatted_query(query_name="A")
                    note(f"Generated SQL: {reformatted_query}")
                    assert "_map['" in reformatted_query, error()

    finally:
        with Finally("I go back to dashboard"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay():
                dashboard.discard_changes_for_dashboard()


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def mode_single_hide_raw(self):
    """Check Hide and Raw modes for the _map column (Map fields have no Single
    option) and the default Single rendering of the tags Array column."""

    driver = self.context.driver

    with Given("I open the Advanced Logs Labels dashboard"):
        dashboards.open_dashboard(dashboard_name=DASHBOARD_NAME)

    try:
        with When("I open the panel for edit"):
            with delay():
                dashboard.open_panel(panel_name=PANEL_NAME)

        with And("I switch to SQL editor"):
            with delay():
                panel.go_to_sql_editor(query_name="A")

        with And("I check the tags Array renders as a single label by default"):
            with delay():
                panel.click_run_query_button()
            wait_log_rows(driver)
            with delay():
                expand_log_row(driver)
            for attempt in retries(delay=2, timeout=30):
                with attempt:
                    page = driver.page_source
                    # Array default mode is Single: one whole-value label, no per-element accessors
                    assert "static_tag" in page, error()
                    assert "tags[" not in page, error()

        for mode_label in ("Hide", "Raw (body)"):
            with When(f"I set _map mode to {mode_label} via the modal"):
                open_advanced_logs_modal(driver)
                with delay():
                    set_field_mode(driver, "_map", mode_label)
                with delay(after=1):
                    modal_button(driver, "Save").click()

            with And("I re-run the query"):
                with delay():
                    panel.click_run_query_button()

            with And("I wait for log rows to render"):
                wait_log_rows(driver)

            if mode_label == "Hide":
                with Then("I check no _map labels are present"):
                    with delay():
                        expand_log_row(driver)
                    for attempt in retries(delay=2, timeout=30):
                        with attempt:
                            assert "map_key" not in driver.page_source, error()

            else:
                with Then("I check the map appears in the log line body"):
                    # raw mode appends ' _map={json}' to the message body; check innerText —
                    # the log highlighter splits '_map' and '={' into separate spans in the HTML
                    for attempt in retries(delay=2, timeout=30):
                        with attempt:
                            body_text = driver.execute_script("return document.body.innerText;")
                            assert "_map={" in body_text, error()

    finally:
        with Finally("I go back to dashboard"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay():
                dashboard.discard_changes_for_dashboard()


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def upgrade_safety_defaults(self):
    """Check that a panel with no saved logsFieldConfig renders the legacy
    label set: depth-1 Map expansion and no nested depth >1 accessors."""

    driver = self.context.driver

    with Given("I open the Advanced Logs Labels dashboard"):
        dashboards.open_dashboard(dashboard_name=DASHBOARD_NAME)

    with When("I wait for log rows to render"):
        wait_log_rows(driver)

    with And("I expand the first log row"):
        with delay():
            expand_log_row(driver)

    with Then("I check depth-1 map labels are present"):
        for attempt in retries(delay=2, timeout=30):
            with attempt:
                assert "_map['map_key" in driver.page_source, error()

    with And("I check no deeper-than-1 nested accessors are rendered"):
        # depth-2 bracket expansion would produce keys like _map['a']['b'];
        # check innerText, not page_source — ']][' occurs in bundled JS
        body_text = driver.execute_script("return document.body.innerText;")
        assert "']['" not in body_text, error()


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def bignum_precision(self):
    """Check that a UInt64 value above 2^53 keeps its exact digits in the
    rendered log labels/fields."""

    driver = self.context.driver

    with Given("I open the Advanced Logs Labels dashboard"):
        dashboards.open_dashboard(dashboard_name=DASHBOARD_NAME)

    with When("I wait for log rows to render"):
        wait_log_rows(driver)

    with And("I expand the log row with trace_id above 2^53"):
        # 'advanced log line 0' is the newest row (number=0), first with Descending sort
        with delay():
            expand_log_row(driver, marker="advanced log line 0")

    with Then("I check the exact UInt64 digits are present in the page"):
        for attempt in retries(delay=2, timeout=30):
            with attempt:
                assert BIG_UINT64 in driver.page_source, error()


@TestFeature
@Name("advanced logs fields")
def feature(self):
    """Tests for the 'Advanced log fields settings' modal and per-field
    Expand/Single/Hide/Raw rendering modes for Logs panels."""

    for scenario in loads(current_module(), Scenario):
        scenario()
