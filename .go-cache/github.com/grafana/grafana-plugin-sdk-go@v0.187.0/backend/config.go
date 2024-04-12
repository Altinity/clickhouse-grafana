package backend

import (
	"context"
	"strconv"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend/proxy"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/featuretoggles"
)

type configKey struct{}

// GrafanaConfigFromContext returns Grafana config from context.
func GrafanaConfigFromContext(ctx context.Context) *GrafanaCfg {
	v := ctx.Value(configKey{})
	if v == nil {
		return NewGrafanaCfg(nil)
	}

	cfg := v.(*GrafanaCfg)
	if cfg == nil {
		return NewGrafanaCfg(nil)
	}

	return cfg
}

// WithGrafanaConfig injects supplied Grafana config into context.
func WithGrafanaConfig(ctx context.Context, cfg *GrafanaCfg) context.Context {
	ctx = context.WithValue(ctx, configKey{}, cfg)
	return ctx
}

type GrafanaCfg struct {
	config map[string]string
}

func NewGrafanaCfg(cfg map[string]string) *GrafanaCfg {
	return &GrafanaCfg{config: cfg}
}

func (c *GrafanaCfg) Get(key string) string {
	return c.config[key]
}

func (c *GrafanaCfg) FeatureToggles() FeatureToggles {
	features, exists := c.config[featuretoggles.EnabledFeatures]
	if !exists || features == "" {
		return FeatureToggles{}
	}

	fs := strings.Split(features, ",")
	enabledFeatures := make(map[string]struct{}, len(fs))
	for _, f := range fs {
		enabledFeatures[f] = struct{}{}
	}

	return FeatureToggles{
		enabled: enabledFeatures,
	}
}

func (c *GrafanaCfg) Equal(c2 *GrafanaCfg) bool {
	if c == nil && c2 == nil {
		return true
	}
	if c == nil || c2 == nil {
		return false
	}

	if len(c.config) != len(c2.config) {
		return false
	}
	for k, v1 := range c.config {
		if v2, ok := c2.config[k]; !ok || v1 != v2 {
			return false
		}
	}
	return true
}

type FeatureToggles struct {
	// enabled is a set-like map of feature flags that are enabled.
	enabled map[string]struct{}
}

// IsEnabled returns true if feature f is contained in ft.enabled.
func (ft FeatureToggles) IsEnabled(f string) bool {
	_, exists := ft.enabled[f]
	return exists
}

type Proxy struct {
	clientCfg *proxy.ClientCfg
}

func (c *GrafanaCfg) proxy() Proxy {
	if v, exists := c.config[proxy.PluginSecureSocksProxyEnabled]; exists && v == strconv.FormatBool(true) {
		return Proxy{
			clientCfg: &proxy.ClientCfg{
				ClientCert:   c.Get(proxy.PluginSecureSocksProxyClientCert),
				ClientKey:    c.Get(proxy.PluginSecureSocksProxyClientKey),
				RootCA:       c.Get(proxy.PluginSecureSocksProxyRootCACert),
				ProxyAddress: c.Get(proxy.PluginSecureSocksProxyProxyAddress),
				ServerName:   c.Get(proxy.PluginSecureSocksProxyServerName),
			},
		}
	}
	return Proxy{}
}
