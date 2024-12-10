package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

type AdhocFilter struct {
	Key      string      `json:"key"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

func applyAdhocFilters(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("handleApplyAdhocFilters: Starting request processing\n")

	if r.Method != http.MethodPost {
		fmt.Printf("handleApplyAdhocFilters: Invalid method: %s\n", r.Method)
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var reqData struct {
		Query        string        `json:"query"`
		AdhocFilters []AdhocFilter `json:"adhocFilters"`
		Target       struct {
			Database string `json:"database"`
			Table    string `json:"table"`
		} `json:"target"`
	}

	if err := json.NewDecoder(r.Body).Decode(&reqData); err != nil {
		fmt.Printf("handleApplyAdhocFilters: Failed to decode request body: %v\n", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	fmt.Printf("handleApplyAdhocFilters: Request data - Query: %s, Filters count: %d, Target DB: %s, Table: %s\n",
		reqData.Query, len(reqData.AdhocFilters), reqData.Target.Database, reqData.Target.Table)

	if len(reqData.AdhocFilters) == 0 {
		fmt.Printf("handleApplyAdhocFilters: No filters provided, returning original query\n")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"query": reqData.Query})
		return
	}

	scanner := newScanner(reqData.Query)
	ast, err := scanner.toAST()
	if err != nil {
		fmt.Printf("handleApplyAdhocFilters: Failed to parse query to AST: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Failed to parse query: %v", err)})
		return
	}

	fmt.Printf("handleApplyAdhocFilters: Successfully parsed query to AST\n")
	fmt.Printf("handleApplyAdhocFilters: AST structure: %+v\n", ast)
	if ast.Obj != nil {
		fmt.Printf("handleApplyAdhocFilters: AST Obj keys: %v\n", getMapKeys(ast.Obj))
	}
	if ast.Arr != nil {
		fmt.Printf("handleApplyAdhocFilters: AST Arr length: %d\n", len(ast.Arr))
	}

	// Process AST similar to frontend
	currentAst := ast
	adhocConditions := make([]string, 0)

	// Find deepest FROM clause
	fromDepth := 0
	for currentAst != nil && currentAst.hasOwnProperty("from") {
		fromDepth++
		fmt.Printf("handleApplyAdhocFilters: Processing FROM clause at depth %d\n", fromDepth)
		fmt.Printf("handleApplyAdhocFilters: Current AST at depth %d: %+v\n", fromDepth, currentAst)

		fromVal, ok := currentAst.Obj["from"]
		if !ok || fromVal == nil {
			fmt.Printf("handleApplyAdhocFilters: FROM value not found or nil at depth %d\n", fromDepth)
			break
		}

		// Try to get the FROM clause, if it's not an EvalAST, we'll use the current AST
		fromAst, ok := fromVal.(*EvalAST)
		if !ok {
			fmt.Printf("handleApplyAdhocFilters: FROM is not an EvalAST at depth %d, value type: %T\n", fromDepth, fromVal)
			break
		}

		if fromAst.Arr == nil {
			fmt.Printf("handleApplyAdhocFilters: FROM array is nil at depth %d\n", fromDepth)
			break
		}

		fmt.Printf("handleApplyAdhocFilters: FROM array at depth %d: %+v\n", fromDepth, fromAst.Arr)
		if len(fromAst.Arr) == 0 {
			fmt.Printf("handleApplyAdhocFilters: Empty FROM array at depth %d\n", fromDepth)
			break
		}

		currentAst = fromAst
	}

	// If we didn't find a valid FROM clause in the nested structure,
	// let's try to work with the table information from the target
	if currentAst == nil || !currentAst.hasOwnProperty("from") {
		fmt.Printf("handleApplyAdhocFilters: Creating FROM clause from target info\n")
		currentAst = ast
		if currentAst.Obj == nil {
			currentAst.Obj = make(map[string]interface{})
		}

		fromAst := &EvalAST{
			Obj: make(map[string]interface{}),
			Arr: []interface{}{fmt.Sprintf("%s.%s", reqData.Target.Database, reqData.Target.Table)},
		}
		currentAst.Obj["from"] = fromAst
	}

	// Ensure WHERE clause exists and is properly initialized
	fmt.Printf("handleApplyAdhocFilters: Checking and initializing WHERE clause\n")

	if currentAst.Obj == nil {
		fmt.Printf("handleApplyAdhocFilters: Initializing currentAst.Obj map\n")
		currentAst.Obj = make(map[string]interface{})
	}

	var whereAst *EvalAST
	if !currentAst.hasOwnProperty("where") {
		fmt.Printf("handleApplyAdhocFilters: Creating new WHERE clause\n")
		whereAst = &EvalAST{
			Obj: make(map[string]interface{}),
			Arr: make([]interface{}, 0),
		}
		currentAst.Obj["where"] = whereAst
	} else {
		whereVal, ok := currentAst.Obj["where"]
		if !ok || whereVal == nil {
			fmt.Printf("handleApplyAdhocFilters: WHERE value is nil or missing, creating new one\n")
			whereAst = &EvalAST{
				Obj: make(map[string]interface{}),
				Arr: make([]interface{}, 0),
			}
			currentAst.Obj["where"] = whereAst
		} else {
			whereAst, ok = whereVal.(*EvalAST)
			if !ok {
				fmt.Printf("handleApplyAdhocFilters: WHERE value is not an EvalAST, creating new one\n")
				whereAst = &EvalAST{
					Obj: make(map[string]interface{}),
					Arr: make([]interface{}, 0),
				}
				currentAst.Obj["where"] = whereAst
			}
		}
	}

	if whereAst.Arr == nil {
		fmt.Printf("handleApplyAdhocFilters: Initializing WHERE clause array\n")
		whereAst.Arr = make([]interface{}, 0)
	}

	fmt.Printf("handleApplyAdhocFilters: WHERE clause initialized - Arr length: %d\n", len(whereAst.Arr))

	// Get target info from first FROM element
	fmt.Printf("handleApplyAdhocFilters: Checking FROM clause\n")
	fromVal, ok := currentAst.Obj["from"]
	if !ok || fromVal == nil {
		fmt.Printf("handleApplyAdhocFilters: FROM clause is missing or nil\n")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Missing FROM clause"})
		return
	}

	fromArr, ok := fromVal.(*EvalAST)
	if !ok {
		fmt.Printf("handleApplyAdhocFilters: FROM clause is not an EvalAST, creating new one\n")
		fromArr = &EvalAST{
			Obj: make(map[string]interface{}),
			Arr: make([]interface{}, 0),
		}
		currentAst.Obj["from"] = fromArr
	}

	if fromArr.Arr == nil {
		fmt.Printf("handleApplyAdhocFilters: Initializing FROM clause array\n")
		fromArr.Arr = make([]interface{}, 0)
	}

	if len(fromArr.Arr) == 0 {
		fmt.Printf("handleApplyAdhocFilters: Invalid FROM clause - empty array\n")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid FROM clause"})
		return
	}

	fmt.Printf("handleApplyAdhocFilters: FROM clause array contents: %+v\n", fromArr.Arr)
	targetInfo := []string{reqData.Target.Database, reqData.Target.Table}
	fmt.Printf("handleApplyAdhocFilters: Target info - Database: %s, Table: %s\n", targetInfo[0], targetInfo[1])

	// Process each adhoc filter
	for i, filter := range reqData.AdhocFilters {
		fmt.Printf("\nhandleApplyAdhocFilters: Processing filter %d - Key: %s, Operator: %s, Value: %v\n",
			i, filter.Key, filter.Operator, filter.Value)

		var parts []string
		if strings.Contains(filter.Key, ".") {
			parts = strings.Split(filter.Key, ".")
			fmt.Printf("handleApplyAdhocFilters: Split filter key into parts: %v\n", parts)
		} else {
			parts = []string{targetInfo[0], targetInfo[1], filter.Key}
			fmt.Printf("handleApplyAdhocFilters: Created default parts: %v\n", parts)
		}

		// Add missing parts
		if len(parts) == 1 {
			parts = append([]string{targetInfo[1]}, parts...)
		}
		if len(parts) == 2 {
			parts = append([]string{targetInfo[0]}, parts...)
		}
		fmt.Printf("handleApplyAdhocFilters: Final parts after adding missing: %v\n", parts)

		if len(parts) < 3 {
			fmt.Printf("handleApplyAdhocFilters: Skipping filter due to insufficient parts\n")
			continue
		}

		if targetInfo[0] != parts[0] || targetInfo[1] != parts[1] {
			fmt.Printf("handleApplyAdhocFilters: Skipping filter due to mismatched target info\n")
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
		fmt.Printf("handleApplyAdhocFilters: Converted operator from %s to %s\n", filter.Operator, operator)

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
		fmt.Printf("handleApplyAdhocFilters: Formatted value: %s\n", value)

		// Build the condition with proper spacing
		condition := fmt.Sprintf("%s %s %s", parts[2], operator, value)
		fmt.Printf("handleApplyAdhocFilters: Created condition: %s\n", condition)
		adhocConditions = append(adhocConditions, condition)

		// Add the condition to WHERE clause if not using $adhoc macro
		if !strings.Contains(reqData.Query, "$adhoc") {
			if len(whereAst.Arr) > 0 {
				condition = "AND " + condition
				fmt.Printf("handleApplyAdhocFilters: Added AND to condition: %s\n", condition)
			}
			whereAst.Arr = append(whereAst.Arr, condition)
			fmt.Printf("handleApplyAdhocFilters: Added condition to WHERE clause. Current WHERE array length: %d\n", len(whereAst.Arr))
		}
	}

	// Update query
	fmt.Printf("\nhandleApplyAdhocFilters: Generating final query\n")
	fmt.Printf("handleApplyAdhocFilters: Current WHERE array before printing: %v\n", whereAst.Arr)
	fmt.Printf("handleApplyAdhocFilters: All adhoc conditions: %v\n", adhocConditions)

	query := printAST(ast, " ")
	fmt.Printf("handleApplyAdhocFilters: Query after printAST: %s\n", query)

	// Replace $adhoc macro
	renderedCondition := "1"
	if len(adhocConditions) > 0 {
		renderedCondition = fmt.Sprintf("(%s)", strings.Join(adhocConditions, " AND "))
	}
	fmt.Printf("handleApplyAdhocFilters: Rendered adhoc condition: %s\n", renderedCondition)

	query = strings.ReplaceAll(query, "$adhoc", renderedCondition)
	fmt.Printf("handleApplyAdhocFilters: Final query after macro replacement: %s\n", query)

	response := map[string]interface{}{
		"query": query,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		fmt.Printf("handleApplyAdhocFilters: Failed to encode response: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
		return
	}
	fmt.Printf("handleApplyAdhocFilters: Successfully completed request\n")
}

func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
