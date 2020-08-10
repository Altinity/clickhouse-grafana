package main

// See https://github.com/grafana/grafana/blob/master/docs/sources/developers/plugins/backend.md for
// details on grafana backend plugins

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

type ClickHouseResponse struct {
	Meta []ClickHouseMeta
	Data []map[string]interface{}
	Rows int
}

type ClickHouseMeta struct {
	Name string
	Type string
}

type DataSourceMeta struct {
	Type  string
	Index int
}

var httpClient = &http.Client{}

func createRequest(req *backend.QueryDataRequest, query string) (*http.Request, error) {
	body := ""
	method := http.MethodGet
	headers := http.Header{}
	settings := req.PluginContext.DataSourceInstanceSettings
	dataSourceUrl, err := url.Parse(settings.URL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse clickhouse dataSourceUrl: %w", err)
	}

	if !strings.HasSuffix(strings.ToUpper(query), " FORMAT JSON") {
		query += " FORMAT JSON"
	}
	params := dataSourceUrl.Query()
	params.Add("query", query)

	// TODO: Update to support basic auth
	secureOptions := settings.DecryptedSecureJSONData
	options := make(map[string]interface{})
	err = json.Unmarshal([]byte(settings.JSONData), &options)
	if err != nil {
		return nil, fmt.Errorf("unable to parse clickhouse options: %w", err)
	}

	for k, v := range options {
		switch k {
		case "usePOST":
			if v.(bool) == true {
				method = http.MethodPost
				params.Del("query")
				body = query
			}
			break
		case "defaultDatabase":
			db, _ := v.(string)
			if db != "" {
				params.Add("database", db)
			}
			break
		case "addCorsHeaders":
			if v.(bool) == true {
				params.Add("add_http_cors_header", "1")
			}
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

func isTypeArrayTuple(t string) bool {
	return strings.HasPrefix(t, "Array(Tuple(")
}

func isTypeString(t string) bool {
	return strings.Contains(t, "String")
}

func clickhouseResponseToFrame(body []byte, query backend.DataQuery) (*data.Frame, error) {
	parsedBody := ClickHouseResponse{}
	err := json.Unmarshal(body, &parsedBody)
	if err != nil {
		return nil, fmt.Errorf("unable to parse response body: %s\n\n parsing error: %w", body, err)
	}

	metaTypesMap := map[string]DataSourceMeta{}
	// expect first column as timestamp
	timestampMetaName := parsedBody.Meta[0].Name

	// Create frame from clickhouse meta
	frame := data.NewFrame("Wide")

	// Parse clickhouse meta for field information
	fieldIdx := 0
	for _, meta := range parsedBody.Meta {
		metaTypesMap[meta.Name] = DataSourceMeta{
			Type:  meta.Type,
			Index: fieldIdx,
		}

		if meta.Name == timestampMetaName {
			frame.Fields = append(frame.Fields, data.NewField(meta.Name, nil, make([]time.Time, parsedBody.Rows)))
		} else {
			frame.Fields = append(frame.Fields, data.NewField(meta.Name, nil, make([]float64, parsedBody.Rows)))
		}

		fieldIdx++
	}

	// Map clickhouse data to types
	for i, dataPoint := range parsedBody.Data {
		timestamp, err := strconv.ParseInt(dataPoint[timestampMetaName].(string), 10, 64)
		if err != nil {
			return nil, fmt.Errorf("unable to parse timestamp with alias=`%s` value=%s error=%w", timestampMetaName, dataPoint[timestampMetaName].(string), err)
		}

		// skip datapoints that aren't in alert query relative time range, see https://github.com/Vertamedia/clickhouse-grafana/issues/237
		if query.TimeRange.From.Unix() > timestamp || query.TimeRange.To.Unix() < timestamp {
			continue
		}

		stringKeysMetricName := ""
		for k, v := range dataPoint {
			if k != timestampMetaName && !isTypeArrayTuple(metaTypesMap[k].Type) && isTypeString(metaTypesMap[k].Type) {
				stringKeysMetricName += v.(string) + ", "
			}
		}

		if stringKeysMetricName != "" {
			stringKeysMetricName = stringKeysMetricName[0 : len(stringKeysMetricName)-2]
		}

		frame.Set(metaTypesMap[timestampMetaName].Index, i, time.Unix(timestamp, 0))

		for k, v := range dataPoint {
			if k != timestampMetaName {
				var point float64
				var err error

				if !isTypeArrayTuple(metaTypesMap[k].Type) && !isTypeString(metaTypesMap[k].Type) {
					point, err = parseFloat64(v)
					if err != nil {
						return nil, fmt.Errorf("unable to parse value %v for '%s': %w", v, k, err)
					}

					if stringKeysMetricName == "" {
						frame.Set(metaTypesMap[k].Index, i, point)
					} else {
						frame.Set(metaTypesMap[stringKeysMetricName].Index, i, point)
					}
				} else if isTypeArrayTuple(metaTypesMap[k].Type) {
					var arrayOfTuples [][]string
					switch arrays := v.(type) {
					case []interface{}:
						for _, array := range arrays {
							switch tuple := array.(type) {
							case []interface{}:
								var t []string
								for _, s := range tuple {
									t = append(t, fmt.Sprintf("%v", s))
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

						point, err = parseFloat64(tsValue)
						if err != nil {
							return nil, fmt.Errorf("unable to parse value %v for '%s': %w", tsValue, tsName, err)
						}

						frame.Set(metaTypesMap[tsName].Index, i, point)
					}
				}
			}
		}
	}

	return frame, nil
}
