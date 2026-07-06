package main

import (
	"strings"
	"testing"

	"github.com/altinity/clickhouse-grafana/pkg/adhoc"
	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/altinity/clickhouse-grafana/pkg/timeutils"
	"github.com/stretchr/testify/require"
)

func validCreateQueryRequest() *CreateQueryRequest {
	r := &CreateQueryRequest{
		Query:               "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t",
		Database:            "default",
		Table:               "test_grafana",
		DateTimeType:        "DATETIME",
		DateTimeColDataType: "event_time",
		Interval:            "30s",
		IntervalFactor:      1,
	}
	r.TimeRange.From = "2025-01-02T03:04:05Z"
	r.TimeRange.To = "2025-01-02T04:05:06Z"
	return r
}

func TestBuildQueryContextSuccess(t *testing.T) {
	req := validCreateQueryRequest()
	qc, errCtx := buildQueryContext(req, req.Query, timeutils.TimeRangeStruct(req.TimeRange), "test")
	require.Nil(t, errCtx)
	require.NotContains(t, qc.SQL, "$timeSeries") // macros expanded
	require.True(t, qc.AST.HasOwnProperty("select"))
	require.False(t, qc.HasAdhocMacro)
}

func TestBuildQueryContextBadTimeRange(t *testing.T) {
	req := validCreateQueryRequest()
	req.TimeRange.From = "not-a-time"
	_, errCtx := buildQueryContext(req, req.Query, timeutils.TimeRangeStruct(req.TimeRange), "test")
	require.NotNil(t, errCtx)
	require.Equal(t, ErrorTypeTimeRange, errCtx.ErrorType)
}

func TestBuildQueryContextUnparsableSQL(t *testing.T) {
	req := validCreateQueryRequest()
	// A dangling JOIN is unparsable. The brief notes the exact error type may be
	// ErrorTypeMacroExpansion or ErrorTypeQueryParsing depending on which parse
	// pass fails first ("pin whichever the implementation actually produces").
	// ApplyMacrosAndTimeRangeToQuery front-loads a ToAST pass, so the shared build
	// path surfaces this as ErrorTypeMacroExpansion.
	req.Query = "SELECT * FROM t JOIN"
	_, errCtx := buildQueryContext(req, req.Query, timeutils.TimeRangeStruct(req.TimeRange), "test")
	require.NotNil(t, errCtx)
	require.Equal(t, ErrorTypeMacroExpansion, errCtx.ErrorType)
}

func adhocQC(t *testing.T, sql string) *queryContext {
	t.Helper()
	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	require.NoError(t, err)
	return &queryContext{SQL: sql, AST: ast, HasAdhocMacro: strings.Contains(sql, "$adhoc")}
}

func TestApplyAdhocFiltersInjectsIntoWhere(t *testing.T) {
	qc := adhocQC(t, "SELECT t, c FROM default.test_grafana WHERE x > 1")
	sql, errCtx := applyAdhocFiltersToAST(qc,
		[]adhoc.AdhocFilter{{Key: "default.test_grafana.service_name", Operator: "=", Value: "mysql"}},
		Target{Database: "default", Table: "test_grafana"}, true)
	require.Nil(t, errCtx)
	// PrintAST emits the injected condition across multiple indented lines
	// (see the apply_adhoc_basic golden). Normalize whitespace before asserting
	// the AND-ed condition the brief specifies.
	normalized := strings.Join(strings.Fields(sql), " ")
	require.Contains(t, normalized, "AND (service_name = 'mysql')")
}

func TestApplyAdhocMacroDivergencePreserved(t *testing.T) {
	// always-replace path (handleApplyAdhocFilters)
	qc := adhocQC(t, "SELECT t FROM default.test_grafana WHERE $adhoc")
	sql, errCtx := applyAdhocFiltersToAST(qc, nil, Target{Database: "default", Table: "test_grafana"}, true)
	require.Nil(t, errCtx)
	require.NotContains(t, sql, "$adhoc")
	require.Contains(t, sql, "1")

	// batch path: with 0 filters, $adhoc is historically left in place
	qc2 := adhocQC(t, "SELECT t FROM default.test_grafana WHERE $adhoc")
	sql2, errCtx := applyAdhocFiltersToAST(qc2, nil, Target{Database: "default", Table: "test_grafana"}, false)
	require.Nil(t, errCtx)
	require.Contains(t, sql2, "$adhoc")
}

func TestApplyAdhocFiltersNoFrom(t *testing.T) {
	qc := adhocQC(t, "SELECT 1")
	_, errCtx := applyAdhocFiltersToAST(qc,
		[]adhoc.AdhocFilter{{Key: "a.b.c", Operator: "=", Value: "v"}},
		Target{Database: "a", Table: "b"}, true)
	require.NotNil(t, errCtx) // graceful error, no panic (Task 3 semantics)
}
