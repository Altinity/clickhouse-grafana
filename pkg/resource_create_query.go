package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func createQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var reqData struct {
		RefId              string `json:"refId"`
		RuleUid            string `json:"ruleUid"`
		RawQuery           bool   `json:"rawQuery"`
		Query              string `json:"query"`
		DateTimeCol        string `json:"dateTimeColDataType"`
		DateCol            string `json:"dateColDataType"`
		DateTimeType       string `json:"dateTimeType"`
		Extrapolate        bool   `json:"extrapolate"`
		SkipComments       bool   `json:"skip_comments"`
		AddMetadata        bool   `json:"add_metadata"`
		Format             string `json:"format"`
		Round              string `json:"round"`
		IntervalFactor     int    `json:"intervalFactor"`
		Interval           string `json:"interval"`
		Database           string `json:"database"`
		Table              string `json:"table"`
		MaxDataPoints      int64  `json:"maxDataPoints"`
		FrontendDatasource bool   `json:"frontendDatasource"`
		TimeRange          struct {
			From string `json:"from"`
			To   string `json:"to"`
		} `json:"timeRange"`
	}

	if err := json.NewDecoder(r.Body).Decode(&reqData); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Parse time range
	from, err := time.Parse(time.RFC3339, reqData.TimeRange.From)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid from time"})
		return
	}

	to, err := time.Parse(time.RFC3339, reqData.TimeRange.To)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid to time"})
		return
	}

	evalQ := EvalQuery{
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

	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	scanner := newScanner(sql)
	ast, err := scanner.toAST()

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Failed to parse query: %v", err)})
		return
	}

	var properties []interface{}
	if prop, exists := ast.Obj["group by"]; exists {
		if arr, ok := prop.(*EvalAST); ok {
			// If the property is an array in AST, add all items
			properties = make([]interface{}, len(arr.Arr))
			for i, item := range arr.Arr {
				properties[i] = item
			}
		} else if obj, ok := prop.(map[string]interface{}); ok {
			// If the property is an object, add it as a single item
			properties = []interface{}{obj}
		} else {
			// For any other type, add it as a single item
			properties = []interface{}{prop}
		}
	}

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	response := map[string]interface{}{
		"sql":  sql,
		"keys": properties,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
		return
	}
}
