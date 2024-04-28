package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

const TimeZoneFieldName = "timezone()"

var TimeZoneQuery = fmt.Sprintf("SELECT %s FORMAT JSON;", TimeZoneFieldName)

type ClickHouseClient struct {
	settings *DatasourceSettings
}

func (client *ClickHouseClient) Query(ctx context.Context, query string) (*Response, error) {

	onErr := func(err error) (*Response, error) {
		backend.Logger.Error(fmt.Sprintf("clickhouse client query error: %v", err))
		return nil, err
	}

	datasourceUrl, err := url.Parse(client.settings.Instance.URL)
	if err != nil {
		return onErr(fmt.Errorf("unable to parse clickhouse datasource url: %w", err))
	}

	httpClient := &http.Client{}
	tlsConfig := &tls.Config{}
	var req *http.Request
	if client.settings.UsePost {
		req, err = http.NewRequest("POST", datasourceUrl.String(), bytes.NewBufferString(query))
		if err != nil {
			return onErr(err)
		}
	} else {
		req, err = http.NewRequest("GET", datasourceUrl.String(), nil)
		if err != nil {
			return onErr(err)
		}
		params := req.URL.Query()
		params.Add("query", query)
		req.URL.RawQuery = params.Encode()
	}
	if client.settings.Instance.BasicAuthEnabled {
		password := client.settings.Instance.DecryptedSecureJSONData["basicAuthPassword"]
		req.SetBasicAuth(client.settings.Instance.BasicAuthUser, password)
	} else if client.settings.UseYandexCloudAuthorization {
		req.Header.Set("X-ClickHouse-User", client.settings.XHeaderUser)
		if client.settings.XHeaderKey != "" {
			req.Header.Set("X-ClickHouse-Key", client.settings.XHeaderKey)
		}
		if password, isSecured := client.settings.Instance.DecryptedSecureJSONData["xHeaderKey"]; isSecured {
			req.Header.Set("X-ClickHouse-Key", password)
		}
	}

	tlsCACert, tlsCACertExists := client.settings.Instance.DecryptedSecureJSONData["tlsCACert"]
	tlsClientCert, tlsClientCertExists := client.settings.Instance.DecryptedSecureJSONData["tlsClientCert"]
	tlsClientKey, tlsClientKeyExists := client.settings.Instance.DecryptedSecureJSONData["tlsClientKey"]

	if tlsCACertExists {
		rootCA := x509.NewCertPool()
		ok := rootCA.AppendCertsFromPEM([]byte(tlsCACert))
		if !ok {
			return onErr(errors.New(fmt.Sprintf("invalid tlsCACert: %s", tlsCACert)))
		}
		tlsConfig.RootCAs = rootCA
	}
	if tlsClientCertExists != tlsClientKeyExists {
		return onErr(errors.New("please setup both tlsClientCert and tlsClientKey"))
	}
	if tlsClientCertExists && tlsClientKeyExists {
		clientKeyPair, err := tls.X509KeyPair([]byte(tlsClientCert), []byte(tlsClientKey))
		if err != nil {
			return onErr(err)
		}
		tlsConfig.Certificates = append(tlsConfig.Certificates, clientKeyPair)
	}
	if client.settings.TLSSkipVerify {
		tlsConfig.InsecureSkipVerify = true
	}

	httpClient.Transport = &http.Transport{TLSClientConfig: tlsConfig}
	req = req.WithContext(ctx)
	resp, err := httpClient.Do(req)
	if err != nil {
		return onErr(err)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return onErr(err)
	}

	if resp.StatusCode != 200 {
		return onErr(errors.New(string(body)))
	}

	var jsonResp = &Response{ctx: ctx}
	err = json.Unmarshal(body, jsonResp)
	if err != nil {
		return onErr(fmt.Errorf("unable to parse json %s. Error: %w", body, err))
	}

	return jsonResp, nil
}

func (client *ClickHouseClient) FetchTimeZone(ctx context.Context) *time.Location {
	res, err := client.Query(ctx, TimeZoneQuery)

	if err == nil && res != nil && len(res.Data) > 0 && res.Data[0] != nil {
		return ParseTimeZone(fmt.Sprintf("%v", res.Data[0][TimeZoneFieldName]))
	}

	return time.UTC
}
