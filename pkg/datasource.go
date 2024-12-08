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
)

func newResourceHandler() backend.CallResourceHandler {
	mux := http.NewServeMux()
	mux.HandleFunc("/replace", func(w http.ResponseWriter, r *http.Request) {
		handleCreateQuery(w, r)
	})
	return httpadapter.New(mux)
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
