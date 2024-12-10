package main

import (
  "encoding/json"
  "fmt"
  "net/http"
)

func getAstProperty(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodPost {
    w.WriteHeader(http.StatusMethodNotAllowed)
    return
  }

  var reqData struct {
    Query        string `json:"query"`
    PropertyName string `json:"propertyName"`
  }

  if err := json.NewDecoder(r.Body).Decode(&reqData); err != nil {
    w.WriteHeader(http.StatusBadRequest)
    json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
    return
  }

  scanner := newScanner(reqData.Query)
  ast, err := scanner.toAST()
  if err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Failed to parse query: %v", err)})
    return
  }

  var properties []interface{}
  if prop, exists := ast.Obj[reqData.PropertyName]; exists {
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

  response := map[string]interface{}{
    "properties": properties,
  }

  w.Header().Set("Content-Type", "application/json")
  if err := json.NewEncoder(w).Encode(response); err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
    return
  }
}
