package main

import (
	"fmt"
	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"regexp"
	"strings"
	"syscall/js"
	"time"
)

type AdhocFilter struct {
	Key      string      `json:"key"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

type Target struct {
	Database string
	Table    string
}

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
		panic(fmt.Sprintf("FROM expression \"%s\" can't be parsed", from))
	}

	if targetTable == "$table" {
		targetTable = defaultTable
	}

	return targetDatabase, targetTable
}

// applyAdhocFiltersWasm is the WebAssembly-compatible function that processes adhoc filters
func applyAdhocFiltersWasm(this js.Value, args []js.Value) interface{} {
	jsObj := args[0]
	query := jsObj.Get("query").String()
	adhocFiltersJS := jsObj.Get("adhocFilters")
	targetJS := jsObj.Get("target")

	adhocFilters := make([]AdhocFilter, adhocFiltersJS.Length())
	for i := 0; i < adhocFiltersJS.Length(); i++ {
		filter := adhocFiltersJS.Index(i)
		adhocFilters[i] = AdhocFilter{
			Key:      filter.Get("key").String(),
			Operator: filter.Get("operator").String(),
			Value:    filter.Get("value").String(),
		}
	}

	// Extract target
	target := Target{
		Database: targetJS.Get("database").String(),
		Table:    targetJS.Get("table").String(),
	}

	// Process the query
	adhocConditions := make([]string, 0)
	scanner := eval.NewScanner(query)
	ast, err := scanner.ToAST()
	topQueryAst := ast
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to parse query: %v", err),
		}
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

			// Add the condition to WHERE clause if not using $adhoc macro
			if !strings.Contains(query, "$adhoc") {
				if len(ast.Obj["where"].(*eval.EvalAST).Arr) > 0 {
					condition = "AND " + condition
				}
				ast.Obj["where"].(*eval.EvalAST).Arr = append(ast.Obj["where"].(*eval.EvalAST).Arr, condition)
			}
		}

		query = eval.PrintAST(topQueryAst, " ")
	}

	// Replace $adhoc macro
	renderedCondition := "1"
	if len(adhocConditions) > 0 {
		renderedCondition = fmt.Sprintf("(%s)", strings.Join(adhocConditions, " AND "))
	}

	query = strings.ReplaceAll(query, "$adhoc", renderedCondition)

	// Return the result
	return map[string]interface{}{
		"query": query,
	}
}

// QueryRequest represents the structure of the query request
type QueryRequest struct {
	RefId              string
	RuleUid            string
	RawQuery           bool
	Query              string
	DateTimeCol        string
	DateCol            string
	DateTimeType       string
	Extrapolate        bool
	SkipComments       bool
	AddMetadata        bool
	Format             string
	Round              string
	IntervalFactor     int
	Interval           string
	Database           string
	Table              string
	MaxDataPoints      int64
	FrontendDatasource bool
	TimeRange          struct {
		From string
		To   string
	}
}

// createQueryWasm is the WebAssembly-compatible function that processes query creation
func createQueryWasm(this js.Value, args []js.Value) interface{} {
	// Validate input arguments
	if len(args) != 1 {
		return map[string]interface{}{
			"error": "Invalid number of arguments. Expected query request object",
		}
	}

	// Extract request data from JavaScript object
	jsObj := args[0]
	reqData := QueryRequest{
		RefId:              jsObj.Get("refId").String(),
		RuleUid:            jsObj.Get("ruleUid").String(),
		RawQuery:           jsObj.Get("rawQuery").Bool(),
		Query:              jsObj.Get("query").String(),
		DateTimeCol:        jsObj.Get("dateTimeColDataType").String(),
		DateCol:            jsObj.Get("dateColDataType").String(),
		DateTimeType:       jsObj.Get("dateTimeType").String(),
		Extrapolate:        jsObj.Get("extrapolate").Bool(),
		SkipComments:       jsObj.Get("skip_comments").Bool(),
		AddMetadata:        jsObj.Get("add_metadata").Bool(),
		Format:             jsObj.Get("format").String(),
		Round:              jsObj.Get("round").String(),
		IntervalFactor:     jsObj.Get("intervalFactor").Int(),
		Interval:           jsObj.Get("interval").String(),
		Database:           jsObj.Get("database").String(),
		Table:              jsObj.Get("table").String(),
		MaxDataPoints:      int64(jsObj.Get("maxDataPoints").Int()),
		FrontendDatasource: jsObj.Get("frontendDatasource").Bool(),
	}

	// Extract time range
	timeRange := jsObj.Get("timeRange")
	reqData.TimeRange.From = timeRange.Get("from").String()
	reqData.TimeRange.To = timeRange.Get("to").String()

	// Parse time range
	from, err := time.Parse(time.RFC3339, reqData.TimeRange.From)
	if err != nil {
		return map[string]interface{}{
			"error": "Invalid from time",
		}
	}

	to, err := time.Parse(time.RFC3339, reqData.TimeRange.To)
	if err != nil {
		return map[string]interface{}{
			"error": "Invalid to time",
		}
	}

	// Create eval.EvalQuery
	evalQ := eval.EvalQuery{
		RefId:              reqData.RefId,
		RuleUid:            reqData.RuleUid,
		RawQuery:           reqData.RawQuery,
		Query:              reqData.Query,
		DateTimeCol:        reqData.DateTimeCol,
		DateCol:            reqData.DateCol,
		DateTimeType:       reqData.DateTimeType,
		Extrapolate:        reqData.Extrapolate,
		SkipComments:       reqData.SkipComments,
		AddMetadata:        reqData.AddMetadata,
		Format:             reqData.Format,
		Round:              reqData.Round,
		IntervalFactor:     reqData.IntervalFactor,
		Interval:           reqData.Interval,
		Database:           reqData.Database,
		Table:              reqData.Table,
		MaxDataPoints:      reqData.MaxDataPoints,
		From:               from,
		To:                 to,
		FrontendDatasource: reqData.FrontendDatasource,
	}

	// Apply macros and get AST
	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to apply macros: %v", err),
		}
	}

	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to parse query: %v", err),
		}
	}

	// Extract properties from AST
	var properties []interface{}
	if prop, exists := ast.Obj["group by"]; exists {
		switch v := prop.(type) {
		case *eval.EvalAST:
			// If the property is an AST object, add all items from its array
			properties = make([]interface{}, len(v.Arr))
			copy(properties, v.Arr)
		case []interface{}:
			// If the property is already a slice, use it directly
			properties = v
		default:
			// For any other type, add it as a single item
			properties = []interface{}{v}
		}
	}

	// Return the result
	return map[string]interface{}{
		"sql":  sql,
		"keys": properties,
	}
}

// replaceTimeFiltersWasm is the WebAssembly-compatible function that processes time filter replacements
func replaceTimeFiltersWasm(this js.Value, args []js.Value) interface{} {
	jsObj := args[0]
	reqData := QueryRequest{
		Query:        jsObj.Get("query").String(),
		DateTimeType: jsObj.Get("dateTimeType").String(),
	}

	// Extract time range
	timeRange := jsObj.Get("timeRange")
	reqData.TimeRange.From = timeRange.Get("from").String()
	reqData.TimeRange.To = timeRange.Get("to").String()

	// Extract query
	query := reqData.Query
	dateTimeType := reqData.DateTimeType
	fromStr := reqData.TimeRange.From
	toStr := reqData.TimeRange.To
	// Parse time range
	from, err := time.Parse(time.RFC3339, fromStr)
	if err != nil {
		return map[string]interface{}{
			"error": "Invalid from time",
			"data":  from,
		}
	}

	to, err := time.Parse(time.RFC3339, toStr)
	if err != nil {
		return map[string]interface{}{
			"error": "Invalid to time",
			"data":  to,
		}
	}

	//// Create eval.EvalQuery
	evalQ := eval.EvalQuery{
		Query:        query,
		From:         from,
		To:           to,
		DateTimeType: dateTimeType,
	}

	// Replace time filters
	sql := evalQ.ReplaceTimeFilters(evalQ.Query, 0)

	// Return the result
	return map[string]interface{}{
		"sql": sql,
	}
}

// getAstPropertyWasm is the WebAssembly-compatible function that processes AST property requests
func getAstPropertyWasm(this js.Value, args []js.Value) interface{} {
	// Validate input arguments
	if len(args) != 2 {
		return map[string]interface{}{
			"error": "Invalid number of arguments. Expected query and propertyName",
		}
	}

	// Extract query and propertyName from arguments
	query := args[0].String()
	propertyName := args[1].String()

	// Create scanner and parse AST
	scanner := eval.NewScanner(query)
	ast, err := scanner.ToAST()
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to parse query: %v", err),
		}
	}

	// Extract properties from the AST
	var properties []interface{}
	if prop, exists := ast.Obj[propertyName]; exists {
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
	return map[string]interface{}{
		"properties": properties,
	}
}

func main() {
	// Create a channel to keep the program running
	c := make(chan struct{}, 0)

	// Register all functions in the JavaScript global scope
	js.Global().Set("applyAdhocFilters", js.FuncOf(applyAdhocFiltersWasm))
	js.Global().Set("createQuery", js.FuncOf(createQueryWasm))
	js.Global().Set("replaceTimeFilters", js.FuncOf(replaceTimeFiltersWasm))
	js.Global().Set("getAstProperty", js.FuncOf(getAstPropertyWasm))

	// Wait indefinitely
	<-c
}
