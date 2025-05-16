package pkg

import (
	"fmt"
	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"regexp"
	"strings"
	"time"
)

// AdhocFilter represents a filter with a key, operator, and value
type AdhocFilter struct {
	Key      string      `json:"key"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

// Target represents a database and table target
type Target struct {
	Database string
	Table    string
}

// parseTargets extracts database and table names from the FROM clause
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

// ApplyAdhocFiltersResult represents the result of applying adhoc filters
type ApplyAdhocFiltersResult struct {
	Query string
	Error string
}

// ApplyAdhocFilters processes adhoc filters and returns the modified query
func ApplyAdhocFilters(query string, adhocFilters []AdhocFilter, target Target) ApplyAdhocFiltersResult {
	result := ApplyAdhocFiltersResult{
		Query: query,
	}

	// Process the query
	adhocConditions := make([]string, 0)
	scanner := eval.NewScanner(query)
	ast, err := scanner.ToAST()
	topQueryAst := ast
	if err != nil {
		result.Error = fmt.Sprintf("Failed to parse query: %v", err)
		return result
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
		}

		// Add conditions to WHERE clause
		if len(adhocConditions) > 0 {
			whereAst := ast.Obj["where"].(*eval.EvalAST)

			// If WHERE is empty, just add the conditions
			if len(whereAst.Arr) == 0 && len(whereAst.Obj) == 0 {
				whereAst.Arr = append(whereAst.Arr, strings.Join(adhocConditions, " AND "))
			} else {
				// Otherwise, add AND with conditions
				whereArr := whereAst.Arr
				updatedWhereArr := make([]interface{}, 0, len(whereArr)+2)
				updatedWhereArr = append(updatedWhereArr, "(")
				updatedWhereArr = append(updatedWhereArr, whereArr...)
				updatedWhereArr = append(updatedWhereArr, ")")
				updatedWhereArr = append(updatedWhereArr, "AND")
				updatedWhereArr = append(updatedWhereArr, "(")
				updatedWhereArr = append(updatedWhereArr, strings.Join(adhocConditions, " AND "))
				updatedWhereArr = append(updatedWhereArr, ")")
				whereAst.Arr = updatedWhereArr
			}
		}
	}

	// Generate modified SQL from AST
	newQuery := eval.AstToSQL(topQueryAst)
	result.Query = newQuery

	return result
}

// QueryRequest represents the structure of the query request
type QueryRequest struct {
	RefId                  string
	RuleUid                string
	RawQuery               bool
	Query                  string
	Format                 string
	DateTimeType           string
	DateTimeField          string
	DateColDataType        string
	Interval               string
	Database               string
	Table                  string
	MaxDataPoints          int64
	FrontendDatasource     bool
	UseWindowFuncForMacros bool
	TimeRange              struct {
		From string
		To   string
	}
}

// CreateQueryResult represents the result of a query creation operation
type CreateQueryResult struct {
	SQL   string
	Keys  []interface{}
	Error string
}

// findGroupByProperties recursively searches for GROUP BY clauses in the AST
func findGroupByProperties(ast *eval.EvalAST) []interface{} {
	// Initialize result
	properties := make([]interface{}, 0)

	// Check if this AST has a "group by" property
	if ast != nil && ast.HasOwnProperty("group by") {
		groupByAst, ok := ast.Obj["group by"].(*eval.EvalAST)
		if ok && groupByAst.Arr != nil {
			// Add all items from the group by array
			for _, item := range groupByAst.Arr {
				properties = append(properties, item)
			}
		} else if groupBy, ok := ast.Obj["group by"].([]interface{}); ok {
			// Directly add items from a group by array
			properties = append(properties, groupBy...)
		}
	}

	// Recursively check all object properties
	if ast != nil {
		for _, value := range ast.Obj {
			// Only process EvalAST objects
			if nestedAst, ok := value.(*eval.EvalAST); ok {
				// Find properties in the nested AST
				nestedProperties := findGroupByProperties(nestedAst)
				properties = append(properties, nestedProperties...)
			}
		}
	}

	return properties
}

// CreateQuery processes query creation
func CreateQuery(req QueryRequest) CreateQueryResult {
	result := CreateQueryResult{}

	// Extract query parameters
	query := req.Query
	dateTimeType := req.DateTimeType
	dateTimeField := req.DateTimeField
	dateColDataType := req.DateColDataType
	database := req.Database
	table := req.Table
	rawQuery := req.RawQuery
	format := req.Format
	interval := req.Interval
	
	// Parse time range
	from, err := time.Parse(time.RFC3339, req.TimeRange.From)
	if err != nil {
		result.Error = fmt.Sprintf("Invalid from time: %v", err)
		return result
	}

	to, err := time.Parse(time.RFC3339, req.TimeRange.To)
	if err != nil {
		result.Error = fmt.Sprintf("Invalid to time: %v", err)
		return result
	}

	// Create eval query
	evalQ := eval.EvalQuery{
		Query:                  query,
		DateTimeType:           dateTimeType,
		DateTimeField:          dateTimeField,
		DateColDataType:        dateColDataType,
		Database:               database,
		Table:                  table,
		Raw:                    rawQuery,
		Format:                 format,
		Interval:               interval,
		From:                   from,
		To:                     to,
		FrontendDatasource:     req.FrontendDatasource,
		UseWindowFuncForMacros: req.UseWindowFuncForMacros,
	}

	// Apply macros and get AST
	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		result.Error = fmt.Sprintf("Failed to apply macros: %v", err)
		return result
	}

	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	if err != nil {
		result.Error = fmt.Sprintf("Failed to parse query: %v", err)
		return result
	}

	// Use the recursive function to find GROUP BY properties at any level
	properties := findGroupByProperties(ast)

	// Return the result
	result.SQL = sql
	result.Keys = properties
	return result
}

// ReplaceTimeFiltersResult represents the result of replacing time filters in a query
type ReplaceTimeFiltersResult struct {
	SQL   string
	Error string
}

// ReplaceTimeFilters processes time filter replacements in a query
func ReplaceTimeFilters(query string, dateTimeType string, fromStr string, toStr string) ReplaceTimeFiltersResult {
	result := ReplaceTimeFiltersResult{}

	// Parse time range
	from, err := time.Parse(time.RFC3339, fromStr)
	if err != nil {
		result.Error = fmt.Sprintf("Invalid from time: %v", err)
		return result
	}

	to, err := time.Parse(time.RFC3339, toStr)
	if err != nil {
		result.Error = fmt.Sprintf("Invalid to time: %v", err)
		return result
	}

	// Create eval.EvalQuery
	evalQ := eval.EvalQuery{
		Query:        query,
		From:         from,
		To:           to,
		DateTimeType: dateTimeType,
	}

	// Replace time filters
	sql := evalQ.ReplaceTimeFilters(evalQ.Query, 0)

	// Return the result
	result.SQL = sql
	return result
}

// GetAstPropertyResult represents the result of a property extraction from AST
type GetAstPropertyResult struct {
	Properties []interface{}
	Error      string
}

// GetAstProperty processes AST property requests
func GetAstProperty(query string, propertyName string) GetAstPropertyResult {
	result := GetAstPropertyResult{}

	// Create scanner and parse AST
	scanner := eval.NewScanner(query)
	ast, err := scanner.ToAST()
	if err != nil {
		result.Error = fmt.Sprintf("Failed to parse query: %v", err)
		return result
	}

	// Use the recursive function if we're looking for group by
	if propertyName == "group by" {
		properties := findGroupByProperties(ast)
		result.Properties = properties
		return result
	}

	// Standard extraction for other properties
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
	result.Properties = properties
	return result
}
