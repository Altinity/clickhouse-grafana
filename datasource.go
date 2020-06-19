package main

// See https://github.com/grafana/grafana/blob/master/docs/sources/developers/plugins/backend.md for
// details on grafana backend plugins

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"net/http"
	"net/url"
	"reflect"
	"runtime/debug"
	"strconv"
	"strings"

	"github.com/bitly/go-simplejson"
	"github.com/grafana/grafana-plugin-model/go/datasource"
	"github.com/hashicorp/go-plugin"
	"golang.org/x/net/context"
	"golang.org/x/net/context/ctxhttp"
)

var httpClient = &http.Client{}

type ClickhouseDatasource struct {
	plugin.NetRPCUnsupportedPlugin
}

func (t *ClickhouseDatasource) Query(ctx context.Context, req *datasource.DatasourceRequest) (r *datasource.DatasourceResponse, err error) {
	// catch all panics and override err return value
	defer func() {
		if panicMsg := recover(); panicMsg != nil {
			err = fmt.Errorf("clickhouse plugin panicked: %+v stacktrace:\n%s", panicMsg, debug.Stack())
		}
	}()

	refId := req.Queries[0].RefId
	modelJson, err := simplejson.NewJson([]byte(req.Queries[0].ModelJson))
	if err != nil {
		return nil, fmt.Errorf("unable to parse query: %w", err)
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
	defer func() {
		if err := response.Body.Close(); err!=nil {
			log.Fatal("can't close HTTP Response body")
		}
	}()

	// Body must be drained and closed on each request as per the docs: https://golang.org/pkg/net/http/#Client.Do
	// otherwise the http client connection cannot be reused
	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid status code. status: %v", response.Status)
	}

	return parseResponse(body, refId)
}

func createRequest(req *datasource.DatasourceRequest, query string) (*http.Request, error) {
	body := ""
	method := http.MethodGet
	headers := http.Header{}
	dataSourceUrl, err := url.Parse(req.Datasource.Url)
	if err != nil {
		return nil, fmt.Errorf("unable to parse clickhouse dataSourceUrl: %w", err)
	}

	params := dataSourceUrl.Query()
	params.Add("query", query+" FORMAT JSON")

	/*
	 Note: The current plugins model does not support basic authorization.
	 We have access to basicAuthPassword but not the basic auth name. Users
	 will have to use the useYandexCloudAuthorization
	 option instead for clickhouse auth.
	 This will be necessary until the new grafana plugin model becomes available:
	 https://github.com/grafana/grafana-plugin-sdk-go
	*/
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
			if user, ok := options["xHeaderUser"]; ok {
				chUser, _ := user.(string)
				headers.Add("X-ClickHouse-User", chUser)
			}

			if key, ok := options["xHeaderKey"]; ok {
				chKey, _ := key.(string)
				headers.Add("X-ClickHouse-Key", chKey)
			}
			break
		default:
			if strings.HasPrefix(k, "httpHeaderName") {
				headerKey := strings.Replace(k, "Name", "Value", 1)
				value := ""
				name, _ := v.(string)
				if hv, ok := secureOptions[headerKey]; ok {
					value = hv
				}

				headers.Add(name, value)
			}
			break
		}
	}

	dataSourceUrl.RawQuery = params.Encode()
	request, err := http.NewRequest(method, dataSourceUrl.String(), bytes.NewBufferString(body))
	if err != nil {
		return nil, err
	}

	request.Header = headers
	return request, nil
}

var floatType = reflect.TypeOf(float64(0))
var stringType = reflect.TypeOf("")

