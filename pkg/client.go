package main

import (
	"bytes"
	"errors"
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"io/ioutil"
	"net/http"
	"net/url"
	"time"
)

type ClickHouseClient struct {
	settings *DatasourceSettings
}

// TODO add https support
func (client *ClickHouseClient) Query(query string) (*Response, error) {

	onErr := func(err error) (*Response, error) {
		backend.Logger.Error(fmt.Sprintf("clickhouse client query error: %w", err))
		return nil, err
	}

	datasourceUrl, err := url.Parse(client.settings.URL)
	if err != nil {
		return onErr(fmt.Errorf("unable to parse clickhouse dataSourceUrl: %w", err))
	}

	httpClient := &http.Client{}

	req, err := http.NewRequest(
		"POST",
		datasourceUrl.String(),
		bytes.NewBufferString(query))
	if err != nil {
		return onErr(err)
	}

	req.Header.Set("X-ClickHouse-User", client.settings.Username)
	req.Header.Set("X-ClickHouse-Key", client.settings.Secure.Password)

	resp, err := httpClient.Do(req)
	if err != nil {
		return onErr(err)
	}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return onErr(err)
	}

	if resp.StatusCode != 200 {
		return onErr(errors.New(string(body)))
	}

	var jsonResp = Response{}
	jsonErr := parseJson(body, &jsonResp)
	if jsonErr != nil {
		return onErr(jsonErr)
	}

	return &jsonResp, nil
}

func (client *ClickHouseClient) FetchTimeZone() *time.Location {
	res, err := client.Query(TimeZoneQuery)

	if err == nil && res != nil && len(res.Data) > 0 && res.Data[0] != nil {
		return ParseTimeZone(fmt.Sprintf("%v", res.Data[0][TimeZoneFieldName]))
	}

	return time.UTC
}
