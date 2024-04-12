package app

import (
	"context"
	"errors"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/internal/tenant"
)

// InstanceFactoryFunc factory method for creating app instances.
type InstanceFactoryFunc func(ctx context.Context, settings backend.AppInstanceSettings) (instancemgmt.Instance, error)

// NewInstanceManager creates a new app instance manager,
//
// This is a helper method for calling NewInstanceProvider and creating a new instancemgmt.InstanceProvider,
// and providing that to instancemgmt.New.
func NewInstanceManager(fn InstanceFactoryFunc) instancemgmt.InstanceManager {
	ip := NewInstanceProvider(fn)
	return instancemgmt.New(ip)
}

// NewInstanceProvider create a new app instance provider,
//
// The instance provider is responsible for providing cache keys for application instances,
// creating new instances when needed and invalidating cached instances when they have been
// updated in Grafana.
// Cache key is based on the app plugin identifier, and the numeric Grafana organization ID.
// If fn is nil, NewInstanceProvider panics.
func NewInstanceProvider(fn InstanceFactoryFunc) instancemgmt.InstanceProvider {
	if fn == nil {
		panic("fn cannot be nil")
	}

	return &instanceProvider{
		factory: fn,
	}
}

type instanceProvider struct {
	factory InstanceFactoryFunc
}

func (ip *instanceProvider) GetKey(ctx context.Context, pluginContext backend.PluginContext) (interface{}, error) {
	if pluginContext.AppInstanceSettings == nil {
		return nil, errors.New("app instance settings cannot be nil")
	}

	// The instance key generated for app plugins should include both plugin ID, and the OrgID, since for a single
	// Grafana instance there might be different orgs using the same plugin.
	defaultKey := fmt.Sprintf("%s#%v", pluginContext.PluginID, pluginContext.OrgID)
	if tID := tenant.IDFromContext(ctx); tID != "" {
		return fmt.Sprintf("%s#%s", tID, defaultKey), nil
	}

	return defaultKey, nil
}

func (ip *instanceProvider) NeedsUpdate(_ context.Context, pluginContext backend.PluginContext, cachedInstance instancemgmt.CachedInstance) bool {
	curConfig := pluginContext.GrafanaConfig
	cachedConfig := cachedInstance.PluginContext.GrafanaConfig
	configUpdated := !cachedConfig.Equal(curConfig)

	cachedAppSettings := cachedInstance.PluginContext.AppInstanceSettings
	curAppSettings := pluginContext.AppInstanceSettings
	appUpdated := !curAppSettings.Updated.Equal(cachedAppSettings.Updated)

	return appUpdated || configUpdated
}

func (ip *instanceProvider) NewInstance(ctx context.Context, pluginContext backend.PluginContext) (instancemgmt.Instance, error) {
	return ip.factory(ctx, *pluginContext.AppInstanceSettings)
}
