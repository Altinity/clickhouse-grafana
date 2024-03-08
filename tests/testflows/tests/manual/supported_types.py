from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
@Okayed("Ok")
def Uint(self):
    """Check that the Plugin support UInt datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "UInt8, UInt16, UInt32, UInt64, UInt128, UInt256"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Int(self):
    """Check that the Plugin support Int datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Int8, Int16, Int32, Int64, Int128, Int256"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Float(self):
    """Check that the Plugin support Float datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Float32, Float64"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Decimal(self):
    """Check that the Plugin support Decimal datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Decimal(P), Decimal(P, S), Decimal32(S), Decimal64(S), Decimal128(S), Decimal256(S)"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Bool(self):
    """Check that the Plugin support Bool datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Bool"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def String(self):
    """Check that the Plugin support String datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "String"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def FixedString(self):
    """Check that the Plugin support FixedString(N) datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "FixedString(N)"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Date(self):
    """Check that the Plugin support Date datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Date, Date32, DateTime, DateTime64"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def JSON(self):
    """Check that the Plugin support JSON datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "JSON"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def UUID(self):
    """Check that the Plugin support UUID datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "UUID"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Enum(self):
    """Check that the Plugin support Enum datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Enum"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def LowCardinality(self):
    """Check that the Plugin support LowCardinality datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "LowCardinality"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@XFailed("not supported")
def Array(self):
    """Check that the Plugin support Array datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Array"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Map(self):
    """Check that the Plugin support Map datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Map"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@XFailed("not supported")
def SimpleAggregateFunction(self):
    """Check that the Plugin support SimpleAggregateFunction datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "SimpleAggregateFunction"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@XFailed("not supported")
def AggregateFunction(self):
    """Check that the Plugin support AggregateFunction datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "AggregateFunction"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Nested(self):
    """Check that the Plugin support Nested datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Nested"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@XFailed("not supported")
def Tuple(self):
    """Check that the Plugin support Tuple datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Tuple"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Nullable(self):
    """Check that the Plugin support Nullable datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Nullable"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def IPv4(self):
    """Check that the Plugin support IPv4 datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "IPv4"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def IPv6(self):
    """Check that the Plugin support IPv6 datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "IPv6"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Point(self):
    """Check that the Plugin support Point datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Point"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Ring(self):
    """Check that the Plugin support Ring datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Ring"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def Polygon(self):
    """Check that the Plugin support Polygon datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Polygon"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@Okayed("Ok")
def MultiPolygon(self):
    """Check that the Plugin support MultiPolygon datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "MultiPolygon"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@XFailed("not supported")
def Expression(self):
    """Check that the Plugin support Expression datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Expression"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@XFailed("Not supported")
def Set(self):
    """Check that the Plugin support Set datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Set"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@XFailed("not supported")
def Nothing(self):
    """Check that the Plugin support Nothing datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Nothing"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestScenario
@XFailed("Not supported")
def Interval(self):
    """Check that the Plugin support Interval datatype."""

    with Given("I create new dashboard"):
        create_dashboard()

    with Given("I create new panel"):
        create_panel()

    with Given("I create new table with UInt datatypes",
               description="table contain the following datatypes: timestamp, "
                           "Interval"):
        create_table()

    with When("I create visualizations for this table"):
        pass

    with Then("I check that visualizations from different versions are simular"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_SupportedDataTypes("1.0"))
@Name("supported types")
def feature(self):
    """Check that Plugin support all ClickHouse datatypes."""

    for scenario in loads(current_module(), Scenario):
        scenario()
