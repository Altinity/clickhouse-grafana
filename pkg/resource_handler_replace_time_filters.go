package main

import (
  "encoding/json"
  "net/http"
  "time"
)

func replaceTimeFilters(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodPost {
    w.WriteHeader(http.StatusMethodNotAllowed)
    return
  }

  var reqData struct {
    Query     string `json:"query"`
    TimeRange struct {
      From string `json:"from"`
      To   string `json:"to"`
    } `json:"timeRange"`
    DateTimeType string `json:"dateTimeType"`
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
    Query:        reqData.Query,
    From:         from,
    To:           to,
    DateTimeType: reqData.DateTimeType,
  }

  sql := evalQ.replaceTimeFilters(evalQ.Query, 0)

  //if err != nil {
  //	w.WriteHeader(http.StatusInternalServerError)
  //	json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
  //	return
  //}

  response := map[string]interface{}{
    "sql": sql,
  }

  w.Header().Set("Content-Type", "application/json")
  if err := json.NewEncoder(w).Encode(response); err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
    return
  }
}

