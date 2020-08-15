package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"runtime/debug"

	"github.com/bitly/go-simplejson"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"golang.org/x/net/context/ctxhttp"
)

// ClickhouseDatasourceInstanceSettings shared context for datasource instance
type ClickhouseDatasourceInstanceSettings struct {
	httpClient *http.Client
}

func (s *ClickhouseDatasourceInstanceSettings) Dispose() {
	// cleanup datasource
}

func NewClickouseDatasourceInstance(setting backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	return &ClickhouseDatasourceInstanceSettings{
		httpClient: &http.Client{},
	}, nil
}

type ClickhouseDatasource struct {
	im instancemgmt.InstanceManager
}

// Create the datasource
// Datasource api paths are found at: https://github.com/grafana/grafana/blob/master/pkg/api/api.go#L251
func NewDataSource() datasource.ServeOpts {
	im := datasource.NewInstanceManager(NewClickouseDatasourceInstance)
	ds := &ClickhouseDatasource{
		im: im,
	}

	// Custom api resources for the plugin, which can be reached at:
	// /api/plugins/vertamedia-clickhouse-datasource/resources
	// i.e. /api/plugins/vertamedia-clickhouse-datasource/resources/test
	mux := http.NewServeMux()
	mux.HandleFunc("/", ds.resourceIndex)

	return datasource.ServeOpts{
		CheckHealthHandler:  ds,
		CallResourceHandler: httpadapter.New(mux),
		QueryDataHandler:    ds,
	}
}

// getSettings from plugin context
func (ds *ClickhouseDatasource) getSettings(pluginContext backend.PluginContext) (*ClickhouseDatasourceInstanceSettings, error) {
	iface, err := ds.im.Get(pluginContext)
	if err != nil {
		return nil, err
	}

	backend.Logger.Info(fmt.Sprintf("%#v", iface))
	return iface.(*ClickhouseDatasourceInstanceSettings), nil
}

// CheckHealth checks that clickhouse is still accessible and queryable
// /api/plugins/vertamedia-clickhouse-datasource/health
func (ds *ClickhouseDatasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	settings, err := ds.getSettings(req.PluginContext)
	if err != nil {
		return nil, err
	}

	if settings != nil {
		// do something
	}

	return nil, nil
}

// QueryData query clickhouse for data
func (ds *ClickhouseDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (retResp *backend.QueryDataResponse, retErr error) {
	// Catch query specific panics and return the error
	defer func() {
		if panicMsg := recover(); panicMsg != nil {
			retErr = fmt.Errorf("clickhouse plugin panicked: %+v stacktrace:\n%s", panicMsg, debug.Stack())
		}
	}()

	retResp = backend.NewQueryDataResponse()
	retErr = ds.im.Do(req.PluginContext, func(settings *ClickhouseDatasourceInstanceSettings) error {
		// TODO loop through each query and process
		modelJson, err := simplejson.NewJson([]byte(req.Queries[0].JSON))
		if err != nil {
			return fmt.Errorf("unable to parse query: %w", err)
		}

		query := modelJson.Get("rawQuery").MustString()
		request, err := createRequest(req, query)
		if err != nil {
			return err
		}

		response, err := ctxhttp.Do(ctx, settings.httpClient, request)
		if err != nil {
			return err
		}

		defer func() {
			if err := response.Body.Close(); err != nil {
				log.Fatal("can't close HTTP Response body")
			}
		}()

		// Body must be drained and closed on each request as per the docs: https://golang.org/pkg/net/http/#Client.Do
		// otherwise the http client connection cannot be reused
		body, err := ioutil.ReadAll(response.Body)
		if err != nil {
			return err
		}

		if response.StatusCode != http.StatusOK {
			return fmt.Errorf("invalid status code. status: %v", response.Status)
		}

		resp, err := clickhouseResponseToFrame(body, req.Queries[0])

		retResp.Responses[req.Queries[0].RefID] = backend.DataResponse{
			Frames: []*data.Frame{resp},
			Error:  err,
		}

		/*
		if err == nil {
			st, _ := resp.StringTable(-1, -1)
			backend.Logger.Debug(fmt.Sprintf("Query dataframe result %s", st))
		}
		*/

		return nil
	})

	return retResp, retErr
}

// resourcesIndex response to /api/plugins/vertamedia-clickhouse-datasource/resources
func (ds *ClickhouseDatasource) resourceIndex(rw http.ResponseWriter, req *http.Request) {
	rw.Write([]byte("no custom resources available"))
}

func main() {
	// Catch panics with plugin that cannot be recovered in the call function
	defer func() {
		if panicMsg := recover(); panicMsg != nil {
			backend.Logger.Error(fmt.Sprintf("clickhouse plugin panicked: %+v stacktrace:\n%s", panicMsg, debug.Stack()))
		}
	}()

	err := datasource.Serve(NewDataSource())
	if err != nil {
		backend.Logger.Error(err.Error())
		os.Exit(1)
	}
}
