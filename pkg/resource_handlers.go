package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/altinity/clickhouse-grafana/pkg/adhoc"
	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/altinity/clickhouse-grafana/pkg/requests"
	"github.com/altinity/clickhouse-grafana/pkg/timeutils"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// Request/Response structures for resource handlers


type Target struct {
	Database string `json:"database"`
	Table    string `json:"table"`
}

type ApplyAdhocFiltersRequest struct {
	Query        string               `json:"query"`
	AdhocFilters []adhoc.AdhocFilter `json:"adhocFilters"`
	Target       Target               `json:"target"`
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

// Batched request/response structures for optimization
type ProcessQueryBatchRequest struct {
	// Query creation fields
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

	// Adhoc filter fields
	AdhocFilters []adhoc.AdhocFilter `json:"adhocFilters"`
	Target       Target        `json:"target"`

	// Properties to extract
	ExtractProperties []string `json:"extractProperties"`
}

type ProcessQueryBatchResponse struct {
	SQL        string                   `json:"sql"`
	Keys       []interface{}            `json:"keys"`
	Properties map[string][]interface{} `json:"properties"`
	Error      string                   `json:"error,omitempty"`
}

type GetMultipleAstPropertiesRequest struct {
	Query      string   `json:"query"`
	Properties []string `json:"properties"`
}

type GetMultipleAstPropertiesResponse struct {
	Properties map[string][]interface{} `json:"properties"`
	Error      string                   `json:"error,omitempty"`
}

// Safer batched request/response for createQuery + applyAdhocFilters only
type CreateQueryWithAdhocRequest struct {
	// Query creation fields
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

	// Adhoc filter fields
	AdhocFilters []adhoc.AdhocFilter `json:"adhocFilters"`
	Target       Target        `json:"target"`
}

type CreateQueryWithAdhocResponse struct {
	SQL   string `json:"sql"`
	Error string `json:"error,omitempty"`
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
	request, ok := requests.UnmarshalRequest[CreateQueryRequest](req, sender)
	if !ok {
		return nil
	}

	// Parse time range using helper function
	hasAdhocMacro := strings.Contains(request.Query, "$adhoc")
	from, to, err := timeutils.ParseTimeRange(timeutils.TimeRangeStruct(request.TimeRange))
	if err != nil {
		return sendUniversalErrorResponse(sender, ErrorContext{
			ErrorType:     ErrorTypeTimeRange,
			OriginalSQL:   request.Query,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: fmt.Errorf("Invalid time range: %v", err),
			Handler:       "handleCreateQuery",
		}, http.StatusBadRequest)
	}

	// Create eval.EvalQuery
	evalQ := eval.NewEvalQuery(request, from, to)

	// Apply macros and get AST
	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		return sendUniversalErrorResponse(sender, ErrorContext{
			ErrorType:     ErrorTypeMacroExpansion,
			OriginalSQL:   request.Query,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: fmt.Errorf("Failed to apply macros: %v", err),
			Handler:       "handleCreateQuery",
		}, http.StatusInternalServerError)
	}

	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	if err != nil {
		return sendUniversalErrorResponse(sender, ErrorContext{
			ErrorType:     ErrorTypeQueryParsing,
			OriginalSQL:   request.Query,
			ProcessedSQL:  sql,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: err,
			Handler:       "handleCreateQuery",
		}, http.StatusInternalServerError)
	}

	// Use the recursive function to find GROUP BY properties at any level
	properties := findGroupByProperties(ast)

	// Return the result using utility function
	return requests.SendSuccessResponse(sender, CreateQueryResponse{
		SQL:  sql,
		Keys: properties,
	})
}

