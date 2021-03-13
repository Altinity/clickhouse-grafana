package main

import (
	"encoding/json"
	"fmt"
	
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
)

func NewDatasourceSettings(setting backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	var dsSettings = DatasourceSettings{}
	err := json.Unmarshal(setting.JSONData, &dsSettings)
	if err != nil {
		return nil, fmt.Errorf("Unable to parse json %s. Error: %w", setting.JSONData, err)
	}

	dsSettings.URL = setting.URL

	// Set settings object?
	return &dsSettings, nil
}

type SecureSettings struct {
	Password string `json:"password"`
}

type DatasourceSettings struct {
	URL      string
	Username string         `json:"username"`
	Secure   SecureSettings `json:"secureJsonData"`
}

func (s *DatasourceSettings) Dispose() {}
