package backend

import (
	"context"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/backend/proxy"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAppInstanceSettings(t *testing.T) {
	t.Run("HTTPClientOptions() should translate settings as expected", func(t *testing.T) {
		tcs := []struct {
			instanceSettings      *AppInstanceSettings
			expectedClientOptions httpclient.Options
		}{
			{
				instanceSettings:      &AppInstanceSettings{},
				expectedClientOptions: httpclient.Options{},
			},
			{
				instanceSettings: &AppInstanceSettings{
					JSONData: []byte("{ \"key\": \"value\" }"),
					DecryptedSecureJSONData: map[string]string{
						"sKey": "sValue",
					},
				},
				expectedClientOptions: httpclient.Options{
					CustomOptions: map[string]interface{}{
						dataCustomOptionsKey: map[string]interface{}{
							"key": "value",
						},
						secureDataCustomOptionsKey: map[string]string{
							"sKey": "sValue",
						},
					},
				},
			},
		}

		for _, tc := range tcs {
			opts, err := tc.instanceSettings.HTTPClientOptions(context.Background())
			assert.NoError(t, err)
			if tc.expectedClientOptions.BasicAuth != nil {
				assert.Equal(t, tc.expectedClientOptions.BasicAuth, opts.BasicAuth)
			} else {
				assert.Nil(t, opts.BasicAuth)
			}

			if tc.expectedClientOptions.Labels != nil {
				assert.Equal(t, tc.expectedClientOptions.Labels, opts.Labels)
			}

			jsonData := JSONDataFromHTTPClientOptions(opts)
			expectedJSONData := JSONDataFromHTTPClientOptions(tc.expectedClientOptions)
			secureJSONData := SecureJSONDataFromHTTPClientOptions(opts)
			expectedSecureJSONData := SecureJSONDataFromHTTPClientOptions(tc.expectedClientOptions)

			if len(tc.expectedClientOptions.CustomOptions) > 0 {
				assert.Equal(t, tc.expectedClientOptions.CustomOptions, opts.CustomOptions)
				assert.Equal(t, expectedJSONData, jsonData)
				assert.Equal(t, expectedSecureJSONData, secureJSONData)
			} else {
				assert.Empty(t, opts.CustomOptions)
				assert.Empty(t, jsonData)
				assert.Empty(t, secureJSONData)
			}
		}
	})
}