// handleApplyAdhocFilters processes adhoc filters by parsing SQL queries and applying filter conditions
func (ds *ClickHouseDatasource) handleApplyAdhocFilters(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	request, ok := requests.UnmarshalRequest[ApplyAdhocFiltersRequest](req, sender)
	if !ok {
		return nil
	}

	query := request.Query
	adhocFilters := request.AdhocFilters
	target := request.Target

	// Process the query
	hasAdhocMacro := strings.Contains(query, "$adhoc")
	adhocConditions := make([]string, 0)
	scanner := eval.NewScanner(query)
	ast, err := scanner.ToAST()
	topQueryAst := ast
	if err != nil {
		return sendUniversalErrorResponse(sender, ErrorContext{
			ErrorType:     ErrorTypeQueryParsing,
			OriginalSQL:   query,
			HasAdhocMacro: hasAdhocMacro,
			AdhocFilters:  []interface{}{adhocFilters},
			OriginalError: err,
			Handler:       "handleApplyAdhocFilters",
		}, http.StatusInternalServerError)
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
			return sendUniversalErrorResponse(sender, ErrorContext{
				ErrorType:     ErrorTypeFromClause,
				OriginalSQL:   query,
				HasAdhocMacro: hasAdhocMacro,
				AdhocFilters:  []interface{}{adhocFilters},
				OriginalError: fmt.Errorf("FROM expression can't be parsed - unable to determine target database and table"),
				Handler:       "handleApplyAdhocFilters",
			}, http.StatusInternalServerError)
		}

		// Process adhoc filters using shared utility function
		adhocConditions = adhoc.ProcessAdhocFilters(adhocFilters, targetDatabase, targetTable)

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

	// Return the result using utility function
	return requests.SendSuccessResponse(sender, ApplyAdhocFiltersResponse{Query: query})
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
	request, ok := requests.UnmarshalRequest[GetAstPropertyRequest](req, sender)
	if !ok {
		return nil
	}

	// Create scanner and parse AST
	hasAdhocMacro := strings.Contains(request.Query, "$adhoc")
	scanner := eval.NewScanner(request.Query)
	ast, err := scanner.ToAST()
	if err != nil {
		return sendUniversalErrorResponse(sender, ErrorContext{
			ErrorType:     ErrorTypeAstExtraction,
			OriginalSQL:   request.Query,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: err,
			Handler:       "handleGetAstProperty",
		}, http.StatusInternalServerError)
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

	// Return the result using utility function
	return requests.SendSuccessResponse(sender, GetAstPropertyResponse{Properties: properties})
}

// handleProcessQueryBatch combines createQuery + applyAdhocFilters + property extraction for optimal performance
func (ds *ClickHouseDatasource) handleProcessQueryBatch(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	var request ProcessQueryBatchRequest
	if err := json.Unmarshal(req.Body, &request); err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   []byte(fmt.Sprintf(`{"error": "Invalid request: %v"}`, err)),
		})
	}

	// Step 1: Create Query (same as handleCreateQuery)
	// Parse time range
	from, err := time.Parse(time.RFC3339, request.TimeRange.From)
	if err != nil {
		response := ProcessQueryBatchResponse{Error: "Invalid `$from` time"}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   body,
		})
	}

	to, err := time.Parse(time.RFC3339, request.TimeRange.To)
	if err != nil {
		response := ProcessQueryBatchResponse{Error: "Invalid `$to` time"}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   body,
		})
	}

	// Create eval.EvalQuery
	evalQ := eval.NewEvalQuery(request, from, to)

	// Apply macros and get AST
	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		response := ProcessQueryBatchResponse{Error: fmt.Sprintf("Failed to apply macros: %v", err)}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   body,
		})
	}

	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	if err != nil {
		response := ProcessQueryBatchResponse{Error: fmt.Sprintf("Failed to parse query: %v", err)}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   body,
		})
	}

	// Step 2: Apply Adhoc Filters (same as handleApplyAdhocFilters)
	adhocFilters := request.AdhocFilters
	target := request.Target
	topQueryAst := ast // Store reference to original AST before navigation

	if len(adhocFilters) > 0 {
		adhocConditions := make([]string, 0)

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
			response := ProcessQueryBatchResponse{Error: "FROM expression can't be parsed"}
			body, _ := json.Marshal(response)
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusInternalServerError,
				Body:   body,
			})
		}

		// Process adhoc filters using shared utility function
		adhocConditions = adhoc.ProcessAdhocFilters(adhocFilters, targetDatabase, targetTable)

		// Handle conditions differently based on $adhoc presence
		if !strings.Contains(sql, "$adhoc") {
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
			sql = eval.PrintAST(topQueryAst, " ")
		} else {
			// Always handle $adhoc replacement, even for empty filters
			renderedCondition := "1"
			if len(adhocConditions) > 0 {
				renderedCondition = fmt.Sprintf("(%s)", strings.Join(adhocConditions, " AND "))
			}
			sql = strings.ReplaceAll(sql, "$adhoc", renderedCondition)
		}
	}

	// Step 3: Extract Properties (combined approach)
	properties := make(map[string][]interface{})

	// Always extract group by for backward compatibility (keys field)
	groupByProperties := findGroupByProperties(topQueryAst)
	properties["group by"] = groupByProperties

	// Extract additional requested properties
	for _, propName := range request.ExtractProperties {
		if propName == "group by" {
			continue // Already handled above
		}

		if propName == "select" || propName == "where" {
			// Re-parse the final SQL for these properties since they might have been modified
			finalScanner := eval.NewScanner(sql)
			finalAst, err := finalScanner.ToAST()
			if err == nil {
				if prop, exists := finalAst.Obj[propName]; exists {
					switch v := prop.(type) {
					case *eval.EvalAST:
						propList := make([]interface{}, len(v.Arr))
						copy(propList, v.Arr)
						properties[propName] = propList
					case []interface{}:
						properties[propName] = v
					default:
						properties[propName] = []interface{}{v}
					}
				} else {
					properties[propName] = []interface{}{}
				}
			}
		} else {
			// For other properties, use the original AST
			if prop, exists := ast.Obj[propName]; exists {
				switch v := prop.(type) {
				case *eval.EvalAST:
					propList := make([]interface{}, len(v.Arr))
					copy(propList, v.Arr)
					properties[propName] = propList
				case []interface{}:
					properties[propName] = v
				default:
					properties[propName] = []interface{}{v}
				}
			} else {
				properties[propName] = []interface{}{}
			}
		}
	}

	// Return the batched result
	response := ProcessQueryBatchResponse{
		SQL:        sql,
		Keys:       groupByProperties, // Maintain backward compatibility
		Properties: properties,
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

// handleGetMultipleAstProperties extracts multiple AST properties in one call for efficiency
func (ds *ClickHouseDatasource) handleGetMultipleAstProperties(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	request, ok := requests.UnmarshalRequest[GetMultipleAstPropertiesRequest](req, sender)
	if !ok {
		return nil
	}

	// Create scanner and parse AST
	scanner := eval.NewScanner(request.Query)
	ast, err := scanner.ToAST()
	if err != nil {
		response := GetMultipleAstPropertiesResponse{Error: fmt.Sprintf("Failed to parse query: %v", err)}
		body, _ := json.Marshal(response)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   body,
		})
	}

	// Extract all requested properties
	properties := make(map[string][]interface{})

	for _, propName := range request.Properties {
		if propName == "group by" {
			// Use the recursive function for group by
			properties[propName] = findGroupByProperties(ast)
		} else {
			// Standard extraction for other properties
			if prop, exists := ast.Obj[propName]; exists {
				switch v := prop.(type) {
				case *eval.EvalAST:
					propList := make([]interface{}, len(v.Arr))
					copy(propList, v.Arr)
					properties[propName] = propList
				case []interface{}:
					properties[propName] = v
				case map[string]interface{}:
					properties[propName] = []interface{}{v}
				default:
					properties[propName] = []interface{}{v}
				}
			} else {
				properties[propName] = []interface{}{}
			}
		}
	}

	// Return the result
	return requests.SendSuccessResponse(sender, GetMultipleAstPropertiesResponse{Properties: properties})
}

