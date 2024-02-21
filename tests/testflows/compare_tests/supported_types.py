from requirements.requirements import *
from testflows.core import *
from compare_tests.steps import *


@TestScenario
def Uint(self):
    """Check that the Plugin support UInt types."""

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
def Int(self):
    """Check that the Plugin support Int types."""

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
def Float(self):
    """Check that the Plugin support Float types."""

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
def Decimal(self):
    """Check that the Plugin support Decimal types."""

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
def Bool(self):
    """Check that the Plugin support Bool type."""

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
def String(self):
    """Check that the Plugin support String type."""

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
def FixedString(self):
    """Check that the Plugin support FixedString(N) types."""

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
def Date(self):
    """Check that the Plugin support Date types."""

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
def JSON(self):
    """Check that the Plugin support JSON type."""

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
def UUID(self):
    """Check that the Plugin support UUID type."""

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
def Enum(self):
    """Check that the Plugin support Enum type."""

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
def LowCardinality(self):
    """Check that the Plugin support LowCardinality type."""

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
def Array(self):
    """Check that the Plugin support Array type."""

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
def Map(self):
    """Check that the Plugin support Map type."""

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
def SimpleAggregateFunction(self):
    """Check that the Plugin support SimpleAggregateFunction type."""

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
def AggregateFunction(self):
    """Check that the Plugin support AggregateFunction type."""

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
def Nested(self):
    """Check that the Plugin support Nested type."""

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
def Tuple(self):
    """Check that the Plugin support Tuple type."""

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
def Nullable(self):
    """Check that the Plugin support Nullable type."""

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
def IPv4(self):
    """Check that the Plugin support IPv4 type."""

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
def IPv6(self):
    """Check that the Plugin support IPv6 type."""

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
def Point(self):
    """Check that the Plugin support Point type."""

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
def Ring(self):
    """Check that the Plugin support Ring type."""

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
def Polygon(self):
    """Check that the Plugin support Polygon type."""

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
def MultiPolygon(self):
    """Check that the Plugin support MultiPolygon type."""

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
def Expression(self):
    """Check that the Plugin support Expression type."""

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
def Set(self):
    """Check that the Plugin support Set type."""

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
def Nothing(self):
    """Check that the Plugin support Nothing type."""

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
def Interval(self):
    """Check that the Plugin support Interval type."""

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
@Requirements(RQ_SRS_Plugin_SupportedTypes("1.0"))
@Name("supported types")
def feature(self):
    """Check that Plugin support all clickhouse datatypes."""

    for scenario in loads(current_module(), Scenario):
        scenario()
