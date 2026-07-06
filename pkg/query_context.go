package main

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/altinity/clickhouse-grafana/pkg/adhoc"
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
			OriginalError: fmt.Errorf("invalid time range: %v", err),
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
			OriginalError: fmt.Errorf("failed to apply macros: %v", err),
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

// applyAdhocFiltersToAST injects adhoc conditions into qc.AST's innermost
// WHERE (or substitutes the $adhoc macro) and returns the resulting SQL.
// replaceAdhocMacroAlways preserves the historical divergence:
//
//	true  = handleApplyAdhocFilters behavior ($adhoc replaced even with 0 filters)
//	false = handleProcessQueryBatch/handleCreateQueryWithAdhoc behavior
func applyAdhocFiltersToAST(qc *queryContext, filters []adhoc.AdhocFilter, target Target, replaceAdhocMacroAlways bool) (string, *ErrorContext) {
	query := qc.SQL
	topQueryAst := qc.AST
	adhocConditions := make([]string, 0)

	if len(filters) > 0 {
		ast := eval.InnermostFrom(topQueryAst)

		if !ast.HasOwnProperty("where") {
			ast.Obj["where"] = &eval.EvalAST{Obj: make(map[string]interface{}), Arr: make([]interface{}, 0)}
		}

		fromAst, okFrom := ast.SubAST("from")
		fromExpr, okExpr := fromAst.StringAt(0)
		if !okFrom || !okExpr {
			return "", &ErrorContext{
				ErrorType:     ErrorTypeFromClause,
				OriginalSQL:   qc.SQL,
				HasAdhocMacro: qc.HasAdhocMacro,
				OriginalError: fmt.Errorf("query has no FROM table expression"),
				Handler:       "applyAdhocFiltersToAST",
				Status:        http.StatusInternalServerError,
			}
		}
		targetDatabase, targetTable := parseTargets(fromExpr, target.Database, target.Table)
		if targetDatabase == "" && targetTable == "" {
			return "", &ErrorContext{
				ErrorType:     ErrorTypeFromClause,
				OriginalSQL:   qc.SQL,
				HasAdhocMacro: qc.HasAdhocMacro,
				OriginalError: fmt.Errorf("FROM expression can't be parsed - unable to determine target database and table"),
				Handler:       "applyAdhocFiltersToAST",
				Status:        http.StatusInternalServerError,
			}
		}

		adhocConditions = adhoc.ProcessAdhocFilters(filters, targetDatabase, targetTable)

		if !strings.Contains(query, "$adhoc") {
			whereAst, _ := ast.SubAST("where")
			if len(adhocConditions) > 0 {
				combinedCondition := strings.Join(adhocConditions, " AND ")
				if len(whereAst.Arr) > 0 {
					whereAst.Arr = append(whereAst.Arr, "AND", fmt.Sprintf("(%s)", combinedCondition))
				} else {
					whereAst.Arr = append(whereAst.Arr, combinedCondition)
				}
			}
			query = eval.PrintAST(topQueryAst, " ")
		}
	}

	// Historical divergence, preserved deliberately (see design doc §2.4):
	// the standalone adhoc handler replaces $adhoc even with zero filters;
	// the batch/createWithAdhoc paths only replace it when filters exist.
	if strings.Contains(query, "$adhoc") && (replaceAdhocMacroAlways || len(filters) > 0) {
		renderedCondition := "1"
		if len(adhocConditions) > 0 {
			renderedCondition = fmt.Sprintf("(%s)", strings.Join(adhocConditions, " AND "))
		}
		query = strings.ReplaceAll(query, "$adhoc", renderedCondition)
	}

	return query, nil
}
