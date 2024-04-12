package datasourcetest

import (
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/internal/automanagement"
)

type ManageOpts struct {
	Address string
}

type TestPlugin struct {
	Client *TestPluginClient
	Server *TestPluginServer
}

func (p *TestPlugin) Shutdown() error {
	if p.Server != nil {
		p.Server.shutdown()
	}

	if p.Client != nil {
		return p.Client.shutdown()
	}
	return nil
}

func Manage(instanceFactory datasource.InstanceFactoryFunc, opts ManageOpts) (TestPlugin, error) {
	handler := automanagement.NewManager(datasource.NewInstanceManager(instanceFactory))
	s, err := backend.TestStandaloneServe(backend.ServeOpts{
		CheckHealthHandler:  handler,
		CallResourceHandler: handler,
		QueryDataHandler:    handler,
		StreamHandler:       handler,
	}, opts.Address)

	if err != nil {
		return TestPlugin{}, err
	}

	c, err := newTestPluginClient(opts.Address)
	if err != nil {
		return TestPlugin{}, err
	}

	return TestPlugin{
		Client: c,
		Server: newTestPluginServer(s),
	}, nil
}