func TestDataSourceInstanceSettings(t *testing.T) {
	t.Run("HTTPClientOptions() should translate settings as expected", func(t *testing.T) {
		tcs := []struct {
			instanceSettings      *DataSourceInstanceSettings
			expectedClientOptions httpclient.Options
		}{
			{
				instanceSettings:      &DataSourceInstanceSettings{},
				expectedClientOptions: httpclient.Options{},
			},
			{
				instanceSettings: &DataSourceInstanceSettings{
					Name:             "ds1",
					UID:              "uid1",
					User:             "user",
					Type:             "example-datasource",
					JSONData:         []byte("{}"),
					BasicAuthEnabled: true,
					BasicAuthUser:    "buser",
					DecryptedSecureJSONData: map[string]string{
						"basicAuthPassword": "bpwd",
						"password":          "pwd",
					},
				},
				expectedClientOptions: httpclient.Options{
					BasicAuth: &httpclient.BasicAuthOptions{
						User:     "buser",
						Password: "bpwd",
					},
					Labels: map[string]string{
						"datasource_name": "ds1",
						"datasource_uid":  "uid1",
						"datasource_type": "example-datasource",
					},
					CustomOptions: map[string]interface{}{
						dataCustomOptionsKey: map[string]interface{}{},
						secureDataCustomOptionsKey: map[string]string{
							"basicAuthPassword": "bpwd",
							"password":          "pwd",
						},
					},
				},
			},
			{
				instanceSettings: &DataSourceInstanceSettings{
					Name:             "ds2",
					UID:              "uid2",
					Type:             "example-datasource-2",
					User:             "user",
					JSONData:         []byte("{}"),
					BasicAuthEnabled: false,
					BasicAuthUser:    "buser",
					DecryptedSecureJSONData: map[string]string{
						"basicAuthPassword": "bpwd",
						"password":          "pwd",
					},
				},
				expectedClientOptions: httpclient.Options{
					BasicAuth: &httpclient.BasicAuthOptions{
						User:     "user",
						Password: "pwd",
					},
					Labels: map[string]string{
						"datasource_name": "ds2",
						"datasource_uid":  "uid2",
						"datasource_type": "example-datasource-2",
					},
					CustomOptions: map[string]interface{}{
						dataCustomOptionsKey: map[string]interface{}{},
						secureDataCustomOptionsKey: map[string]string{
							"basicAuthPassword": "bpwd",
							"password":          "pwd",
						},
					},
				},
			},
			{
				instanceSettings: &DataSourceInstanceSettings{
					JSONData: []byte("{ \"key\": \"value\" }"),
					DecryptedSecureJSONData: map[string]string{
						"sKey": "sValue",
					},
				},
				expectedClientOptions: httpclient.Options{
					CustomOptions: map[string]interface{}{
						dataCustomOptionsKey: map[string]interface{}{
							"key": "value",
						},
						secureDataCustomOptionsKey: map[string]string{
							"sKey": "sValue",
						},
					},
				},
			},
			{
				instanceSettings: &DataSourceInstanceSettings{
					UID:                     "uid1",
					JSONData:                []byte("{ \"enableSecureSocksProxy\": true }"),
					DecryptedSecureJSONData: map[string]string{},
				},
				expectedClientOptions: httpclient.Options{
					ProxyOptions: &proxy.Options{
						Enabled: true,
						Auth: &proxy.AuthOptions{
							Username: "uid1",
						},
					},
					CustomOptions: map[string]interface{}{
						dataCustomOptionsKey: map[string]interface{}{
							"enableSecureSocksProxy": true,
						},
						secureDataCustomOptionsKey: map[string]string{},
					},
				},
			},
		}

		for _, tc := range tcs {
			opts, err := tc.instanceSettings.HTTPClientOptions(context.Background())
			assert.NoError(t, err)
			if tc.expectedClientOptions.BasicAuth != nil {
				assert.Equal(t, tc.expectedClientOptions.BasicAuth, opts.BasicAuth)
			} else {
				assert.Nil(t, opts.BasicAuth)
			}

			if tc.expectedClientOptions.Labels != nil {
				assert.Equal(t, tc.expectedClientOptions.Labels, opts.Labels)
			}

			jsonData := JSONDataFromHTTPClientOptions(opts)
			expectedJSONData := JSONDataFromHTTPClientOptions(tc.expectedClientOptions)
			secureJSONData := SecureJSONDataFromHTTPClientOptions(opts)
			expectedSecureJSONData := SecureJSONDataFromHTTPClientOptions(tc.expectedClientOptions)

			if len(tc.expectedClientOptions.CustomOptions) > 0 {
				assert.Equal(t, tc.expectedClientOptions.CustomOptions, opts.CustomOptions)
				assert.Equal(t, expectedJSONData, jsonData)
				assert.Equal(t, expectedSecureJSONData, secureJSONData)
			} else {
				assert.Empty(t, opts.CustomOptions)
				assert.Empty(t, jsonData)
				assert.Empty(t, secureJSONData)
			}
		}
	})
}

func TestCustomOptions(t *testing.T) {
	t.Run("Should be able to extract JSONData and SecureJSONData from custom options", func(t *testing.T) {
		opts := &httpclient.Options{}
		expectedJSONData := map[string]interface{}{
			"key": "value",
		}
		expectedSecureJSONData := map[string]string{
			"sKey": "sValue",
		}
		setCustomOptionsFromHTTPSettings(opts, &HTTPSettings{
			JSONData:       expectedJSONData,
			SecureJSONData: expectedSecureJSONData,
		})

		jsonData := JSONDataFromHTTPClientOptions(*opts)
		secureJSONData := SecureJSONDataFromHTTPClientOptions(*opts)

		require.Equal(t, expectedJSONData, jsonData)
		require.Equal(t, expectedSecureJSONData, secureJSONData)
	})

	t.Run("Should be able to extract JSONData and SecureJSONData from custom options", func(t *testing.T) {
		opts := &httpclient.Options{
			CustomOptions: map[string]interface{}{},
		}
		incorrectJSONData := map[string]string{
			"key": "value",
		}
		incorrectSecureJSONData := map[string]interface{}{
			"sKey": "sValue",
		}
		opts.CustomOptions[dataCustomOptionsKey] = incorrectJSONData
		opts.CustomOptions[secureDataCustomOptionsKey] = incorrectSecureJSONData

		jsonData := JSONDataFromHTTPClientOptions(*opts)
		secureJSONData := SecureJSONDataFromHTTPClientOptions(*opts)

		require.Empty(t, jsonData)
		require.Empty(t, secureJSONData)
	})
}

