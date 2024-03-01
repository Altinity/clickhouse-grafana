from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestOutline(Scenario)
def test_variable_type(self, variable_type):
    f"""Check that the Plugin support {variable_type} variable."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I add variable"):
        add_variable(variable_type=variable_type)

    with When(f"I create panel with variable in name for this table using variable with {variable_type} type"):
        pass

    with Then("I check that visualizations from different plugin versions are simular"):
        open_picture(picture="tests/manual/screenshots/variable.png")
        pass


@TestScenario
@Okayed("Ok")
def query_variable(self):
    """Check that the Plugin support query variable."""

    test_variable_type(variable_type="query")


@TestScenario
@Okayed("Ok")
def custom_variable(self):
    """Check that the Plugin support custom variable."""

    test_variable_type(variable_type="custom")


@TestScenario
@Okayed("Ok")
def text_box_variable(self):
    """Check that the Plugin support text box variable."""

    test_variable_type(variable_type="text box")


@TestScenario
@Okayed("Ok")
def constant_variable(self):
    """Check that the Plugin support constant variable."""

    test_variable_type(variable_type="constant")


@TestScenario
@Okayed("Ok")
def data_source_variable(self):
    """Check that the Plugin support sata source variable."""

    test_variable_type(variable_type="data source")


@TestScenario
@Okayed("Ok")
def interval_variable(self):
    """Check that the Plugin support interval variable."""

    test_variable_type(variable_type="interval")


@TestScenario
@Okayed("Ok")
def ad_hoc_filter_variable(self):
    """Check that the Plugin support ad hoc filter variable."""

    test_variable_type(variable_type="ad hoc filter")


@TestFeature
@Requirements(RQ_SRS_Plugin_Variables("1.0"))
@Name("variables")
def feature(self):
    """Check that Plugin support any types of Grafana variables."""

    for scenario in loads(current_module(), Scenario):
        scenario()
