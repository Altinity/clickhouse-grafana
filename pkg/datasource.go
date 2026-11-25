package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"
	"sync"

	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"golang.org/x/sync/errgroup"
)

type ClickHouseDatasource struct {
	im instancemgmt.InstanceManager
}

func (ds *ClickHouseDatasource) getClient(ctx context.Context, pluginCtx backend.PluginContext) (*ClickHouseClient, error) {
	im, err := ds.im.Get(ctx, pluginCtx)
	if err != nil {
		return nil, err
	}

	return &ClickHouseClient{
		settings: im.(*DatasourceSettings),
	}, nil
}

func (ds *ClickHouseDatasource) executeQuery(pluginContext backend.PluginContext, ctx context.Context, query *Query) backend.DataResponse {

	onErr := func(err error) backend.DataResponse {
		backend.Logger.Error(fmt.Sprintf("Datasource executeQuery error: %s", logSafeError(err)))
		return backend.DataResponse{Error: err}
	}

	client, err := ds.getClient(ctx, pluginContext)
	if err != nil {
		return onErr(err)
	}
	sql, err := query.ApplyTimeRangeToQuery()
	if err != nil {
		return onErr(err)
	}
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

func (ds *ClickHouseDatasource) evalQuery(pluginContext backend.PluginContext, ctx context.Context, evalQuery *eval.EvalQuery) backend.DataResponse {
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

// safeDataResponse runs fn and converts a panic into an error response,
// so a malformed query or response can't crash the plugin process for all users
func safeDataResponse(refId string, fn func() backend.DataResponse) (result backend.DataResponse) {
	defer func() {
		if r := recover(); r != nil {
			backend.Logger.Error("query panic recovered", "refId", refId, "panic", r, "stack", string(debug.Stack()))
			result = backend.DataResponse{Error: fmt.Errorf("internal plugin error while processing query %s: %v", refId, r)}
		}
	}()
	return fn()
}

func (ds *ClickHouseDatasource) QueryData(
	ctx context.Context,
	req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {

	onErr := func(err error) (*backend.QueryDataResponse, error) {
		backend.Logger.Error(fmt.Sprintf("QueryData error: %v", err))
		return nil, err
	}
	response := backend.NewQueryDataResponse()
	var mu sync.Mutex
	wg, wgCtx := errgroup.WithContext(ctx)
	ruleUid := req.Headers["X-Rule-Uid"]
	for _, query := range req.Queries {
		var evalQ = eval.EvalQuery{
			RuleUid:       ruleUid,
			From:          query.TimeRange.From,
			To:            query.TimeRange.To,
			MaxDataPoints: query.MaxDataPoints,
		}
		evalJsonErr := json.Unmarshal(query.JSON, &evalQ)
		if evalJsonErr == nil {
			wg.Go(func() error {
				result := safeDataResponse(evalQ.RefId, func() backend.DataResponse {
					return ds.evalQuery(req.PluginContext, wgCtx, &evalQ)
				})
				mu.Lock()
				response.Responses[evalQ.RefId] = result
				mu.Unlock()
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
				result := safeDataResponse(q.RefId, func() backend.DataResponse {
					return ds.executeQuery(req.PluginContext, wgCtx, &q)
				})
				mu.Lock()
				response.Responses[q.RefId] = result
				mu.Unlock()
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

	onErr := func(message string, err error) (*backend.CheckHealthResult, error) {
		backend.Logger.Error("HealthCheck error", "message", message, "error", logSafeError(err))
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: message,
		}, nil
	}

	client, err := ds.getClient(ctx, req.PluginContext)
	if err != nil {
		return onErr("Invalid datasource settings, check the plugin configuration", err)
	}
	_, err = client.Query(ctx, DefaultQuery)
	if err != nil {
		var httpErr *ClickHouseHTTPError
		if errors.As(err, &httpErr) {
			if httpErr.StatusCode == http.StatusUnauthorized || httpErr.StatusCode == http.StatusForbidden {
				return onErr("Authentication failed, check ClickHouse username and password", err)
			}
			return onErr(fmt.Sprintf("ClickHouse returned HTTP status %d, see Grafana server logs for details", httpErr.StatusCode), err)
		}
		return onErr("Unable to connect to ClickHouse, check URL and network access. See Grafana server logs for details", err)
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "OK",
	}, nil
}

// CallResource handles resource calls from the frontend
func (ds *ClickHouseDatasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	switch req.Path {
	case "createQuery":
		return ds.handleCreateQuery(ctx, req, sender)
	case "applyAdhocFilters":
		return ds.handleApplyAdhocFilters(ctx, req, sender)
	case "getAstProperty":
		return ds.handleGetAstProperty(ctx, req, sender)
	case "replaceTimeFilters":
		return ds.handleReplaceTimeFilters(ctx, req, sender)
	case "processQueryBatch":
		return ds.handleProcessQueryBatch(ctx, req, sender)
	case "createQueryWithAdhoc":
		return ds.handleCreateQueryWithAdhoc(ctx, req, sender)
	case "getMultipleAstProperties":
		return ds.handleGetMultipleAstProperties(ctx, req, sender)
	default:
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusNotFound,
			Body:   []byte(`{"error": "Resource not found"}`),
		})
	}
}
