package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"

	"golang.org/x/net/context"

	"github.com/grafana/grafana-plugin-model/go/datasource"
	"github.com/grafana/grafana/pkg/components/simplejson"
	plugin "github.com/hashicorp/go-plugin"
	"golang.org/x/net/context/ctxhttp"
)

var httpClient = &http.Client{}

type ClickhouseDatasource struct {
	plugin.NetRPCUnsupportedPlugin
}

func (t *ClickhouseDatasource) Query(ctx context.Context, req *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {
	refId := req.Queries[0].RefId
	modelJson, err := simplejson.NewJson([]byte(req.Queries[0].ModelJson))
	if err != nil {
		return nil, err
	}
	
	query := modelJson.Get("rawQuery").MustString()
	request, err := createRequest(req, query)
	if err != nil {
		return nil, err
	}

	response, err := ctxhttp.Do(ctx, httpClient, request)
	if err != nil {
		return nil, err
	}

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid status code. status: %v", response.Status)
	}

	defer response.Body.Close()

	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	return parseResponse(body, refId)
}

func createRequest(req *datasource.DatasourceRequest, query string) (*http.Request, error) {
	escaped := url.QueryEscape(query + " FORMAT JSON")

	// TODO support other datasource options

	return http.NewRequest(http.MethodGet, fmt.Sprintf("%s/?query=%s", req.Datasource.Url, escaped), nil)
}

func parseResponse(body []byte, refId string) (*datasource.DatasourceResponse, error) {
	parsedBody := ClickHouseResponse{}
	err := json.Unmarshal(body, &parsedBody)
	if err != nil {
		return nil, err
	}

	seriesMap := map[string]*datasource.TimeSeries{}
	for _, meta := range parsedBody.Meta {
		if meta.Name != "t" {
			seriesMap[meta.Name] = &datasource.TimeSeries{Name: meta.Name, Points: []*datasource.Point{}}
		}
	}

	for _, dataPoint := range parsedBody.Data {
		for k, v := range dataPoint {
			if k != "t" {
				timestamp, _ := strconv.ParseInt(dataPoint["t"], 10, 64)
				point, _ := strconv.ParseFloat(v, 64)
				// TODO how to handle parsing error?

				seriesMap[k].Points = append(seriesMap[k].Points, &datasource.Point{
					Timestamp: timestamp,
					Value:     point,
				})
			}
		}
	}

	series := []*datasource.TimeSeries{}
	for _, timeSeries := range seriesMap {
		series = append(series, timeSeries)
	}

	metaJSON, _ := json.Marshal(parsedBody.Meta)
	return &datasource.DatasourceResponse{
		Results: []*datasource.QueryResult{
			&datasource.QueryResult{
				Series:   series,
				RefId:    refId,
				MetaJson: string(metaJSON),
			},
		},
	}, nil
}

type ClickHouseResponse struct {
	Meta []ClickHouseMeta
	Data []map[string]string
	Rows int
}

type ClickHouseMeta struct {
	Name string
	Type string
}
