package main

import (
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/tracing"
)

const pluginID = "vertamedia-clickhouse-datasource"

func main() {
	backend.Logger.Info("Starting ClickHouse datasource backend...")

	// Setup plugin environment and tracing (required by Manage API)
	backend.SetupPluginEnvironment(pluginID)
	if err := backend.SetupTracer(pluginID, tracing.Opts{}); err != nil {
		backend.Logger.Error("Failed to setup tracer", "error", err)
	}

	ds := &ClickHouseDatasource{
		im: datasource.NewInstanceManager(NewDatasourceSettings),
	}

	err := backend.Manage(pluginID, backend.ServeOpts{
		QueryDataHandler:    ds,
		CheckHealthHandler:  ds,
		CallResourceHandler: ds,
		StreamHandler:       ds,
	})

	if err != nil {
		backend.Logger.Error(err.Error())
		os.Exit(1)
	}
}
