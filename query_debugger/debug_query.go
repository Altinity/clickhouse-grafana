package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"time"

	"github.com/altinity/clickhouse-grafana/pkg/eval"
)

// QueryRequest represents the structure of the query request
type QueryRequest struct {
	RefId                  string `json:"refId"`
	RuleUid                string `json:"ruleUid"`
	RawQuery               bool   `json:"rawQuery"`
	Query                  string `json:"query"`
	DateTimeCol            string `json:"dateTimeColDataType"`
	DateCol                string `json:"dateColDataType"`
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

// createQuery is the debug version of createQueryWasm
func createQuery(reqData QueryRequest) map[string]interface{} {
	// Parse time range
	from, err := time.Parse(time.RFC3339, reqData.TimeRange.From)
	if err != nil {
		return map[string]interface{}{
			"error": "Invalid `$from` time: " + err.Error(),
		}
	}

	to, err := time.Parse(time.RFC3339, reqData.TimeRange.To)
	if err != nil {
		return map[string]interface{}{
			"error": "Invalid `$to` time: " + err.Error(),
		}
	}

	// Create eval.EvalQuery
	evalQ := eval.EvalQuery{
		RefId:                  reqData.RefId,
		RuleUid:                reqData.RuleUid,
		RawQuery:               reqData.RawQuery,
		Query:                  reqData.Query,
		DateTimeCol:            reqData.DateTimeCol,
		DateCol:                reqData.DateCol,
		DateTimeType:           reqData.DateTimeType,
		Extrapolate:            reqData.Extrapolate,
		SkipComments:           reqData.SkipComments,
		AddMetadata:            reqData.AddMetadata,
		Format:                 reqData.Format,
		Round:                  reqData.Round,
		IntervalFactor:         reqData.IntervalFactor,
		Interval:               reqData.Interval,
		Database:               reqData.Database,
		Table:                  reqData.Table,
		MaxDataPoints:          reqData.MaxDataPoints,
		From:                   from,
		To:                     to,
		FrontendDatasource:     reqData.FrontendDatasource,
		UseWindowFuncForMacros: reqData.UseWindowFuncForMacros,
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
	fmt.Printf("Error reading file: %s\n", properties)

	// Return the result
	return map[string]interface{}{
		"sql":  sql,
		"keys": properties,
	}
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run debug_query.go <input.json>")
		os.Exit(1)
	}

	// Read input file
	data, err := ioutil.ReadFile(os.Args[1])
	if err != nil {
		fmt.Printf("Error reading file: %v\n", err)
		os.Exit(1)
	}

	// Parse input JSON
	var request QueryRequest
	err = json.Unmarshal(data, &request)
	if err != nil {
		fmt.Printf("Error parsing JSON: %v\n", err)
		os.Exit(1)
	}

	// Process the query
	result := createQuery(request)

	// Print result
	resultJSON, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Printf("Error encoding result: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(resultJSON))
}
