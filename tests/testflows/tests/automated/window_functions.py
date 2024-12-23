from numpy import corrcoef
from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

import csv
import steps.ui as ui
import steps.actions as actions
import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.panel.sql_editor.view as sql_editor

from requirements.requirements import *


@TestOutline
def window_functions_outline(self, panel_name, panel_names, column=None):
    """Check that grafana plugin supports window functions."""

    with When(f"I download data for {panel_name} panel{'' if column is None else ', ' + column + ' column'}"):
        with When("I scroll down to the panel"):
            if panel_names.index(panel_name) != 0:
                dashboard.scroll_to_panel(panel_name=panel_names[panel_names.index(panel_name) - 1])

        with When(f"I open panel {panel_name}"):
            with delay():
                dashboard.open_panel(panel_name=panel_name)

        with And("I click run query button"):
            with delay():
                panel.click_run_query_button()
                
        with And("I open Query inspector"):
            with delay(after=0.5):
                panel.click_inspect_query_button()

        with And("I open Data tab in query inspector modal"):
            with delay(after=0.5):
                panel.click_query_inspector_data_tab()

        if not (column is None):
            with And("I change csv file to download"):
                with delay():
                    panel.change_column_for_download(column=column)

        with And("I download csv data file"):
            with delay():
                panel.click_query_inspector_download_csv_button()

        with And("I close query inspector"):
            with delay():
                panel.click_query_inspector_close_button()

        with And("I click discard changes"):
            with delay():
                panel.click_discard_button()

    with When(f"I download data for {panel_name} - without window functions panel{'' if column is None else ', ' + column + ' column'}"):
        with When(f"I open panel {panel_name} - without window functions"):
            with delay():
                dashboard.open_panel(panel_name=f"{panel_name} - without window functions")

        with And("I click run query button"):
            with delay():
                panel.click_run_query_button()

        with And("I open Query inspector"):
            with delay(after=0.5):
                panel.click_inspect_query_button()

        with And("I open Data tab in query inspector modal"):
            with delay(after=0.5):
                panel.click_query_inspector_data_tab()

        if not (column is None):
            with And("I change csv file to download"):
                with delay():
                    panel.change_column_for_download(column=column)

        with And("I download csv data file"):
            with delay():
                panel.click_query_inspector_download_csv_button()

        with And("I close query inspector"):
            with delay():
                panel.click_query_inspector_close_button()

        with And("I click discard changes"):
            with delay():
                panel.click_discard_button()

    with Then("I save two csv files"):
        with delay():
            with By("saving container id"):
                r = self.context.cluster.command(None, "docker ps -a | grep '4444/tcp, 5900/tcp'")
                container_id = r.output.split(" ")[0]
                column_name = '' if column is None else '/column' + column[4]

            with By("moving csv file from docker"):
                r = self.context.cluster.command(None, f"rm -rf tests/automated/window_functions/{panel_name[1:]}{column_name}")
                r = self.context.cluster.command(None, f"mkdir -p tests/automated/window_functions/{panel_name[1:]}{column_name}")
                r = self.context.cluster.command(None, f"docker cp {container_id}:/home/seluser/Downloads/ tests/automated/window_functions/{panel_name[1:]}{column_name}")
                r = self.context.cluster.command(None, f"docker exec {container_id} rm -rf /home/seluser/Downloads/")

    with Then("I compare two csv files"):
        with delay():
            with By("defining filenames"):
                filename_with_window_functions = self.context.cluster.command(None, f"ls tests/automated/window_functions/{panel_name[1:]}{column_name}/Downloads/*{panel_name[1:]}-*").output[1:-1]
                filename_without_window_functions = self.context.cluster.command(None, f"ls tests/automated/window_functions/{panel_name[1:]}{column_name}/Downloads/*{panel_name[1:]}\ *").output[1:-1]

            with By("getting values from files"):
                with Step("without window functions"):
                    file_without_window_functions = open(filename_without_window_functions)
                    data_without_window_functions = []
                    for row in csv.reader(file_without_window_functions):
                        data_without_window_functions.append(row[1])
                    file_without_window_functions.close()

                with Step("with window functions"):
                    file_with_window_functions = open(filename_with_window_functions)
                    data_with_window_functions = []
                    for row in csv.reader(file_with_window_functions):
                        data_with_window_functions.append(row[1])
                    file_with_window_functions.close()

            with By("calculating correlation between this values"):
                data_without_window_functions = [0 if i == '' else float(i) for i in data_without_window_functions[1:]]
                data_with_window_functions = [0 if i == '' else float(i) for i in data_with_window_functions[1:]]
                correlation = corrcoef(data_without_window_functions[1:], data_with_window_functions[1:])[0,1]
                note(f"correlation for {panel_name}: {correlation}")
                note(data_without_window_functions)
                note(data_with_window_functions)
                assert correlation > 0.99, error()

@TestFeature
@Name("window functions")
def feature(self):
    """Check that grafana plugin supports window functions."""

    panel_names = [
        '$delta',
        '$deltaColumns',
        '$deltaColumnsAggregated',
        '$increase',
        '$increaseColumns',
        '$increaseColumnsAggregated',
        '$perSecond',
        '$perSecondColumns',
        '$perSecondColumnsAggregated',
        '$rate',
        '$rateColumns',
        '$rateColumnsAggregated',
    ]

    with Given(f"I open dashboard window functions"):
        ui.open_endpoint(endpoint='http://grafana:3000/d/de6482iletr0gc/window-functions')

    for panel_name in panel_names:
        if "Columns" in panel_name:
            with Scenario(f"{panel_name} function first row"):
                window_functions_outline(panel_name=panel_name, panel_names=panel_names, column="test1 (0)")

            with Scenario(f"{panel_name} function second row"):
                window_functions_outline(panel_name=panel_name, panel_names=panel_names, column="test2 (1)")
        else:
            with Scenario(f"{panel_name} function"):
                window_functions_outline(panel_name=panel_name, panel_names=panel_names)

    with Finally("I discard changes for dashboard"):
        dashboard.discard_changes_for_dashboard()