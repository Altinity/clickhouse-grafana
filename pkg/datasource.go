package main

import (
	"encoding/json"
	"fmt"
	"golang.org/x/sync/errgroup"
	"net/http"
	"time"

	"context"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"regexp"
	"strings"
)

func newResourceHandler() backend.CallResourceHandler {
	mux := http.NewServeMux()
	mux.HandleFunc("/replace", func(w http.ResponseWriter, r *http.Request) {
		handleCreateQuery(w, r)
	})
	mux.HandleFunc("/get-ast-property", func(w http.ResponseWriter, r *http.Request) {
		handleGetAstProperty(w, r)
	})
	mux.HandleFunc("/get-ast", func(w http.ResponseWriter, r *http.Request) {
		handleGetAst(w, r)
	})
	mux.HandleFunc("/apply-adhoc-filters", func(w http.ResponseWriter, r *http.Request) {
		handleApplyAdhocFilters(w, r)
	})
	mux.HandleFunc("/replace-time-filters", func(w http.ResponseWriter, r *http.Request) {
		handleReplaceTimeFilters(w, r)
	})
	return httpadapter.New(mux)
}

func handleReplaceTimeFilters(w http.ResponseWriter, r *http.Request) {
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
		Query: reqData.Query,
		From:  from,
		To:    to,
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

func handleGetAstProperty(w http.ResponseWriter, r *http.Request) {
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

func handleGetAst(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var reqData struct {
		Query string `json:"query"`
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

	response := map[string]interface{}{
		"ast": ast,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
		return
	}
}

func handleCreateQuery(w http.ResponseWriter, r *http.Request) {
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

type AdhocFilter struct {
	Key      string      `json:"key"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

func handleApplyAdhocFilters(w http.ResponseWriter, r *http.Request) {
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

func GetDatasourceServeOpts() datasource.ServeOpts {
	ds := &ClickHouseDatasource{
		im: datasource.NewInstanceManager(NewDatasourceSettings),
	}

	return datasource.ServeOpts{
		QueryDataHandler:    ds,
		CheckHealthHandler:  ds,
		CallResourceHandler: newResourceHandler(),
	}
}

type ClickHouseDatasource struct {
	im instancemgmt.InstanceManager
}

func (ds *ClickHouseDatasource) getClient(ctx backend.PluginContext) (*ClickHouseClient, error) {
	im, err := ds.im.Get(context.Background(), ctx)
	if err != nil {
		return nil, err
	}

	return &ClickHouseClient{
		settings: im.(*DatasourceSettings),
	}, nil
}

func (ds *ClickHouseDatasource) executeQuery(pluginContext backend.PluginContext, ctx context.Context, query *Query) backend.DataResponse {

	onErr := func(err error) backend.DataResponse {
		backend.Logger.Error(fmt.Sprintf("Datasource executeQuery error: %s", err))
		return backend.DataResponse{Error: err}
	}

	client, err := ds.getClient(pluginContext)
	if err != nil {
		return onErr(err)
	}
	sql := query.ApplyTimeRangeToQuery()
	clickhouseResponse, err := client.Query(ctx, sql)
	if err != nil {
		return onErr(err)
	}

	frames, err := clickhouseResponse.toFrames(query, client.FetchTimeZone)
	if err != nil {
		return onErr(err)
	}

	backend.Logger.Debug(fmt.Sprintf("queryResponse: %s returns %v frames", sql, len(frames)))
	return backend.DataResponse{
		Frames: frames,
	}
}

func (ds *ClickHouseDatasource) evalQuery(pluginContext backend.PluginContext, ctx context.Context, evalQuery *EvalQuery) backend.DataResponse {
	onErr := func(err error) backend.DataResponse {
		backend.Logger.Error(fmt.Sprintf("Datasource evalQuery error: %s", err))
		return backend.DataResponse{Error: err}
	}

	sql, err := evalQuery.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		return onErr(err)
	}

	q := Query{
		From:     evalQuery.From,
		To:       evalQuery.To,
		RawQuery: sql,
	}
	return ds.executeQuery(pluginContext, ctx, &q)
}

func (ds *ClickHouseDatasource) QueryData(
	ctx context.Context,
	req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {

	onErr := func(err error) (*backend.QueryDataResponse, error) {
		backend.Logger.Error(fmt.Sprintf("QueryData error: %v", err))
		return nil, err
	}
	response := backend.NewQueryDataResponse()
	wg, wgCtx := errgroup.WithContext(ctx)
	ruleUid := req.Headers["X-Rule-Uid"]
	for _, query := range req.Queries {
		var evalQ = EvalQuery{
			RuleUid:       ruleUid,
			From:          query.TimeRange.From,
			To:            query.TimeRange.To,
			MaxDataPoints: query.MaxDataPoints,
		}
		evalJsonErr := json.Unmarshal(query.JSON, &evalQ)
		if evalJsonErr == nil {
			wg.Go(func() error {
				response.Responses[evalQ.RefId] = ds.evalQuery(req.PluginContext, wgCtx, &evalQ)
				return nil
			})
		}
		if evalJsonErr != nil {
			var q = Query{
				From:    query.TimeRange.From,
				To:      query.TimeRange.To,
				RuleUid: ruleUid,
			}
			jsonErr := json.Unmarshal(query.JSON, &q)
			if jsonErr != nil {
				return onErr(fmt.Errorf("unable to parse json, to Query error: %v, to EvalQuery error: %v, source JSON: %s", jsonErr, evalJsonErr, query.JSON))
			}
			wg.Go(func() error {
				response.Responses[q.RefId] = ds.executeQuery(req.PluginContext, wgCtx, &q)
				return nil
			})
		}
	}
	if err := wg.Wait(); err != nil {
		return onErr(fmt.Errorf("one of executeQuery go-routine return error: %v", err))
	}

	return response, nil
}

func (ds *ClickHouseDatasource) CheckHealth(
	ctx context.Context,
	req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {

	onErr := func(err error) (*backend.CheckHealthResult, error) {
		backend.Logger.Error(fmt.Sprintf("HealthCheck error: %v", err))
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: err.Error(),
		}, err
	}

	client, err := ds.getClient(req.PluginContext)
	if err != nil {
		return onErr(err)
	}
	_, err = client.Query(ctx, DefaultQuery)
	if err != nil {
		return onErr(err)
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "OK",
	}, nil
}
