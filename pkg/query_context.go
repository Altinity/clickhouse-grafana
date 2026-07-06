package main

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/altinity/clickhouse-grafana/pkg/timeutils"
)

type queryContext struct {
	SQL           string
	AST           *eval.EvalAST
	From, To      time.Time
	HasAdhocMacro bool
}

// buildQueryContext is the single query-preparation path shared by
// handleCreateQuery, handleProcessQueryBatch and handleCreateQueryWithAdhoc.
// It parses the time range, expands macros and parses the AST.
// On failure returns (nil, *ErrorContext) ready for sendUniversalErrorResponse.
func buildQueryContext(request interface{}, rawQuery string, timeRange timeutils.TimeRangeStruct, handler string) (*queryContext, *ErrorContext) {
	hasAdhocMacro := strings.Contains(rawQuery, "$adhoc")

	from, to, err := timeutils.ParseTimeRange(timeRange)
	if err != nil {
		return nil, &ErrorContext{
			ErrorType:     ErrorTypeTimeRange,
			OriginalSQL:   rawQuery,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: fmt.Errorf("Invalid time range: %v", err),
			Handler:       handler,
			Status:        http.StatusBadRequest,
		}
	}

	evalQ := eval.NewEvalQuery(request, from, to)
	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		return nil, &ErrorContext{
			ErrorType:     ErrorTypeMacroExpansion,
			OriginalSQL:   rawQuery,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: fmt.Errorf("Failed to apply macros: %v", err),
			Handler:       handler,
			Status:        http.StatusInternalServerError,
		}
	}

	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	if err != nil {
		return nil, &ErrorContext{
			ErrorType:     ErrorTypeQueryParsing,
			OriginalSQL:   rawQuery,
			ProcessedSQL:  sql,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: err,
			Handler:       handler,
			Status:        http.StatusInternalServerError,
		}
	}

	return &queryContext{SQL: sql, AST: ast, From: from, To: to, HasAdhocMacro: hasAdhocMacro}, nil
}
