from testflows.core import *
from testflows.asserts import error

from requirements.requirements import *


@TestScenario
@Requirements(RQ_SRS_Plugin("1.0"))
def log_context_where_clause_in_subquery(self):
    """Check that Show Context log queries place WHERE conditions inside
    the inner subquery so that non-timestamp columns are accessible.

    Regression test for https://github.com/Altinity/clickhouse-grafana/issues/706
    """

    cluster = self.context.cluster
    docker_compose = cluster.docker_compose

    def run_clickhouse_query(query, exitcode=0):
        """Run a query against ClickHouse via clickhouse-client in docker."""
        result = cluster.command(
            None,
            f"""{docker_compose} exec -T clickhouse clickhouse-client --query "{query}" """,
            exitcode=exitcode,
            timeout=30,
        )
        return result

    with Given("I verify test_logs table has data"):
        result = run_clickhouse_query("SELECT count() FROM default.test_logs")
        assert int(result.output.strip()) > 0, error()

    with When("I run the fixed backward context query with WHERE in inner subquery"):
        result = run_clickhouse_query(
            "SELECT timestamp FROM ("
            " SELECT event_time,"
            " FIRST_VALUE(event_time) OVER (ORDER BY event_time ROWS BETWEEN 10 PRECEDING AND CURRENT ROW) AS timestamp"
            " FROM default.test_logs"
            " WHERE level = 'Warn'"
            " ORDER BY event_time"
            ") WHERE event_time = toDateTime(now())"
        )

        with Then("query should succeed without UNKNOWN_IDENTIFIER error"):
            assert "UNKNOWN_IDENTIFIER" not in result.output, error()

    with When("I run the fixed forward context query with WHERE in inner subquery"):
        result = run_clickhouse_query(
            "SELECT timestamp FROM ("
            " SELECT event_time,"
            " LAST_VALUE(event_time) OVER (ORDER BY event_time ROWS BETWEEN CURRENT ROW AND 10 FOLLOWING) AS timestamp"
            " FROM default.test_logs"
            " WHERE level = 'Warn'"
            " ORDER BY event_time"
            ") WHERE event_time = toDateTime(now())"
        )

        with Then("query should succeed without UNKNOWN_IDENTIFIER error"):
            assert "UNKNOWN_IDENTIFIER" not in result.output, error()

    with When("I verify the buggy pattern would fail with UNKNOWN_IDENTIFIER"):
        result = run_clickhouse_query(
            "SELECT timestamp FROM ("
            " SELECT event_time,"
            " FIRST_VALUE(event_time) OVER (ORDER BY event_time ROWS BETWEEN 10 PRECEDING AND CURRENT ROW) AS timestamp"
            " FROM default.test_logs"
            " ORDER BY event_time"
            ") WHERE level = 'Warn' AND event_time = toDateTime(now())",
            exitcode=None,
        )

        with Then("buggy query should fail with UNKNOWN_IDENTIFIER"):
            assert "UNKNOWN_IDENTIFIER" in result.output, error()


@TestFeature
@Name("log context")
def feature(self):
    """Tests for log context query generation (Show Context button).

    Regression tests for https://github.com/Altinity/clickhouse-grafana/issues/706
    """

    for scenario in loads(current_module(), Scenario):
        scenario()
