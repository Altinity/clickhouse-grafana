package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
)

type DatasourceSettings struct {
	Instance backend.DataSourceInstanceSettings

	AddCorsHeader               bool   `json:"addCorsHeader"`
	DefaultDatabase             string `json:"defaultDatabase"`
	UsePost                     bool   `json:"usePOST"`
	UseYandexCloudAuthorization bool   `json:"useYandexCloudAuthorization"`
	XHeaderKey                  string `json:"xHeaderKey,omitempty"`
	XHeaderUser                 string `json:"xHeaderUser,omitempty"`
	UseCompression              bool   `json:"useCompression,omitempty"`
	CompressionType             string `json:"compressionType,omitempty"`
	TLSSkipVerify               bool   `json:"tlsSkipVerify"`

	CustomHeaders    map[string]string
	HttpHeaderName1  string `json:"httpHeaderName1,omitempty"`
	HttpHeaderName2  string `json:"httpHeaderName2,omitempty"`
	HttpHeaderName3  string `json:"httpHeaderName3,omitempty"`
	HttpHeaderName4  string `json:"httpHeaderName4,omitempty"`
	HttpHeaderName5  string `json:"httpHeaderName5,omitempty"`
	HttpHeaderName6  string `json:"httpHeaderName6,omitempty"`
	HttpHeaderName7  string `json:"httpHeaderName7,omitempty"`
	HttpHeaderName8  string `json:"httpHeaderName8,omitempty"`
	HttpHeaderName9  string `json:"httpHeaderName9,omitempty"`
	HttpHeaderName10 string `json:"httpHeaderName10,omitempty"`
}

func NewDatasourceSettings(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	var dsSettings = DatasourceSettings{}

	err := json.Unmarshal(settings.JSONData, &dsSettings)
	if err != nil {
		return nil, fmt.Errorf("unable to parse settings json %s. Error: %w", settings.JSONData, err)
	}

	dsSettings.CustomHeaders = make(map[string]string)
	for i := 1; i <= 11; i++ {
		headerName := ""
		switch i {
		case 1:
			headerName = dsSettings.HttpHeaderName1
		case 2:
			headerName = dsSettings.HttpHeaderName2
		case 3:
			headerName = dsSettings.HttpHeaderName3
		case 4:
			headerName = dsSettings.HttpHeaderName4
		case 5:
			headerName = dsSettings.HttpHeaderName5
		case 6:
			headerName = dsSettings.HttpHeaderName6
		case 7:
			headerName = dsSettings.HttpHeaderName7
		case 8:
			headerName = dsSettings.HttpHeaderName8
		case 9:
			headerName = dsSettings.HttpHeaderName9
		case 10:
			headerName = dsSettings.HttpHeaderName10
		case 11:
			return nil, fmt.Errorf("too many custom headers")
		}
		if headerName == "" {
			break
		}
		headerValue := settings.DecryptedSecureJSONData[fmt.Sprintf("httpHeaderValue%d", i)]
		dsSettings.CustomHeaders[headerName] = headerValue
	}

	dsSettings.Instance = settings

	return &dsSettings, nil
}

func (s *DatasourceSettings) Dispose() {}