func parseFloat64(v interface{}) (float64, error) {
	switch i := v.(type) {
	case string:
		return strconv.ParseFloat(i, 64)
	case float64:
		return i, nil
	case float32:
		return float64(i), nil
	case int64:
		return float64(i), nil
	case int32:
		return float64(i), nil
	case int:
		return float64(i), nil
	case uint64:
		return float64(i), nil
	case uint32:
		return float64(i), nil
	case uint:
		return float64(i), nil
	default:
		tv := reflect.ValueOf(i)
		tv = reflect.Indirect(tv)
		if tv.Type().ConvertibleTo(floatType) {
			fv := tv.Convert(floatType)
			return fv.Float(), nil
		} else if tv.Type().ConvertibleTo(stringType) {
			sv := tv.Convert(stringType)
			s := sv.String()
			return strconv.ParseFloat(s, 64)
		} else {
			return math.NaN(), fmt.Errorf("can't convert %v to float64", tv.Type())
		}
	}
}

func parseResponse(body []byte, refId string) (*datasource.DatasourceResponse, error) {

	parsedBody := ClickHouseResponse{}
	err := json.Unmarshal(body, &parsedBody)
	if err != nil {
		return nil, fmt.Errorf("unable to parse response json: %s: %w", body, err)
	}

	seriesMap := map[string]*datasource.TimeSeries{}
	metaTypesMap := map[string]string{}
	// expect first column as timestamp
	tsMetaName := parsedBody.Meta[0].Name
	for _, meta := range parsedBody.Meta {
		if meta.Name != tsMetaName && !strings.HasPrefix(meta.Type,"Array(Tuple("){
			seriesMap[meta.Name] = &datasource.TimeSeries{Name: meta.Name, Points: []*datasource.Point{}}
		}
		metaTypesMap[meta.Name] = meta.Type
	}

	for _, dataPoint := range parsedBody.Data {
		timestamp, err := strconv.ParseInt(dataPoint[tsMetaName].(string), 10, 64)
		if err != nil {
			return nil, fmt.Errorf("unable to parse timestamp with alias t: %w", err)
		}
		for k, v := range dataPoint {
			if k != tsMetaName {
				var point float64
				var err error

				if !strings.HasPrefix(metaTypesMap[k],"Array(Tuple(") {

					point, err = parseFloat64(v)
					if err != nil {
						return nil, fmt.Errorf("unable to parse value %v for '%s': %w", v, k, err)
					}

					seriesMap[k].Points = append(seriesMap[k].Points, &datasource.Point{
						Timestamp: timestamp,
						Value:     point,
					})
				} else {
					var arrayOfTuples [][]string
					switch arrays := v.(type) {
					case []interface{}:
						for _, array := range arrays {
							switch tuple := array.(type) {
							case []interface{}:
								var t []string
								for _, s := range tuple {
									t = append(t, fmt.Sprintf("%v",s))
								}
								arrayOfTuples = append(arrayOfTuples, t)
							default:
								return nil, fmt.Errorf("unable to parse data section type=%T in response json: %s", tuple, tuple)
							}
						}
					default:
						return nil, fmt.Errorf("unable to parse data section type=%T in response json: %s", v, v)
					}
					for _, tuple := range arrayOfTuples {
						tsName := tuple[0]
						tsValue := tuple[1]
						ts, isExists := seriesMap[tsName]
						if !isExists {
							ts = &datasource.TimeSeries{Name: tsName, Points: []*datasource.Point{}}
							seriesMap[tsName] = ts
						}
						point, err = parseFloat64(tsValue)
						if err != nil {
							return nil, fmt.Errorf("unable to parse value %v for '%s': %w", tsValue, tsName, err)
						}
						ts.Points = append(ts.Points, &datasource.Point{
							Timestamp: timestamp,
							Value: point,
						})
					}
				}
			}
		}
	}

	var series []*datasource.TimeSeries
	for _, timeSeries := range seriesMap {
		series = append(series, timeSeries)
	}

	metaJSON, _ := json.Marshal(parsedBody.Meta)
	return &datasource.DatasourceResponse{
		Results: []*datasource.QueryResult{
			{
				Series:   series,
				RefId:    refId,
				MetaJson: string(metaJSON),
			},
		},
	}, nil
}


type ClickHouseResponse struct {
	Meta []ClickHouseMeta
	Data []map[string]interface{}
	Rows int
}

type ClickHouseMeta struct {
	Name string
	Type string
}