func TestProxyOptions(t *testing.T) {
	t.Run("ProxyOptions() should translate settings as expected", func(t *testing.T) {
		tcs := []struct {
			instanceSettings      *DataSourceInstanceSettings
			proxyClientCfg        *proxy.ClientCfg
			expectedClientOptions *proxy.Options
		}{
			{
				instanceSettings:      &DataSourceInstanceSettings{},
				expectedClientOptions: nil,
			},
			{
				instanceSettings: &DataSourceInstanceSettings{
					Name:             "ds1",
					UID:              "uid1",
					User:             "user",
					Type:             "example-datasource",
					JSONData:         []byte("{ \"enableSecureSocksProxy\": false }"),
					BasicAuthEnabled: true,
					BasicAuthUser:    "buser",
				},
				expectedClientOptions: nil,
			},
			{
				instanceSettings: &DataSourceInstanceSettings{
					Name:             "ds1",
					UID:              "uid1",
					User:             "user",
					Type:             "example-datasource",
					JSONData:         []byte("{ \"enableSecureSocksProxy\": true }"),
					BasicAuthEnabled: true,
					BasicAuthUser:    "buser",
				},
				expectedClientOptions: &proxy.Options{
					Enabled: true,
					Auth: &proxy.AuthOptions{
						Username: "uid1",
					},
					Timeouts: &proxy.DefaultTimeoutOptions,
				},
			},
			{
				instanceSettings: &DataSourceInstanceSettings{
					Name:             "ds1",
					UID:              "uid1",
					User:             "user",
					Type:             "example-datasource",
					JSONData:         []byte("{ \"enableSecureSocksProxy\": true, \"secureSocksProxyUsername\": \"username\" }"),
					BasicAuthEnabled: true,
					BasicAuthUser:    "buser",
					DecryptedSecureJSONData: map[string]string{
						"secureSocksProxyPassword": "pswd",
					},
				},
				expectedClientOptions: &proxy.Options{
					Enabled: true,
					Auth: &proxy.AuthOptions{
						Username: "username",
						Password: "pswd",
					},
					Timeouts: &proxy.DefaultTimeoutOptions,
				},
			},
			{
				instanceSettings: &DataSourceInstanceSettings{
					Name:             "ds1",
					UID:              "uid1",
					User:             "user",
					Type:             "example-datasource",
					JSONData:         []byte("{ \"enableSecureSocksProxy\": true, \"timeout\": 10, \"keepAlive\": 15 }"),
					BasicAuthEnabled: true,
					BasicAuthUser:    "buser",
				},
				expectedClientOptions: &proxy.Options{
					Enabled: true,
					Auth: &proxy.AuthOptions{
						Username: "uid1",
					},
					Timeouts: &proxy.TimeoutOptions{
						KeepAlive: time.Second * 15,
						Timeout:   time.Second * 10,
					},
				},
			},
			{
				instanceSettings: &DataSourceInstanceSettings{
					Name:             "ds1",
					UID:              "uid1",
					User:             "user",
					Type:             "example-datasource",
					JSONData:         []byte("{ \"enableSecureSocksProxy\": true, \"timeout\": 10, \"keepAlive\": 15 }"),
					BasicAuthEnabled: true,
					BasicAuthUser:    "buser",
				},
				proxyClientCfg: &proxy.ClientCfg{
					ClientCert:   "<client-cert>",
					ClientKey:    "123abc",
					RootCA:       "<root-ca-cert>",
					ProxyAddress: "10.1.2.3",
					ServerName:   "grafana-server",
				},
				expectedClientOptions: &proxy.Options{
					Enabled: true,
					Auth: &proxy.AuthOptions{
						Username: "uid1",
					},
					Timeouts: &proxy.TimeoutOptions{
						KeepAlive: time.Second * 15,
						Timeout:   time.Second * 10,
					},
					ClientCfg: &proxy.ClientCfg{
						ClientCert:   "<client-cert>",
						ClientKey:    "123abc",
						RootCA:       "<root-ca-cert>",
						ProxyAddress: "10.1.2.3",
						ServerName:   "grafana-server",
					},
				},
			},
		}

		for _, tc := range tcs {
			opts, err := tc.instanceSettings.ProxyOptions(tc.proxyClientCfg)
			assert.NoError(t, err)
			assert.Equal(t, tc.expectedClientOptions, opts)
		}
	})
}