// ErrorType represents different categories of errors
type ErrorType string

const (
	ErrorTypeTimeRange      ErrorType = "TIME_RANGE"
	ErrorTypeMacroExpansion ErrorType = "MACRO_EXPANSION"
	ErrorTypeQueryParsing   ErrorType = "QUERY_PARSING"
	ErrorTypeFromClause     ErrorType = "FROM_CLAUSE"
	ErrorTypeAdhocFilters   ErrorType = "ADHOC_FILTERS"
	ErrorTypeAstExtraction  ErrorType = "AST_EXTRACTION"
	ErrorTypeGeneral        ErrorType = "GENERAL"
)

// ErrorContext contains information about the error context
type ErrorContext struct {
	ErrorType     ErrorType
	OriginalSQL   string
	ProcessedSQL  string
	HasAdhocMacro bool
	AdhocFilters  []interface{}
	OriginalError error
	Handler       string
}

// createUniversalErrorResponse creates a comprehensive error response with fallback macro replacement
func createUniversalErrorResponse(ctx ErrorContext) (map[string]interface{}, string) {
	// First, handle macro replacement if needed
	processedSQL := ctx.ProcessedSQL
	if processedSQL == "" {
		processedSQL = ctx.OriginalSQL
	}

	// Always replace $adhoc with fallback if present and not already handled
	if ctx.HasAdhocMacro && strings.Contains(processedSQL, "$adhoc") {
		processedSQL = strings.ReplaceAll(processedSQL, "$adhoc", "1")
		backend.Logger.Warn("Universal error handler replaced $adhoc with '1' as fallback",
			"handler", ctx.Handler,
			"error_type", string(ctx.ErrorType),
			"original_error", ctx.OriginalError)
	}

	// Generate appropriate error message based on context
	var errorMsg string
	var shouldReturnSQL bool

	switch ctx.ErrorType {
	case ErrorTypeTimeRange:
		errorMsg = fmt.Sprintf("Time range processing failed: %v. Please check your time range configuration.", ctx.OriginalError)

	case ErrorTypeMacroExpansion:
		unreplacedMacros := findUnreplacedMacros(processedSQL)
		if len(unreplacedMacros) > 0 {
			errorMsg = fmt.Sprintf("Macro expansion failed: %v. Found unreplaced macros: %s. Verify your query syntax and macro usage.",
				ctx.OriginalError, strings.Join(unreplacedMacros, ", "))
		} else {
			errorMsg = fmt.Sprintf("Macro expansion failed: %v. Please check your macro syntax.", ctx.OriginalError)
		}

	case ErrorTypeQueryParsing:
		if ctx.HasAdhocMacro {
			shouldReturnSQL = true
			errorMsg = fmt.Sprintf("Query parsing failed for adhoc filter processing: %v. "+
				"The $adhoc macro has been replaced with '1' as a fallback. "+
				"To use adhoc filters, ensure your query has a simple structure with a clear FROM clause. "+
				"Complex queries (subqueries, CTEs, multiple JOINs) may not be supported for adhoc filtering.", ctx.OriginalError)
		} else {
			unreplacedMacros := findUnreplacedMacros(processedSQL)
			if len(unreplacedMacros) > 0 {
				errorMsg = fmt.Sprintf("Query parsing failed: %v. Found unreplaced macros: %s. "+
					"Check your query syntax and ensure all macros are properly formatted.",
					ctx.OriginalError, strings.Join(unreplacedMacros, ", "))
			} else {
				errorMsg = fmt.Sprintf("Query parsing failed: %v. Please check your SQL syntax.", ctx.OriginalError)
			}
		}

	case ErrorTypeFromClause:
		if ctx.HasAdhocMacro {
			shouldReturnSQL = true
			errorMsg = fmt.Sprintf("Cannot determine target table from FROM clause: %v. "+
				"The $adhoc macro has been replaced with '1' as a fallback. "+
				"Complex FROM clauses (subqueries, CTEs, multiple JOINs) are not supported for adhoc filters. "+
				"Consider simplifying your query or using a direct table reference.", ctx.OriginalError)
		} else {
			errorMsg = fmt.Sprintf("FROM clause parsing failed: %v. "+
				"Ensure your FROM clause uses a simple table reference.", ctx.OriginalError)
		}

	case ErrorTypeAdhocFilters:
		errorMsg = fmt.Sprintf("Adhoc filter processing failed: %v. "+
			"Check your adhoc filter configuration and ensure they match your query's table structure.", ctx.OriginalError)

	case ErrorTypeAstExtraction:
		errorMsg = fmt.Sprintf("AST property extraction failed: %v. "+
			"This may indicate a complex query structure that cannot be analyzed automatically.", ctx.OriginalError)

	default: // ErrorTypeGeneral
		unreplacedMacros := findUnreplacedMacros(processedSQL)
		if len(unreplacedMacros) > 0 {
			errorMsg = fmt.Sprintf("%v [Warning: Query contains unreplaced macros: %s]",
				ctx.OriginalError, strings.Join(unreplacedMacros, ", "))
		} else {
			errorMsg = ctx.OriginalError.Error()
		}
	}

	// Build response
	response := map[string]interface{}{
		"error": errorMsg,
	}

	// Include processed SQL if it should be returned (for cases with fallback replacements)
	if shouldReturnSQL && processedSQL != ctx.OriginalSQL {
		response["sql"] = processedSQL
	}

	return response, processedSQL
}

