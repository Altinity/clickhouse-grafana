from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_Alerts_RuleType_GrafanaManaged("1.0"))
def alerts_grafana_managed(self):
    """Check that Grafana-managed alerts works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to alerts setup page", description="Alerts > click 'New alert rule' button"):
        open_picture(picture="tests/manual/screenshots/alert_setup_page.png")
        pass

    with And("I setup Grafana-managed alert for clickhouse dashboard"):
        open_picture(picture="tests/manual/screenshots/alert_setup.png")
        pass

    with Then("I Check Graph is appeared after clicking preview button"):
        pass

    with And("I set up 'Set evaluation behavior field'"):
        open_picture(picture="tests/manual/screenshots/set_evaluation_behavior.png")
        pass

    with And("I click 'Save rule and exit button'"):
        pass

    with And("I check that initially alert is green then it is red"):
        open_picture(picture="tests/manual/screenshots/green_alert.png")
        open_picture(picture="tests/manual/screenshots/red_alert.png")
        pass


@TestScenario
@XFailed("Can't use data source managed alerts")
@Requirements(RQ_SRS_Plugin_Alerts_RuleType_DataSourceManaged("1.0"))
def alerts_data_source_managed(self):
    """Check that Data source-managed alerts works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with When("I go to alerts setup page", description="Alerts > click 'New alert rule' button"):
        open_picture(picture="tests/manual/screenshots/alert_setup_page.png")
        pass

    with And("I setup Data source-managed alert for clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with Then("I check that alerts are working correctly"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_Alerts("1.0"),
              RQ_SRS_Plugin_Alerts_AlertSetupPage("1.0"))
@Name("alerts")
def feature(self):
    """Check that Plugin support alerts."""

    for scenario in loads(current_module(), Scenario):
        scenario()
