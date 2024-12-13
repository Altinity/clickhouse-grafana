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

type Target struct {
	Database string
	Table    string
}

func parseTargets(from string) (string, string) {
	// If you need dynamic values, you can set them as global vars or pass them via closure.
	// For now, we define some default values:
	defaultDatabase := "mydb"
	defaultTable := "users"

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
			Database string        `json:"database"`
			Table    string        `json:"table"`
			AHC      []AdhocFilter `json:"adHocFilters"`
		} `json:"target"`
	}

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&reqData); err != nil {
		fmt.Printf("handleApplyAdhocFilters: Failed to decode request body: %v\n", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	adhocConditions := make([]string, 0)
	scanner := newScanner(reqData.Query)
	ast, err := scanner.toAST()
	if err != nil {
		fmt.Printf("handleApplyAdhocFilters: Failed to parse query: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var query string
	if len(reqData.AdhocFilters) > 0 {
		basicAst := ast
		fromField, _ := ast.Obj["from"].(*EvalAST)

		//for fromExists && reflect.TypeOf(fromField.Arr).Kind() != reflect.Array {
		//	nextAst, ok := ast.Obj["from"].(*EvalAST)
		//	if !ok {
		//		break
		//	}
		//	ast = nextAst
		//	fromField, fromExists = ast.Obj["from"].(*EvalAST)
		//}

		if !ast.hasOwnProperty("where") {
			ast.Obj["where"] = &EvalAST{
				Obj: make(map[string]interface{}),
				Arr: make([]interface{}, 0),
			}
		}

		wherefield, _ := ast.Obj["where"].(*EvalAST)

		targetDatabase, targetTable := parseTargets("default.test_grafana")
		// Process each adhoc filter
		for _, filter := range reqData.AdhocFilters {

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

			// TODO: complete, now only limited list of operators is supported
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
			if !strings.Contains(reqData.Query, "$adhoc") {
				if len(ast.Obj["where"].(*EvalAST).Arr) > 0 {
					condition = "AND " + condition

				}

				ast.Obj["where"].(*EvalAST).Arr = append(ast.Obj["where"].(*EvalAST).Arr, condition)
			}
		}

		query = printAST(ast, " ")
	}
	// Replace $adhoc macro
	renderedCondition := "1"
	if len(adhocConditions) > 0 {
		renderedCondition = fmt.Sprintf("(%s)", strings.Join(adhocConditions, " AND "))
	}

	query = strings.ReplaceAll(query, "$adhoc", renderedCondition)

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
