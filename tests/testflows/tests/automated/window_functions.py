from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

import steps.ui as ui
import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor

from requirements.requirements import *


@TestOutline
def window_functions_outline(self, panel_name):
    """Check that grafana plugin supports window functions."""

    with When(f"I open panel {panel_name}"):
        with delay():
            dashboard.open_panel(panel_name=panel_name)

    with And("I open Query inspector"):
        with delay():
            panel.click_inspect_query_button()

    with And("I open Data tab in query inspector modal"):
        with delay():
            panel.click_query_inspector_data_tab()

    with And("I download csv data file"):
        with delay():
            panel.click_query_inspector_download_csv_button()

    with And("I close query inspector"):
        with delay():
            panel.click_query_inspector_close_button()

    with And("I click discard changes"):
        with delay():
            panel.click_discard_button()

    with When(f"I open panel {panel_name} - without window functions"):
        with delay():
            dashboard.open_panel(panel_name=f"{panel_name} - without window functions")

    with And("I open Query inspector"):
        with delay():
            panel.click_inspect_query_button()

    with And("I open Data tab in query inspector modal"):
        with delay():
            panel.click_query_inspector_data_tab()

    with And("I download csv data file"):
        with delay():
            panel.click_query_inspector_download_csv_button()

    with And("I close query inspector"):
        with delay():
            panel.click_query_inspector_close_button()

    with And("I click discard changes"):
        with delay():
            panel.click_discard_button()
    pause()
    with Then("I compare two csv files"):
        with delay():
            r = self.context.cluster.command(None, "docker ps -a | grep '4444/tcp, 5900/tcp'")
            note(r.output)
            container_id = r.output.split(" ")[0]
            note(container_id)
            r = self.context.cluster.command(None, f"docker cp {container_id}:/home/seluser/Downloads/ widow_functions/")
            note(r.output)

@TestFeature
@Name("window functions")
def feature(self):
    """Check that grafana plugin supports window functions."""

    panel_names = [
        '$delta',
        '$deltaColumns',
        '$deltaColumnsAggregated',
        '$increase',
        # '$increaseColumns',
        # '$increaseColumnsAggregated',
        # '$perSecond',
        # '$perSecondColumns',
        # '$perSecondColumnsAggregated',
        # '$rate',
        # '$rateColumns',
        # '$rateColumnsAggregated',
    ]

    with Given(f"I open dashboard window functions"):
        ui.open_endpoint(endpoint='http://grafana:3000/d/de6482iletr0gc/window-functions')

    for panel_name in panel_names:
        with Scenario(f"{panel_name} function"):
            window_functions_outline(panel_name=panel_name)
