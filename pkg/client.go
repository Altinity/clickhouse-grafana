package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"slices"
	"time"

	"compress/flate"
	"compress/gzip"

	"github.com/andybalholm/brotli"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/klauspost/compress/zstd"
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
	if client.settings.UseCompression && slices.Contains([]string{"gzip", "br", "deflate", "zstd"}, client.settings.CompressionType) {
		req.Header.Set("Accept-Encoding", client.settings.CompressionType)
		params := req.URL.Query()
		params.Add("enable_http_compression", "1")
		req.URL.RawQuery = params.Encode()
	}
	if client.settings.Instance.BasicAuthEnabled {
		password := client.settings.Instance.DecryptedSecureJSONData["basicAuthPassword"]
		req.SetBasicAuth(client.settings.Instance.BasicAuthUser, password)
	} else if client.settings.UseYandexCloudAuthorization {
		req.Header.Set("X-ClickHouse-User", client.settings.XHeaderUser)
		if client.settings.XClickHouseSSLCertificateAuth {
			req.Header.Set("X-ClickHouse-SSL-Certificate-Auth", "on")
		} else {
			if client.settings.XHeaderKey != "" {
				req.Header.Set("X-ClickHouse-Key", client.settings.XHeaderKey)
			}
			if password, isSecured := client.settings.Instance.DecryptedSecureJSONData["xHeaderKey"]; isSecured {
				req.Header.Set("X-ClickHouse-Key", password)
			}
		}
	}
	if client.settings.CustomHeaders != nil {
		for k, v := range client.settings.CustomHeaders {
			req.Header.Set(k, v)
		}
	}

	req = req.WithContext(ctx)
	if client.settings.HTTPClient == nil {
		return onErr(errors.New("http client is not initialized"))
	}
	resp, err := client.settings.HTTPClient.Do(req)
	if err != nil {
		return onErr(err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			backend.Logger.Warn(fmt.Sprintf("unable to close response body: %v", closeErr))
		}
	}()

	var reader io.Reader
	closeEncodedReader := func() {}
	switch resp.Header.Get("Content-Encoding") {
	case "gzip":
		gzipReader, gzipErr := gzip.NewReader(resp.Body)
		reader = gzipReader
		err = gzipErr
		if err != nil {
			return onErr(fmt.Errorf("error creating GZIP reader: %v", err))
		}
		closeEncodedReader = func() {
			if closeErr := gzipReader.Close(); closeErr != nil {
				backend.Logger.Warn(fmt.Sprintf("unable to close gzip reader: %v", closeErr))
			}
		}
	case "deflate":
		flateReader := flate.NewReader(resp.Body)
		reader = flateReader
		closeEncodedReader = func() {
			if closeErr := flateReader.Close(); closeErr != nil {
				backend.Logger.Warn(fmt.Sprintf("unable to close deflate reader: %v", closeErr))
			}
		}
	case "br":
		reader = brotli.NewReader(resp.Body)
	case "zstd":
		decoder, zstdErr := zstd.NewReader(resp.Body)
		if zstdErr != nil {
			return onErr(fmt.Errorf("error creating ZSTD reader: %v", zstdErr))
		}
		reader = decoder.IOReadCloser()
		closeEncodedReader = decoder.Close
	default:
		reader = resp.Body
	}
	defer closeEncodedReader()

	body, err := io.ReadAll(reader)
	if err != nil {
		return onErr(err)
	}

	if resp.StatusCode != 200 {
		return onErr(errors.New(string(body)))
	}

	var jsonResp = &Response{ctx: ctx}
	// Use json.Decoder with UseNumber() to preserve precision for large integers (UInt64/Int64)
	// Without this, json.Unmarshal converts numbers to float64, losing precision for values > 2^53
	// See: https://github.com/Altinity/clickhouse-grafana/issues/832
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()
	err = decoder.Decode(jsonResp)
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
