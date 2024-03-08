from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
def test_visualization_types(self, visualization_type):
    """Check that the Plugin support Grafana visualizations."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table",
               description="table contain the following datatypes: timestamp, "
                           "UInt8"):
        create_table()

    with When(f"I create visualizations for this table using {visualization_type} visualization"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_Visualization_VisualizationTypes("1.0"))
@Name("visualization types")
def feature(self):
    """Check that Plugin support any Grafana visualization types."""

    list_of_visualization_types = [
        "Time series",
        "Bar chart",
        "Stat",
        "Gauge",
        "Bar Gauge",
        "Pie chart",
        "State timeline",
        "Heatmap",
        "Status history",
        "Histogram",
        "Text",
        "Alert List",
        "Dashboard list",
        "News",
        "Annotation list",
        "Candlestick",
        "Canvas",
        "Flame Graph",
        "Geomap",
        "Logs",
        "Node Graph",
        "Traces",
    ]
    for visualization_type in list_of_visualization_types:
        test_visualization_types(visualization_type=visualization_type)
