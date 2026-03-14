import time

from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

from selenium.webdriver.common.by import By as SelectBy

import steps.ui as ui
import steps.panel.view as panel
import steps.dashboard.view as dashboard


@TestScenario
def worldmap_panel_exists(self):
    """Check that the World Map Example panel exists on the dashboard."""

    with When("I open the worldmap and table format example dashboard"):
        ui.open_endpoint(
            endpoint=f"{self.context.endpoint}d/kdQHiyMGk/worldmap-and-table-format-example?orgId=1&from=now-6h&to=now"
        )

    with Then("I check the 'World Map Example' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(panel_name="World Map Example"), error()

    with And("I check the 'table short format' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(panel_name="table short format"), error()

    with And("I check there are no error indicators on the panels"):
        driver = self.context.driver
        with delay():
            error_elements = driver.find_elements(
                SelectBy.XPATH,
                "//*[contains(@data-testid, 'Panel status error')]"
                " | //*[contains(@aria-label, 'Panel status error')]"
                " | //*[contains(@aria-label, 'Panel header error')]",
            )
            assert len(error_elements) == 0, error()


@TestScenario
def worldmap_table_view_has_correct_data(self):
    """Check that the World Map Example panel table view shows correct transformed data.

    The panel uses Format As: Time series with a Reduce (Series to rows, sum) transformation.
    After transformation the table should have 'Field' column with country codes
    and 'Total' column with aggregated values.
    """

    with When("I open the worldmap panel in edit mode"):
        ui.open_endpoint(
            endpoint=f"{self.context.endpoint}d/kdQHiyMGk/worldmap-and-table-format-example?orgId=1&from=now-6h&to=now&editPanel=2"
        )

    with And("I wait for the panel to load"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(panel_name="World Map Example"), error()

    with When("I enable table view"):
        driver = self.context.driver
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                toggle = driver.find_element(
                    SelectBy.CSS_SELECTOR,
                    "[data-testid='data-testid toggle-table-view']",
                )
                if not toggle.is_selected():
                    toggle.click()

    with Then("I check that the table has 'Field' and 'Total' columns"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert panel.check_columns_in_table_view(
                        columns=["Field", "Total"]
                    ), error()

    with And("I check that the table contains country codes"):
        expected_countries = ["AR", "CN", "DE", "EU", "FR", "NL", "RU", "TK", "UK", "US"]
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    cells = driver.find_elements(SelectBy.CSS_SELECTOR, "[role='gridcell']")
                    cell_texts = [c.text for c in cells]
                    for country in expected_countries:
                        assert country in cell_texts, error()

    with And("I check that 'Total' values are numeric and greater than zero"):
        cells = driver.find_elements(SelectBy.CSS_SELECTOR, "[role='gridcell']")
        cell_texts = [c.text for c in cells]
        # Every other cell starting from index 1 is a Total value
        total_values = cell_texts[1::2]
        assert len(total_values) >= 10, error()
        for val in total_values:
            numeric_val = float(val.replace(",", ""))
            assert numeric_val > 0, error()


@TestScenario
def worldmap_geomap_has_markers(self):
    """Check that the World Map Example geomap panel renders map markers.

    The geomap panel should render canvas elements inside the map area
    that represent the country markers from the Lookup location mode.
    """

    with When("I open the worldmap and table format example dashboard"):
        ui.open_endpoint(
            endpoint=f"{self.context.endpoint}d/kdQHiyMGk/worldmap-and-table-format-example?orgId=1&from=now-6h&to=now"
        )

    with Then("I check the 'World Map Example' panel exists"):
        for attempt in retries(delay=5, timeout=30):
            with attempt:
                with delay():
                    assert dashboard.check_panel_exists(panel_name="World Map Example"), error()

    with And("I check that the geomap has a navigable map with canvas layers"):
        driver = self.context.driver
        for attempt in retries(delay=5, timeout=60):
            with attempt:
                with delay():
                    # Geomap renders OpenLayers map with canvas elements
                    map_canvases = driver.find_elements(
                        SelectBy.CSS_SELECTOR,
                        "[data-viz-panel-key] canvas"
                        ", [aria-label='Navigable map'] canvas",
                    )
                    assert len(map_canvases) > 0, error()

    with And("I check there are no error indicators on the panel"):
        with delay():
            error_elements = driver.find_elements(
                SelectBy.XPATH,
                "//*[contains(@data-testid, 'Panel status error')]"
                " | //*[contains(@aria-label, 'Panel status error')]",
            )
            assert len(error_elements) == 0, error()


@TestFeature
@Name("worldmap and table format")
def feature(self):
    """Worldmap and table format dashboard tests."""

    for scenario in loads(current_module(), Scenario):
        scenario()