// findUnreplacedMacros identifies unreplaced macros in SQL
func findUnreplacedMacros(sql string) []string {
	macroChecks := map[string]string{
		"$adhoc":      "ad-hoc filter replacement failed",
		"$timeFilter": "time filter macro not replaced",
		"$timeSeries": "time series macro not replaced",
		"$table":      "table macro not replaced",
		"$from":       "from time macro not replaced",
		"$to":         "to time macro not replaced",
		"$interval":   "interval macro not replaced",
		"$rate":       "rate macro not replaced",
		"$columns":    "columns macro not replaced",
	}

	var unreplacedMacros []string
	for macro, description := range macroChecks {
		if strings.Contains(sql, macro) {
			unreplacedMacros = append(unreplacedMacros, fmt.Sprintf("%s (%s)", macro, description))
		}
	}
	return unreplacedMacros
}

// sendUniversalErrorResponse sends a standardized error response
func sendUniversalErrorResponse(sender backend.CallResourceResponseSender, ctx ErrorContext, httpStatus int) error {
	response, _ := createUniversalErrorResponse(ctx)
	body, _ := json.Marshal(response)

	return sender.Send(&backend.CallResourceResponse{
		Status: httpStatus,
		Headers: map[string][]string{
			"Content-Type": {"application/json"},
		},
		Body: body,
	})
}


