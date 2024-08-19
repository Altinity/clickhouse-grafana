package main

import (
	"context"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

func TestNewDatasourceSettings(t *testing.T) {
	ctx := context.Background()

	// Create a mock backend.DataSourceInstanceSettings
	settings := backend.DataSourceInstanceSettings{
		JSONData: []byte(`{
			"addCorsHeader": true,
			"defaultDatabase": "myDatabase",
			"usePOST": false,
			"useYandexCloudAuthorization": true,
			"xHeaderKey": "myKey",
			"xHeaderUser": "myUser",
			"useCompression": true,
			"compressionType": "gzip",
			"tlsSkipVerify": false,
			"httpHeaderName1": "header1",
			"httpHeaderValue1": "value1",
			"httpHeaderName2": "header2",
			"httpHeaderValue2": "value2"
		}`),
		DecryptedSecureJSONData: map[string]string{
			"httpHeaderValue1": "value1",
			"httpHeaderValue2": "value2",
		},
	}

	// Call the NewDatasourceSettings function
	instance, err := NewDatasourceSettings(ctx, settings)
	require.NoError(t, err)

	// Assert the instance type
	dsSettings, ok := instance.(*DatasourceSettings)
	require.True(t, ok)

	// Assert the instance fields
	require.Equal(t, true, dsSettings.AddCorsHeader)
	require.Equal(t, "myDatabase", dsSettings.DefaultDatabase)
	require.Equal(t, false, dsSettings.UsePost)
	require.Equal(t, true, dsSettings.UseYandexCloudAuthorization)
	require.Equal(t, "myKey", dsSettings.XHeaderKey)
	require.Equal(t, "myUser", dsSettings.XHeaderUser)
	require.Equal(t, true, dsSettings.UseCompression)
	require.Equal(t, "gzip", dsSettings.CompressionType)
	require.Equal(t, false, dsSettings.TLSSkipVerify)
	require.Equal(t, "header1", dsSettings.HttpHeaderName1)
	require.Equal(t, "value1", dsSettings.CustomHeaders["header1"])
	require.Equal(t, "header2", dsSettings.HttpHeaderName2)
	require.Equal(t, "value2", dsSettings.CustomHeaders["header2"])
}
