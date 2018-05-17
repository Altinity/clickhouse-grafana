package main

import (
	"encoding/json"
	"context"
	"crypto/tls"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"time"
	"strings"

	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/hashicorp/go-plugin"
	"golang.org/x/net/context/ctxhttp"
)

type CHDatasource struct {
	plugin.NetRPCUnsupportedPlugin
}

func init() {
	log.Println("from plugins!")
}

func (ds *CHDatasource) Query(ctx context.Context, tsdbReq *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {
	log.Println("from plugins!")

	for _, query := range tsdbReq.Queries {

		fmt.Println(query)
	}

	url := tsdbReq.Datasource.Url + "/query"
	req, err := http.NewRequest(http.MethodPost, url, strings.NewReader(string("SELECT 1")))
	if err != nil {
		return nil, err
	}

	//if tsdbReq.Datasource.BasicAuth {
	//	req.SetBasicAuth(
	//		tsdbReq.Datasource.BasicAuthUser,
	//		tsdbReq.Datasource.BasicAuthPassword)
	//}

	req.Header.Add("Content-Type", "application/json")


	res, err := ctxhttp.Do(ctx, httpClient, req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid status code. status: %v", res.Status)
	}

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	r, err := parseResponse(body, "A")
	if err != nil {
		return nil, err
	}

	return &datasource.DatasourceResponse{
		Results: []*datasource.QueryResult{r},
	}, nil
}

func parseResponse(body []byte, refId string) (*datasource.QueryResult, error) {
	responseBody := []TargetResponseDTO{}
	err := json.Unmarshal(body, &responseBody)
	if err != nil {
		return nil, err
	}

	series := []*datasource.TimeSeries{}
	for _, r := range responseBody {
		serie := &datasource.TimeSeries{Name: r.Target}

		for _, p := range r.DataPoints {
			serie.Points = append(serie.Points, &datasource.Point{
				Timestamp: int64(p[1]),
				Value:     p[0],
			})
		}

		series = append(series, serie)
	}

	return &datasource.QueryResult{
		Series: series,
		RefId:  refId,
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

