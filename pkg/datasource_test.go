package main

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/stretchr/testify/require"
)

type failingInstanceManager struct{}

func (f *failingInstanceManager) Get(context.Context, backend.PluginContext) (instancemgmt.Instance, error) {
	return nil, errors.New("instance manager down")
}

func (f *failingInstanceManager) Do(context.Context, backend.PluginContext, instancemgmt.InstanceCallbackFunc) error {
	return nil
}

func dataQuery(refID, jsonBody string) backend.DataQuery {
	return backend.DataQuery{
		RefID: refID,
		JSON:  []byte(jsonBody),
		TimeRange: backend.TimeRange{
			From: time.Now().Add(-time.Hour),
			To:   time.Now(),
		},
	}
}

func TestQueryDataEvalQuery(t *testing.T) {
	ds, stub := newStubDatasource(t)

	resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
		Queries: []backend.DataQuery{dataQuery("A",
			`{"refId":"A","query":"SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t","table":"test","dateTimeColDataType":"event_time","dateTimeType":"DATETIME","interval":"1s","format":"time_series"}`)},
	})

	require.NoError(t, err)
	require.NoError(t, resp.Responses["A"].Error)
	require.Len(t, stub.recorded(), 1)
	require.Contains(t, stub.recorded()[0], "FROM test")
}

// EvalQuery unmarshal fails on the bogus extrapolate, so the raw Query path must take over.
func TestQueryDataFallsBackToRawQuery(t *testing.T) {
	ds, stub := newStubDatasource(t)

	resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
		Queries: []backend.DataQuery{dataQuery("B", `{"refId":"B","rawQuery":"SELECT 1","extrapolate":"not-a-bool"}`)},
	})

	require.NoError(t, err)
	require.NoError(t, resp.Responses["B"].Error)
	require.Len(t, stub.recorded(), 1)
	require.Contains(t, stub.recorded()[0], "SELECT 1")
}

func TestQueryDataRejectsUnparsableJSON(t *testing.T) {
	ds, _ := newStubDatasource(t)

	_, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
		Queries: []backend.DataQuery{dataQuery("C", `{not json`)},
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "unable to parse json")
}

func TestQueryDataMultipleQueriesWithRuleUid(t *testing.T) {
	ds, stub := newStubDatasource(t)

	resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
		Headers: map[string]string{"X-Rule-Uid": "rule-42"},
		Queries: []backend.DataQuery{
			dataQuery("A", `{"refId":"A","query":"SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t","table":"test","dateTimeColDataType":"event_time","dateTimeType":"DATETIME","interval":"1s","format":"time_series"}`),
			dataQuery("B", `{"refId":"B","rawQuery":"SELECT 2","extrapolate":"not-a-bool"}`),
		},
	})

	require.NoError(t, err)
	require.Len(t, resp.Responses, 2)
	require.NoError(t, resp.Responses["A"].Error)
	require.NoError(t, resp.Responses["B"].Error)
	require.Len(t, stub.recorded(), 2)
}

// A macro expansion failure must surface as the refId's error, covering evalQuery's error path.
func TestQueryDataReportsMacroError(t *testing.T) {
	ds, _ := newStubDatasource(t)

	resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
		Queries: []backend.DataQuery{dataQuery("A",
			`{"refId":"A","query":"SELECT $timeSeries as t FROM $table WHERE $timeFilter","table":"test","dateTimeColDataType":"event_time","dateTimeType":"DATETIME","interval":"banana"}`)},
	})

	require.NoError(t, err)
	require.ErrorContains(t, resp.Responses["A"].Error, "interval")
}

func TestQueryDataReportsQueryError(t *testing.T) {
	ds := &ClickHouseDatasource{im: &fakeInstanceManager{settings: &DatasourceSettings{
		Instance:   backend.DataSourceInstanceSettings{URL: "://bad"},
		HTTPClient: http.DefaultClient,
	}}}

	resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
		Queries: []backend.DataQuery{dataQuery("A", `{"refId":"A","rawQuery":"SELECT 1","extrapolate":"not-a-bool"}`)},
	})

	require.NoError(t, err, "a failing query becomes a per-refId error, not a request error")
	require.Error(t, resp.Responses["A"].Error)
}

func TestCheckHealth(t *testing.T) {
	t.Run("healthy backend", func(t *testing.T) {
		ds, _ := newStubDatasource(t)

		res, err := ds.CheckHealth(context.Background(), &backend.CheckHealthRequest{})

		require.NoError(t, err)
		require.Equal(t, backend.HealthStatusOk, res.Status)
		require.Equal(t, "OK", res.Message)
	})

	t.Run("unreachable backend", func(t *testing.T) {
		ds := &ClickHouseDatasource{im: &fakeInstanceManager{settings: &DatasourceSettings{
			Instance:   backend.DataSourceInstanceSettings{URL: "http://127.0.0.1:1"},
			HTTPClient: &http.Client{Timeout: time.Second},
		}}}

		res, err := ds.CheckHealth(context.Background(), &backend.CheckHealthRequest{})

		require.Error(t, err)
		require.Equal(t, backend.HealthStatusError, res.Status)
	})

	t.Run("broken instance manager", func(t *testing.T) {
		ds := &ClickHouseDatasource{im: &failingInstanceManager{}}

		res, err := ds.CheckHealth(context.Background(), &backend.CheckHealthRequest{})

		require.Error(t, err)
		require.Equal(t, backend.HealthStatusError, res.Status)
		require.Contains(t, res.Message, "instance manager down")
	})
}
