package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// Request/Response structures for resource handlers

type AdhocFilter struct {
	Key      string      `json:"key"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

type Target struct {
	Database string `json:"database"`
	Table    string `json:"table"`
}

type ApplyAdhocFiltersRequest struct {
	Query        string        `json:"query"`
	AdhocFilters []AdhocFilter `json:"adhocFilters"`
	Target       Target        `json:"target"`
}

type ApplyAdhocFiltersResponse struct {
	Query string `json:"query"`
	Error string `json:"error,omitempty"`
}

type CreateQueryRequest struct {
	RefId                  string `json:"refId"`
	RuleUid                string `json:"ruleUid"`
	RawQuery               bool   `json:"rawQuery"`
	Query                  string `json:"query"`
	DateTimeColDataType    string `json:"dateTimeColDataType"`
	DateColDataType        string `json:"dateColDataType"`
	DateTimeType           string `json:"dateTimeType"`
	Extrapolate            bool   `json:"extrapolate"`
	SkipComments           bool   `json:"skip_comments"`
	AddMetadata            bool   `json:"add_metadata"`
	Format                 string `json:"format"`
	Round                  string `json:"round"`
	IntervalFactor         int    `json:"intervalFactor"`
	Interval               string `json:"interval"`
	Database               string `json:"database"`
	Table                  string `json:"table"`
	MaxDataPoints          int64  `json:"maxDataPoints"`
	FrontendDatasource     bool   `json:"frontendDatasource"`
	UseWindowFuncForMacros bool   `json:"useWindowFuncForMacros"`
	TimeRange              struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"timeRange"`
}

type CreateQueryResponse struct {
	SQL   string        `json:"sql"`
	Keys  []interface{} `json:"keys"`
	Error string        `json:"error,omitempty"`
}