// handleCreateQueryWithAdhoc safely batches createQuery + applyAdhocFilters without property extraction
func (ds *ClickHouseDatasource) handleCreateQueryWithAdhoc(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	var request CreateQueryWithAdhocRequest
	if err := json.Unmarshal(req.Body, &request); err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   []byte(fmt.Sprintf(`{"error": "Invalid request: %v"}`, err)),
		})
	}

	// Step 1: Create Query (same as handleCreateQuery)
	// Parse time range
	from, err := time.Parse(time.RFC3339, request.TimeRange.From)
	if err != nil {
		return sendUniversalErrorResponse(sender, ErrorContext{
			ErrorType:     ErrorTypeTimeRange,
			OriginalSQL:   request.Query,
			OriginalError: fmt.Errorf("Invalid `$from` time: %v", err),
			Handler:       "handleCreateQueryWithAdhoc",
		}, http.StatusBadRequest)
	}

	to, err := time.Parse(time.RFC3339, request.TimeRange.To)
	if err != nil {
		return sendUniversalErrorResponse(sender, ErrorContext{
			ErrorType:     ErrorTypeTimeRange,
			OriginalSQL:   request.Query,
			OriginalError: fmt.Errorf("Invalid `$to` time: %v", err),
			Handler:       "handleCreateQueryWithAdhoc",
		}, http.StatusBadRequest)
	}

	// Create eval.EvalQuery
	evalQ := eval.NewEvalQuery(request, from, to)

	// Apply macros and get AST
	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	hasAdhocMacro := strings.Contains(sql, "$adhoc")
	if err != nil {
		return sendUniversalErrorResponse(sender, ErrorContext{
			ErrorType:     ErrorTypeMacroExpansion,
			OriginalSQL:   request.Query,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: fmt.Errorf("Failed to apply macros: %v", err),
			Handler:       "handleCreateQueryWithAdhoc",
		}, http.StatusInternalServerError)
	}

	// Step 2: Apply Adhoc Filters (same as handleApplyAdhocFilters)
	adhocFilters := request.AdhocFilters
	target := request.Target
	adhocConditions := make([]string, 0)

	// Check if query contains $adhoc upfront for better error handling
	var targetDatabase, targetTable string

	if len(adhocFilters) > 0 {
		scanner := eval.NewScanner(sql)
		ast, err := scanner.ToAST()
		topQueryAst := ast
		if err != nil {
			return sendUniversalErrorResponse(sender, ErrorContext{
				ErrorType:     ErrorTypeQueryParsing,
				OriginalSQL:   request.Query,
				ProcessedSQL:  sql,
				HasAdhocMacro: hasAdhocMacro,
				AdhocFilters:  []interface{}{adhocFilters},
				OriginalError: err,
				Handler:       "handleCreateQueryWithAdhoc",
			}, http.StatusInternalServerError)
		}

		// Navigate to the deepest FROM clause
		for ast.HasOwnProperty("from") {
			fromObj, ok := ast.Obj["from"].(*eval.EvalAST)
			if !ok || fromObj.Arr != nil {
				break
			}
			ast = fromObj
		}

		// Initialize WHERE clause if it doesn't exist
		if !ast.HasOwnProperty("where") {
			ast.Obj["where"] = &eval.EvalAST{
				Obj: make(map[string]interface{}),
				Arr: make([]interface{}, 0),
			}
		}

		// Get target database and table
		if fromObj, ok := ast.Obj["from"].(*eval.EvalAST); ok && len(fromObj.Arr) > 0 {
			if fromStr, ok := fromObj.Arr[0].(string); ok {
				targetDatabase, targetTable = parseTargets(fromStr, target.Database, target.Table)
			}
		}
		if targetDatabase == "" && targetTable == "" {
			return sendUniversalErrorResponse(sender, ErrorContext{
				ErrorType:     ErrorTypeFromClause,
				OriginalSQL:   request.Query,
				ProcessedSQL:  sql,
				HasAdhocMacro: hasAdhocMacro,
				AdhocFilters:  []interface{}{adhocFilters},
				OriginalError: fmt.Errorf("FROM expression can't be parsed - unable to determine target database and table"),
				Handler:       "handleCreateQueryWithAdhoc",
			}, http.StatusInternalServerError)
		}

		// Process adhoc filters using shared utility function
		adhocConditions = adhoc.ProcessAdhocFilters(adhocFilters, targetDatabase, targetTable)

		// Handle conditions differently based on $adhoc presence
		if !strings.Contains(sql, "$adhoc") {
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
			sql = eval.PrintAST(topQueryAst, " ")
		}
	}

	// Always handle $adhoc replacement, even for empty filters
	if strings.Contains(sql, "$adhoc") {
		renderedCondition := "1"
		if len(adhocConditions) > 0 {
			renderedCondition = fmt.Sprintf("(%s)", strings.Join(adhocConditions, " AND "))
			backend.Logger.Debug("$adhoc macro replaced with filter conditions",
				"conditions", renderedCondition,
				"filter_count", len(adhocConditions),
				"configured_filters", len(adhocFilters))
		} else if len(adhocFilters) > 0 {
			// We had adhoc filters configured but none matched the query table
			backend.Logger.Warn("$adhoc macro replaced with '1' - adhoc filters configured but none matched the query table",
				"configured_filter_count", len(adhocFilters),
				"target_database", targetDatabase,
				"target_table", targetTable,
				"original_query", request.Query)
		} else {
			// No adhoc filters configured at all
			backend.Logger.Debug("$adhoc macro replaced with '1' - no adhoc filters configured",
				"original_query", request.Query)
		}
		sql = strings.ReplaceAll(sql, "$adhoc", renderedCondition)
	}

	// Return the result (no property extraction)
	response := CreateQueryWithAdhocResponse{SQL: sql}
	body, _ := json.Marshal(response)
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusOK,
		Headers: map[string][]string{
			"Content-Type": {"application/json"},
		},
		Body: body,
	})
}
