from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_AutoCompleteInQueries("1.0"))
def auto_complete_in_queries(self):
    """Check that auto-complete in queries works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I try to write table name"):
        pass

    with Then("I check auto-complete dropdown for tables"):
        pass

    with When("I try to write field name"):
        pass

    with Then("I check auto-complete dropdown for fields"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_SQLEditor("1.0"))
def raw_sql_editor(self):
    """Check that auto-complete in queries works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with And("I change SQL query"):
        pass

    with Then("I check visualization is changed"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_Extrapolation("1.0"))
def extrapolation(self):
    """Check that extrapolation toggle works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with And("I click extrapolation toggle"):
        pass

    with Then("I check visualization is changed"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_SkipComments("1.0"))
def skip_comments(self):
    """Check that skip comments toggle works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with When("I add comment to SQL query"):
        pass

    with And("I click skip comments toggle"):
        pass

    with Then("I check comments appeared in clickhouse logs"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_Step("1.0"))
def step(self):
    """Check that step textfield works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with And("I change step"):
        pass

    with Then("I check visualization is changed"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_Round("1.0"))
def round(self):
    """Check that round textfield works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with And("I change round"):
        pass

    with Then("I check visualization is changed"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_Resolution("1.0"))
def resolution(self):
    """Check that resolution textfield works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with And("I change resolution"):
        pass

    with Then("I check visualization is changed"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_FormatAs("1.0"))
def format_as(self):
    """Check that Format As dropdown works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with And("I change Format As to Time series"):
        pass

    with Then("I check visualization is not changed"):
        pass

    with When("I change Format As to Table"):
        pass

    with Then("I check visualization is changed"):
        pass

    with When("I change Format As to Logs"):
        pass

    with Then("I check visualization is changed"):
        pass

    with When("I change Format As to Trace"):
        pass

    with Then("I check visualization is changed"):
        pass

    with When("I change Format As to Flamegraph"):
        pass

    with Then("I check visualization is changed"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_ShowHelp("1.0"))
def show_help(self):
    """Check that resolution Show help button works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with And("I click Show help button"):
        pass

    with Then("I check help field is appeared"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_ShowGeneratedSQL("1.0"))
def show_generated_sql(self):
    """Check that resolution Show generated SQL button works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with And("I click Show help button"):
        pass

    with Then("I check generated SQL field is appeared"):
        pass

    with And("I check generated SQL not contain macro, functions, or variables"):
        pass


@TestScenario
@XFailed("Don't see any changes")
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface_ReformatQuery("1.0"))
def reformat_query(self):
    """Check that resolution Reformat Query button works correctly."""

    with Given("I go to clickhouse dashboard"):
        pass

    with And("I go to repeated postgres panel"):
        pass

    with When("I go to raw SQL editor"):
        pass

    with And("I change SQL query"):
        pass

    with And("I click Reformat Query button"):
        pass

    with Then("I check SQL query is reformatted"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_RawSQLEditorInterface("1.0"))
@Name("raw sql editor")
def feature(self):
    """Check that Plugin supports query setup."""

    for scenario in loads(current_module(), Scenario):
        scenario()