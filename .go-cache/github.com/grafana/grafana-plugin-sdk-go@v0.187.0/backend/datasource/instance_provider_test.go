package datasource

import (
	"context"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/stretchr/testify/require"
)

func TestInstanceProvider(t *testing.T) {
	type testInstance struct {
		value string
	}
	ip := NewInstanceProvider(func(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
		return testInstance{value: "hello"}, nil
	})

	t.Run("When data source instance settings not provided should return error", func(t *testing.T) {
		_, err := ip.GetKey(context.Background(), backend.PluginContext{})
		require.Error(t, err)
	})

	t.Run("When data source instance settings provided should return expected key", func(t *testing.T) {
		key, err := ip.GetKey(context.Background(), backend.PluginContext{
			DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
				ID: 4,
			},
		})
		require.NoError(t, err)
		require.Equal(t, int64(4), key)
	})

	t.Run("When both the configuration and updated field of current data source instance settings are equal to the cache, should return false", func(t *testing.T) {
		config := map[string]string{
			"foo": "bar",
			"baz": "qux",
		}

		curSettings := backend.PluginContext{
			DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
				Updated: time.Now(),
			},
			GrafanaConfig: backend.NewGrafanaCfg(config),
		}

		cachedSettings := backend.PluginContext{
			DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
				Updated: curSettings.DataSourceInstanceSettings.Updated,
			},
			GrafanaConfig: backend.NewGrafanaCfg(config),
		}

		cachedInstance := instancemgmt.CachedInstance{
			PluginContext: cachedSettings,
		}
		needsUpdate := ip.NeedsUpdate(context.Background(), curSettings, cachedInstance)
		require.False(t, needsUpdate)
	})

	t.Run("When either the config or updated field of current data source instance settings are not equal to the cache, should return tru", func(t *testing.T) {
		curSettings := backend.PluginContext{
			DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
				Updated: time.Now(),
			},
		}
		cachedSettings := backend.PluginContext{
			DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
				Updated: curSettings.DataSourceInstanceSettings.Updated.Add(time.Second),
			},
		}

		cachedInstance := instancemgmt.CachedInstance{
			PluginContext: cachedSettings,
		}
		needsUpdate := ip.NeedsUpdate(context.Background(), curSettings, cachedInstance)
		require.True(t, needsUpdate)

		t.Run("Should return true when cached config is changed", func(t *testing.T) {
			curSettings.GrafanaConfig = backend.NewGrafanaCfg(map[string]string{
				"foo": "true",
			})

			cachedSettings.GrafanaConfig = backend.NewGrafanaCfg(map[string]string{
				"foo": "false",
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
			DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{},
		})
		require.NoError(t, err)
		require.NotNil(t, i)
		require.Equal(t, "hello", i.(testInstance).value)
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
					DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{},
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{},
					},
				},
			},
			expected: false,
		},
		{
			name: "Instance settings with identical updated field should return false",
			args: args{
				pluginContext: backend.PluginContext{
					DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
						Updated: ts,
					},
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
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
					DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
						Updated: ts,
					},
					GrafanaConfig: backend.NewGrafanaCfg(map[string]string{
						"foo": "bar",
						"baz": "qux",
					}),
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
							Updated: ts,
						},
						GrafanaConfig: backend.NewGrafanaCfg(map[string]string{
							"baz": "qux",
							"foo": "bar",
						}),
					},
				},
			},
			expected: false,
		},
		{
			name: "Instance settings with different updated field should return true",
			args: args{
				pluginContext: backend.PluginContext{
					DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
						Updated: ts,
					},
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
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
					DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
						Updated: ts,
					},
					GrafanaConfig: backend.NewGrafanaCfg(map[string]string{
						"foo": "bar",
					}),
				},
				cachedInstance: instancemgmt.CachedInstance{
					PluginContext: backend.PluginContext{
						DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
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
