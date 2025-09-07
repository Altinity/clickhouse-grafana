package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
)

// TraceToMetricsTag represents a mapping from span attribute to metric label
type TraceToMetricsTag struct {
	Key   string `json:"key"`
	Value string `json:"value,omitempty"`
}

// TraceToMetricsQuery represents a predefined query template
type TraceToMetricsQuery struct {
	Name  string `json:"name"`
	Query string `json:"query"`
}

// TraceToMetricsOptions contains configuration for trace to metrics linking
type TraceToMetricsOptions struct {
	Enabled            bool                  `json:"enabled,omitempty"`
	DatasourceUID      string                `json:"datasourceUid,omitempty"`
	SpanStartTimeShift string                `json:"spanStartTimeShift,omitempty"`
	SpanEndTimeShift   string                `json:"spanEndTimeShift,omitempty"`
	Tags               []TraceToMetricsTag   `json:"tags,omitempty"`
	Queries            []TraceToMetricsQuery `json:"queries,omitempty"`
}

type DatasourceSettings struct {
	Instance backend.DataSourceInstanceSettings

	AddCorsHeader                 bool                   `json:"addCorsHeader"`
	DefaultDatabase               string                 `json:"defaultDatabase"`
	UsePost                       bool                   `json:"usePOST"`
	UseYandexCloudAuthorization   bool                   `json:"useYandexCloudAuthorization"`
	XHeaderKey                    string                 `json:"xHeaderKey,omitempty"`
	XHeaderUser                   string                 `json:"xHeaderUser,omitempty"`
	XClickHouseSSLCertificateAuth bool                   `json:"xClickHouseSSLCertificateAuth,omitempty"`
	UseCompression                bool                   `json:"useCompression,omitempty"`
	CompressionType               string                 `json:"compressionType,omitempty"`
	TLSSkipVerify                 bool                   `json:"tlsSkipVerify"`
	TracesToMetrics               *TraceToMetricsOptions `json:"tracesToMetrics,omitempty"`

	CustomHeaders map[string]string `json:"-,omitempty"`
}

func NewDatasourceSettings(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {

	var dsSettings = DatasourceSettings{}

	err := json.Unmarshal(settings.JSONData, &dsSettings)
	if err != nil {
		return nil, fmt.Errorf("unable to parse settings json %s. Error: %w", settings.JSONData, err)
	}

	dsSettings.CustomHeaders = make(map[string]string)

	var tmpMap = make(map[string]interface{})
	err = json.Unmarshal(settings.JSONData, &tmpMap)
	if err != nil {
		return nil, fmt.Errorf("unable to parse settings json %s. Error: %w", settings.JSONData, err)
	}

	for headerKey, value := range tmpMap {
		if len(headerKey) >= 14 && headerKey[:14] == "httpHeaderName" {
			headerName := value.(string)
			valueKey := strings.Replace(headerKey, "httpHeaderName", "httpHeaderValue", 1)
			if decryptedHeaderValue, exists := settings.DecryptedSecureJSONData[valueKey]; !exists {
				return nil, fmt.Errorf("%s not present in settings.DecryptedSecureJSONData", valueKey)
			} else {
				dsSettings.CustomHeaders[headerName] = decryptedHeaderValue
			}
		}
	}

	dsSettings.Instance = settings

	return &dsSettings, nil
}

func (s *DatasourceSettings) Dispose() {}
