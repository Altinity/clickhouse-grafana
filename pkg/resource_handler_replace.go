package main

import (
	"encoding/json"
	"net/http"
	"time"
)

func replaceQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var reqData struct {
		RefId          string `json:"refId"`
		RuleUid        string `json:"ruleUid"`
		RawQuery       bool   `json:"rawQuery"`
		Query          string `json:"query"`
		DateTimeCol    string `json:"dateTimeColDataType"`
		DateCol        string `json:"dateColDataType"`
		DateTimeType   string `json:"dateTimeType"`
		Extrapolate    bool   `json:"extrapolate"`
		SkipComments   bool   `json:"skip_comments"`
		AddMetadata    bool   `json:"add_metadata"`
		Format         string `json:"format"`
		Round          string `json:"round"`
		IntervalFactor int    `json:"intervalFactor"`
		Interval       string `json:"interval"`
		Database       string `json:"database"`
		Table          string `json:"table"`
		MaxDataPoints  int64  `json:"maxDataPoints"`
		TimeRange      struct {
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
		RefId:          reqData.RefId,
		RuleUid:        reqData.RuleUid,
		RawQuery:       reqData.RawQuery,
		Query:          reqData.Query,
		DateTimeCol:    reqData.DateTimeCol,
		DateCol:        reqData.DateCol,
		DateTimeType:   reqData.DateTimeType,
		Extrapolate:    reqData.Extrapolate,
		SkipComments:   reqData.SkipComments,
		AddMetadata:    reqData.AddMetadata,
		Format:         reqData.Format,
		Round:          reqData.Round,
		IntervalFactor: reqData.IntervalFactor,
		Interval:       reqData.Interval,
		Database:       reqData.Database,
		Table:          reqData.Table,
		MaxDataPoints:  reqData.MaxDataPoints,
		From:           from,
		To:             to,
	}

	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	response := map[string]interface{}{
		"sql":       sql,
		"evalQuery": evalQ,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
		return
	}
}
