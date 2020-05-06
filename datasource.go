package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"golang.org/x/net/context"

	"github.com/bitly/go-simplejson"
	"github.com/grafana/grafana-plugin-model/go/datasource"
	plugin "github.com/hashicorp/go-plugin"
	"golang.org/x/net/context/ctxhttp"
)

var httpClient = &http.Client{}

type ClickhouseDatasource struct {
	plugin.NetRPCUnsupportedPlugin
}

func (t *ClickhouseDatasource) Query(ctx context.Context, req *datasource.DatasourceRequest) (r *datasource.DatasourceResponse, err error) {
	// catch all panics and override err return value
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("clickhouse plugin panicked: %#w", r)
		}
	}()

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
	body := ""
	method := http.MethodGet
	headers := http.Header{}
	url, err := url.Parse(req.Datasource.Url)
	if err != nil {
		return nil, fmt.Errorf("unable to parse clickhouse url: %w", err)
	}

	params := url.Query()
	params.Add("query", query+" FORMAT JSON")

	// TODO Fix basic authorization. We have access to basicAuthPassword but not
	// the basic auth name. Users will have to use the useYandexCloudAuthorization
	// option instead for clickhouse auth.
	secureOptions := req.Datasource.DecryptedSecureJsonData
	options := make(map[string]interface{})
	err = json.Unmarshal([]byte(req.Datasource.JsonData), &options)
	if err != nil {
		return nil, fmt.Errorf("unable to parse clickhouse options: %w", err)
	}

	for k, v := range options {
		switch k {
		case "usePOST":
			method = http.MethodPost
			params.Del("query")
			body = query
			break
		case "defaultDatabase":
			db, _ := v.(string)
			params.Add("database", db)
			break
		case "addCorsHeaders":
			params.Add("add_http_cors_header", "1")
			break
		case "useYandexCloudAuthorization":
			chUser := ""
			chKey := ""

			if user, ok := options["xHeaderUser"]; ok {
				chUser, _ = user.(string)
			}

			if key, ok := secureOptions["xHeaderKey"]; ok {
				chKey = key
			}

			headers.Add("X-ClickHouse-User", chUser)
			headers.Add("X-ClickHouse-Key", chKey)
			break
		default:
			if strings.HasPrefix(k, "httpHeaderName") {
				headerKey := strings.Replace(k, "Name", "Value", 1)
				value := ""
				name, _ := v.(string)
				if hv, ok := secureOptions[headerKey]; ok {
					value = hv
				}

				return nil, fmt.Errorf("parse key %s", k)

				headers.Add(name, value)
			}
			break
		}
	}

	url.RawQuery = params.Encode()
	request, err := http.NewRequest(method, url.String(), bytes.NewBufferString(body))	
	if err != nil {
		return nil, err
	}

	request.Header = headers
	return request, nil
}

func parseResponse(body []byte, refId string) (*datasource.DatasourceResponse, error) {
	parsedBody := ClickHouseResponse{}
	err := json.Unmarshal(body, &parsedBody)
	if err != nil {
		return nil, fmt.Errorf("unable to parse response json: %s: %w", body, err)
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
				timestamp, err := strconv.ParseInt(dataPoint["t"], 10, 64)
				if err != nil {
					return nil, fmt.Errorf("unable to parse timestamp with alias t: %w", err)
				}

				point, err := strconv.ParseFloat(v, 64)
				if err != nil {
					return nil, fmt.Errorf("unable to parse value for '%s': %w", k, err)
				}

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