type ReplaceTimeFiltersRequest struct {
	Query        string `json:"query"`
	DateTimeType string `json:"dateTimeType"`
	TimeRange    struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"timeRange"`
}

type ReplaceTimeFiltersResponse struct {
	SQL   string `json:"sql"`
	Error string `json:"error,omitempty"`
}

type GetAstPropertyRequest struct {
	Query        string `json:"query"`
	PropertyName string `json:"propertyName"`
}

type GetAstPropertyResponse struct {
	Properties []interface{} `json:"properties"`
	Error      string        `json:"error,omitempty"`
}

// Helper function to parse targets
func parseTargets(from string, defaultDatabase string, defaultTable string) (string, string) {
	if len(from) == 0 {
		return "", ""
	}

	var targetTable, targetDatabase string
	parts := strings.Split(from, ".")

	switch len(parts) {
	case 1:
		targetTable = parts[0]
		targetDatabase = defaultDatabase
	case 2:
		targetDatabase = parts[0]
		targetTable = parts[1]
	default:
		// Instead of panic, we'll return empty strings and handle the error in the caller
		return "", ""
	}

	if targetTable == "$table" {
		targetTable = defaultTable
	}

	return targetDatabase, targetTable
}

// Helper function to find GROUP BY properties recursively
func findGroupByProperties(ast *eval.EvalAST) []interface{} {
	// First, check if there's a GROUP BY at this level
	if prop, exists := ast.Obj["group by"]; exists {
		switch v := prop.(type) {
		case *eval.EvalAST:
			// If the property is an AST object, add all items from its array
			properties := make([]interface{}, len(v.Arr))
			copy(properties, v.Arr)
			return properties
		case []interface{}:
			// If the property is already a slice, use it directly
			return v
		default:
			// For any other type, add it as a single item
			return []interface{}{v}
		}
	}

	// If not found at this level, check if there's a FROM clause that might contain a subquery
	if from, exists := ast.Obj["from"]; exists {
		switch v := from.(type) {
		case *eval.EvalAST:
			// If FROM contains another AST (subquery), recursively search in it
			subProperties := findGroupByProperties(v)
			if len(subProperties) > 0 {
				return subProperties
			}
		}
	}

	// If nothing found in subqueries, check any other properties that might contain nested ASTs
	for _, obj := range ast.Obj {
		if subAST, ok := obj.(*eval.EvalAST); ok {
			subProperties := findGroupByProperties(subAST)
			if len(subProperties) > 0 {
				return subProperties
			}
		}
	}

	// Return empty slice if nothing found
	return []interface{}{}
}

// handleCreateQuery processes query creation with macro expansion and time range handling
func (ds *ClickHouseDatasource) handleCreateQuery(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	var request CreateQueryRequest
	if err := json.Unmarshal(req.Body, &request); err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   []byte(fmt.Sprintf(`{"error": "Invalid request: %v"}`, err)),
		})
	}

	// Parse time range
	from, err := time.Parse(time.RFC3339, request.TimeRange.From)
	if err != nil {
		response := CreateQueryResponse{Error: "Invalid `$from` time"}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   body,
		})
	}

	to, err := time.Parse(time.RFC3339, request.TimeRange.To)
	if err != nil {
		response := CreateQueryResponse{Error: "Invalid `$to` time"}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   body,
		})
	}

	// Create eval.EvalQuery
	evalQ := eval.EvalQuery{
		RefId:                  request.RefId,
		RuleUid:                request.RuleUid,
		RawQuery:               request.RawQuery,
		Query:                  request.Query,
		DateTimeCol:            request.DateTimeColDataType,
		DateCol:                request.DateColDataType,
		DateTimeType:           request.DateTimeType,
		Extrapolate:            request.Extrapolate,
		SkipComments:           request.SkipComments,
		AddMetadata:            request.AddMetadata,
		Format:                 request.Format,
		Round:                  request.Round,
		IntervalFactor:         request.IntervalFactor,
		Interval:               request.Interval,
		Database:               request.Database,
		Table:                  request.Table,
		MaxDataPoints:          request.MaxDataPoints,
		From:                   from,
		To:                     to,
		FrontendDatasource:     request.FrontendDatasource,
		UseWindowFuncForMacros: request.UseWindowFuncForMacros,
	}

	// Apply macros and get AST
	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		response := CreateQueryResponse{Error: fmt.Sprintf("Failed to apply macros: %v", err)}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   body,
		})
	}

	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	if err != nil {
		response := CreateQueryResponse{Error: fmt.Sprintf("Failed to parse query: %v", err)}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   body,
		})
	}

	// Use the recursive function to find GROUP BY properties at any level
	properties := findGroupByProperties(ast)

	// Return the result
	response := CreateQueryResponse{
		SQL:  sql,
		Keys: properties,
	}
	body, _ := json.Marshal(response)
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusOK,
		Headers: map[string][]string{
			"Content-Type": {"application/json"},
		},
		Body: body,
	})
}

// handleApplyAdhocFilters processes adhoc filters by parsing SQL queries and applying filter conditions
func (ds *ClickHouseDatasource) handleApplyAdhocFilters(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	var request ApplyAdhocFiltersRequest
	if err := json.Unmarshal(req.Body, &request); err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   []byte(fmt.Sprintf(`{"error": "Invalid request: %v"}`, err)),
		})
	}

	query := request.Query
	adhocFilters := request.AdhocFilters
	target := request.Target

	// Process the query
	adhocConditions := make([]string, 0)
	scanner := eval.NewScanner(query)
	ast, err := scanner.ToAST()
	topQueryAst := ast
	if err != nil {
		response := ApplyAdhocFiltersResponse{Error: fmt.Sprintf("Failed to parse query: %v", err)}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   body,
		})
	}

	if len(adhocFilters) > 0 {
		// Navigate to the deepest FROM clause
		for ast.HasOwnProperty("from") && ast.Obj["from"].(*eval.EvalAST).Arr == nil {
			nextAst, ok := ast.Obj["from"].(*eval.EvalAST)
			if !ok {
				break
			}
			ast = nextAst
		}

		// Initialize WHERE clause if it doesn't exist
		if !ast.HasOwnProperty("where") {
			ast.Obj["where"] = &eval.EvalAST{
				Obj: make(map[string]interface{}),
				Arr: make([]interface{}, 0),
			}
		}

		// Get target database and table
		targetDatabase, targetTable := parseTargets(ast.Obj["from"].(*eval.EvalAST).Arr[0].(string), target.Database, target.Table)
		if targetDatabase == "" && targetTable == "" {
			response := ApplyAdhocFiltersResponse{Error: "FROM expression can't be parsed"}
			body, _ := json.Marshal(response)
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusInternalServerError,
				Body:   body,
			})
		}

		// Process each adhoc filter
		for _, filter := range adhocFilters {
			var parts []string
			if strings.Contains(filter.Key, ".") {
				parts = strings.Split(filter.Key, ".")
			} else {
				parts = []string{targetDatabase, targetTable, filter.Key}
			}

			// Add missing parts
			if len(parts) == 1 {
				parts = append([]string{targetTable}, parts...)
			}
			if len(parts) == 2 {
				parts = append([]string{targetTable}, parts...)
			}
			if len(parts) < 3 {
				continue
			}

			if targetDatabase != parts[0] || targetTable != parts[1] {
				continue
			}

			// Convert operator
			operator := filter.Operator
			switch operator {
			case "=~":
				operator = "LIKE"
			case "!~":
				operator = "NOT LIKE"
			}

			// Format value with consistent quoting
			var value string
			switch v := filter.Value.(type) {
			case float64:
				value = fmt.Sprintf("%g", v)
			case string:
				// Don't quote if it's already a number or contains special SQL syntax
				if regexp.MustCompile(`^\s*\d+(\.\d+)?\s*$`).MatchString(v) ||
					strings.Contains(v, "'") ||
					strings.Contains(v, ", ") {
					value = v
				} else {
					// Escape single quotes in string values
					escaped := strings.ReplaceAll(v, "'", "''")
					value = fmt.Sprintf("'%s'", escaped)
				}
			default:
				// For any other type, convert to string and escape quotes
				str := fmt.Sprintf("%v", v)
				escaped := strings.ReplaceAll(str, "'", "''")
				value = fmt.Sprintf("'%s'", escaped)
			}

			// Build the condition with proper spacing
			condition := fmt.Sprintf("%s %s %s", parts[2], operator, value)
			adhocConditions = append(adhocConditions, condition)
		}

		// Handle conditions differently based on $adhoc presence
		if !strings.Contains(query, "$adhoc") {
			// If no $adhoc, modify WHERE clause through AST
			whereAst := ast.Obj["where"].(*eval.EvalAST)
			if len(adhocConditions) > 0 {
				combinedCondition := strings.Join(adhocConditions, " AND ")
				if len(whereAst.Arr) > 0 {
					// If WHERE has existing conditions, add with AND
					whereAst.Arr = append(whereAst.Arr, "AND", fmt.Sprintf("(%s)", combinedCondition))
				} else {
					// If WHERE is empty, add without AND
					whereAst.Arr = append(whereAst.Arr, combinedCondition)
				}
			}
			query = eval.PrintAST(topQueryAst, " ")
		}
	}

	// Always handle $adhoc replacement, even for empty filters
	if strings.Contains(query, "$adhoc") {
		renderedCondition := "1"
		if len(adhocConditions) > 0 {
			renderedCondition = fmt.Sprintf("(%s)", strings.Join(adhocConditions, " AND "))
		}
		query = strings.ReplaceAll(query, "$adhoc", renderedCondition)
	}

	// Return the result
	response := ApplyAdhocFiltersResponse{Query: query}
	body, _ := json.Marshal(response)
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusOK,
		Headers: map[string][]string{
			"Content-Type": {"application/json"},
		},
		Body: body,
	})
}

// handleReplaceTimeFilters replaces time-related macros in queries
func (ds *ClickHouseDatasource) handleReplaceTimeFilters(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	var request ReplaceTimeFiltersRequest
	if err := json.Unmarshal(req.Body, &request); err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   []byte(fmt.Sprintf(`{"error": "Invalid request: %v"}`, err)),
		})
	}

	// Parse time range
	from, err := time.Parse(time.RFC3339, request.TimeRange.From)
	if err != nil {
		response := ReplaceTimeFiltersResponse{Error: "Invalid from time"}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   body,
		})
	}

	to, err := time.Parse(time.RFC3339, request.TimeRange.To)
	if err != nil {
		response := ReplaceTimeFiltersResponse{Error: "Invalid to time"}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   body,
		})
	}

	// Create eval.EvalQuery
	evalQ := eval.EvalQuery{
		Query:        request.Query,
		From:         from,
		To:           to,
		DateTimeType: request.DateTimeType,
	}

	// Replace time filters
	sql := evalQ.ReplaceTimeFilters(evalQ.Query, 0)

	// Return the result
	response := ReplaceTimeFiltersResponse{SQL: sql}
	body, _ := json.Marshal(response)
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusOK,
		Headers: map[string][]string{
			"Content-Type": {"application/json"},
		},
		Body: body,
	})
}

// handleGetAstProperty extracts properties from SQL AST (like GROUP BY clauses)
func (ds *ClickHouseDatasource) handleGetAstProperty(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	var request GetAstPropertyRequest
	if err := json.Unmarshal(req.Body, &request); err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   []byte(fmt.Sprintf(`{"error": "Invalid request: %v"}`, err)),
		})
	}

	// Create scanner and parse AST
	scanner := eval.NewScanner(request.Query)
	ast, err := scanner.ToAST()
	if err != nil {
		response := GetAstPropertyResponse{Error: fmt.Sprintf("Failed to parse query: %v", err)}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   body,
		})
	}

	// Use the recursive function if we're looking for group by
	if request.PropertyName == "group by" {
		properties := findGroupByProperties(ast)
		response := GetAstPropertyResponse{Properties: properties}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusOK,
			Headers: map[string][]string{
				"Content-Type": {"application/json"},
			},
			Body: body,
		})
	}

	// Standard extraction for other properties
	var properties []interface{}
	if prop, exists := ast.Obj[request.PropertyName]; exists {
		switch v := prop.(type) {
		case *eval.EvalAST:
			// If the property is an AST object, add all items from its array
			properties = make([]interface{}, len(v.Arr))
			copy(properties, v.Arr)
		case []interface{}:
			// If the property is already a slice, use it directly
			properties = v
		case map[string]interface{}:
			// If the property is an object, add it as a single item
			properties = []interface{}{v}
		default:
			// For any other type, add it as a single item
			properties = []interface{}{v}
		}
	}

	// Return the result
	response := GetAstPropertyResponse{Properties: properties}
	body, _ := json.Marshal(response)
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusOK,
		Headers: map[string][]string{
			"Content-Type": {"application/json"},
		},
		Body: body,
	})
}