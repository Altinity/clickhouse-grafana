package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/hashicorp/go-plugin"
	"github.com/pkg/errors"
	"golang.org/x/net/context/ctxhttp"
)

type CHDatasource struct {
	plugin.NetRPCUnsupportedPlugin
}

func (ds *CHDatasource) Query(ctx context.Context, tsdbReq *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {
	url := tsdbReq.Datasource.Url
	response := &datasource.DatasourceResponse{}
	for _, query := range tsdbReq.Queries {
		q := &queryModel{}
		if err := json.Unmarshal([]byte(query.ModelJson), q); err != nil {
			return nil, err
		}
		r, err := doQuery(ctx, url, q.Raw)
		if err != nil {
			return nil, err
		}
		r.RefId = q.RefID
		response.Results = append(response.Results, r)
	}

	//if tsdbReq.Datasource.BasicAuth {
	//	req.SetBasicAuth(
	//		tsdbReq.Datasource.BasicAuthUser,
	//		tsdbReq.Datasource.BasicAuthPassword)
	//}

	return response, nil
}

func doQuery(ctx context.Context, url, query string) (*datasource.QueryResult, error) {
	query = query + " FORMAT JSON"
	log.Printf(">> sending query %s\n%q\n", url, query)
	req, err := http.NewRequest(http.MethodPost, url, strings.NewReader(query))
	if err != nil {
		return nil, err
	}
	req.Header.Add("Content-Type", "application/json")
	res, err := ctxhttp.Do(ctx, httpClient, req)
	if err != nil {
		return nil, err
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid status code. status: %v", res.Status)
	}
	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	res.Body.Close()

	return parseResponse(body)
}

func parseResponse(body []byte) (*datasource.QueryResult, error) {
	var dto targetResponseDTO
	if err := json.Unmarshal(body, &dto); err != nil {
		return nil, err
	}
	if dto.Rows == 0 {
		return &datasource.QueryResult{}, nil
	}
	if len(dto.Meta) < 2 {
		return nil, fmt.Errorf("response can't contain less than 2 columns")
	}
	// timeCol have to be the first column always
	if dto.Meta[0].Type != "UInt64" {
		return nil, fmt.Errorf("timeColumn must be UInt64; got %q instead", dto.Meta[0].Type)
	}
	timeCol := dto.Meta[0].Name

	intervals := make([]int64, dto.Rows)
	dataPoints := make(map[string]map[int64]float64)
	push := func(key string, ts int64, val interface{}) error {
		f, err := toFloat64(val)
		if err != nil {
			return err
		}
		if dataPoints[key] == nil {
			dataPoints[key] = make(map[int64]float64)
		}
		dataPoints[key][ts] = f
		return nil
	}

	for i, item := range dto.Data {
		tsVal, ok := item[timeCol]
		if !ok {
			return nil, fmt.Errorf("unable to find timeCol %q in response.data", timeCol)
		}
		ts, err := toInt64(tsVal)
		if err != nil {
			return nil, err
		}
		intervals[i] = ts
		delete(item, timeCol)

		for k, val := range item {
			switch v := val.(type) {
			case string, float64:
				push(k, ts, v)
			case []interface{}:
				for _, row := range v {
					r, ok := row.([]interface{})
					if !ok {
						reportUnsupported(v)
						return nil, errUnsupportedType
					}
					push(r[0].(string), ts, r[1])
				}
			default:
				reportUnsupported(v)
				return nil, errUnsupportedType
			}
		}
	}

	var series []*datasource.TimeSeries
	for target, dp := range dataPoints {
		serie := &datasource.TimeSeries{Name: target}
		for _, i := range intervals {
			v, ok := dp[i]
			if !ok {
				v = float64(0)
			}
			serie.Points = append(serie.Points, &datasource.Point{
				Timestamp: i,
				Value:     v,
			})
		}
		series = append(series, serie)
	}

	return &datasource.QueryResult{
		Series: series,
	}, nil
}

var httpClient = &http.Client{
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{
			Renegotiation: tls.RenegotiateFreelyAsClient,
		},
		Proxy: http.ProxyFromEnvironment,
		Dial: (&net.Dialer{
			Timeout:   30 * time.Second,
			KeepAlive: 30 * time.Second,
			DualStack: true,
		}).Dial,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
	},
	Timeout: time.Duration(time.Second * 30),
}

var errUnsupportedType = errors.New("unsupported column type")

func toInt64(val interface{}) (int64, error) {
	switch v := val.(type) {
	case string:
		return strconv.ParseInt(v, 10, 64)
	case float64:
		return int64(v), nil
	case int64:
		return v, nil
	case uint64:
		return int64(v), nil
	case nil:
		return int64(0), nil
	}
	reportUnsupported(val)
	return int64(0), errUnsupportedType
}

func toFloat64(val interface{}) (float64, error) {
	switch v := val.(type) {
	case string:
		return strconv.ParseFloat(v, 64)
	case float64:
		return v, nil
	case int64:
		return float64(v), nil
	case nil:
		return float64(0), nil
	}
	reportUnsupported(val)
	return float64(0), errUnsupportedType
}

func reportUnsupported(val interface{}) {
	typ := "nil"
	t := reflect.TypeOf(val)
	if t != nil {
		typ = t.Name()
	}
	log.Printf("ERROR: parameter %#v has unsupported type: %s", val, typ)
}
