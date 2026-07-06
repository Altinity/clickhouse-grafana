package main

import (
	"testing"

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
