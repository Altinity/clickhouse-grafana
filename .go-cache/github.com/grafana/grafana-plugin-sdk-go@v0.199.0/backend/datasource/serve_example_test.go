package datasource_test

import (
	"context"
	"net/http"
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
)

type testDataSourceInstanceSettings struct {
	httpClient *http.Client
}

func newDataSourceInstance(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	opts, err := settings.HTTPClientOptions(ctx)
	if err != nil {
		return nil, err
	}

	client, err := httpclient.New(opts)
	if err != nil {
		return nil, err
	}

	return &testDataSourceInstanceSettings{
		httpClient: client,
	}, nil
}

func (s *testDataSourceInstanceSettings) Dispose() {
	// Cleanup
}

type testDataSource struct {
	im instancemgmt.InstanceManager
}

func newDataSource() datasource.ServeOpts {
	im := datasource.NewInstanceManager(newDataSourceInstance)
	ds := &testDataSource{
		im: im,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/test", ds.handleTest)

	return datasource.ServeOpts{
		CheckHealthHandler:  ds,
		CallResourceHandler: httpadapter.New(mux),
		QueryDataHandler:    ds,
	}
}

func (ds *testDataSource) getSettings(ctx context.Context, pluginContext backend.PluginContext) (*testDataSourceInstanceSettings, error) {
	iface, err := ds.im.Get(ctx, pluginContext)
	if err != nil {
		return nil, err
	}

	return iface.(*testDataSourceInstanceSettings), nil
}

func (ds *testDataSource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	settings, err := ds.getSettings(ctx, req.PluginContext)
	if err != nil {
		return nil, err
	}

	// Handle request
	resp, err := settings.httpClient.Get("http://")
	if err != nil {
		return nil, err
	}
	resp.Body.Close()
	return nil, nil
}

func (ds *testDataSource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	var resp *backend.QueryDataResponse
	err := ds.im.Do(ctx, req.PluginContext, func(settings *testDataSourceInstanceSettings) error {
		// Handle request
		resp, err := settings.httpClient.Get("http://")
		if err != nil {
			return err
		}
		resp.Body.Close()
		return nil
	})

	return resp, err
}

func (ds *testDataSource) handleTest(rw http.ResponseWriter, req *http.Request) {
	ctx := req.Context()
	pluginContext := httpadapter.PluginConfigFromContext(ctx)
	settings, err := ds.getSettings(ctx, pluginContext)
	if err != nil {
		rw.WriteHeader(500)
		return
	}

	// Handle request
	resp, err := settings.httpClient.Get("http://")
	if err != nil {
		rw.WriteHeader(500)
		return
	}
	resp.Body.Close()
}

func Example() {
	err := datasource.Serve(newDataSource())
	if err != nil {
		backend.Logger.Error(err.Error())
		os.Exit(1)
	}
}
