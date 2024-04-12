package app

import (
	"context"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/stretchr/testify/require"
)

const (
	testAppPluginID = "super-app-plugin"
	testOrgID       = 42
)

func TestInstanceProvider(t *testing.T) {
	type testInstance struct {
		value string
	}
	ip := NewInstanceProvider(func(ctx context.Context, settings backend.AppInstanceSettings) (instancemgmt.Instance, error) {
		return testInstance{value: "what an app"}, nil
	})

	t.Run("When app instance settings not provided should return error", func(t *testing.T) {
		_, err := ip.GetKey(context.Background(), backend.PluginContext{})
		require.Error(t, err)
	})

	t.Run("When app instance settings provided should return expected key", func(t *testing.T) {
		key, err := ip.GetKey(context.Background(), backend.PluginContext{
			PluginID:            testAppPluginID,
			OrgID:               testOrgID,
			AppInstanceSettings: &backend.AppInstanceSettings{},
		})
		require.NoError(t, err)
		require.Equal(t, "super-app-plugin#42", key)
	})

	t.Run("When both the configuration and updated field of current app instance settings are equal to the cache, should return false", func(t *testing.T) {
		config := map[string]string{
			"foo": "bar",
		}

		curSettings := backend.PluginContext{
			AppInstanceSettings: &backend.AppInstanceSettings{
				Updated: time.Now(),
			},
			GrafanaConfig: backend.NewGrafanaCfg(config),
		}

		cachedSettings := backend.PluginContext{
			AppInstanceSettings: &backend.AppInstanceSettings{
				Updated: curSettings.AppInstanceSettings.Updated,
			},
			GrafanaConfig: backend.NewGrafanaCfg(config),
		}

		cachedInstance := instancemgmt.CachedInstance{
			PluginContext: cachedSettings,
		}
		needsUpdate := ip.NeedsUpdate(context.Background(), curSettings, cachedInstance)
		require.False(t, needsUpdate)
	})

	t.Run("When either the config or updated field of current app instance settings are not equal to the cache, should return true", func(t *testing.T) {
		curSettings := backend.PluginContext{
			AppInstanceSettings: &backend.AppInstanceSettings{
				Updated: time.Now(),
			},
		}

		cachedSettings := backend.PluginContext{
			AppInstanceSettings: &backend.AppInstanceSettings{
				Updated: curSettings.AppInstanceSettings.Updated.Add(time.Second),
			},
		}

		cachedInstance := instancemgmt.CachedInstance{
			PluginContext: cachedSettings,
		}
		needsUpdate := ip.NeedsUpdate(context.Background(), curSettings, cachedInstance)
		require.True(t, needsUpdate)

		t.Run("Should return true when cached config is changed", func(t *testing.T) {
			curSettings.GrafanaConfig = backend.NewGrafanaCfg(map[string]string{
				"foo": "bar",
			})

			cachedSettings.GrafanaConfig = backend.NewGrafanaCfg(map[string]string{
				"baz": "qux",
			})

			cachedInstance = instancemgmt.CachedInstance{
				PluginContext: cachedSettings,
			}
			needsUpdate = ip.NeedsUpdate(context.Background(), curSettings, cachedInstance)
			require.True(t, needsUpdate)
		})
	})

	t.Run("When creating a new instance should return expected instance", func(t *testing.T) {
		i, err := ip.NewInstance(context.Background(), backend.PluginContext{
			PluginID:            testAppPluginID,
			OrgID:               testOrgID,
			AppInstanceSettings: &backend.AppInstanceSettings{},
		})
		require.NoError(t, err)
		require.NotNil(t, i)
		require.Equal(t, "what an app", i.(testInstance).value)
	})
}

func Test_instanceProvider_NeedsUpdate(t *testing.T) {
	ts := time.Now()

	type args struct {
		pluginContext  backend.PluginContext
		cachedInstance instancemgmt.CachedInstance
	}
	tests := []struct {
		name     string
		args     args
		expected bool
	}{
		{
			name: "Empty instance settings should return false",
			args: args{
				pluginContext: backend.PluginContext{
					AppInstanceSettings: &backend.AppInstanceSettings{},
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						AppInstanceSettings: &backend.AppInstanceSettings{},
					},
				},
			},
			expected: false,
		},
		{
			name: "Instance settings with identical updated field should return false",
			args: args{
				pluginContext: backend.PluginContext{
					AppInstanceSettings: &backend.AppInstanceSettings{
						Updated: ts,
					},
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						AppInstanceSettings: &backend.AppInstanceSettings{
							Updated: ts,
						},
					},
				},
			},
			expected: false,
		},
		{
			name: "Instance settings with identical updated field and config should return false",
			args: args{
				pluginContext: backend.PluginContext{
					AppInstanceSettings: &backend.AppInstanceSettings{
						Updated: ts,
					},
					GrafanaConfig: backend.NewGrafanaCfg(map[string]string{"foo": "bar", "baz": "qux"}),
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						AppInstanceSettings: &backend.AppInstanceSettings{
							Updated: ts,
						},
						GrafanaConfig: backend.NewGrafanaCfg(map[string]string{"foo": "bar", "baz": "qux"}),
					},
				},
			},
			expected: false,
		},
		{
			name: "Instance settings with different updated field should return true",
			args: args{
				pluginContext: backend.PluginContext{
					AppInstanceSettings: &backend.AppInstanceSettings{
						Updated: ts,
					},
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						AppInstanceSettings: &backend.AppInstanceSettings{
							Updated: ts.Add(time.Millisecond),
						},
					},
				},
			},
			expected: true,
		},
		{
			name: "Instance settings with identical updated field and different config should return true",
			args: args{
				pluginContext: backend.PluginContext{
					AppInstanceSettings: &backend.AppInstanceSettings{
						Updated: ts,
					},
					GrafanaConfig: backend.NewGrafanaCfg(map[string]string{"foo": "bar"}),
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						AppInstanceSettings: &backend.AppInstanceSettings{
							Updated: ts,
						},
					},
				},
			},
			expected: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ip := &instanceProvider{}
			if got := ip.NeedsUpdate(context.Background(), tt.args.pluginContext, tt.args.cachedInstance); got != tt.expected {
				t.Errorf("NeedsUpdate() = %v, expected %v", got, tt.expected)
			}
		})
	}
}
