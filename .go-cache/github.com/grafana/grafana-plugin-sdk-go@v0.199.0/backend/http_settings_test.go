package backend

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/stretchr/testify/require"
)

func TestParseHTTPSettings(t *testing.T) {
	t.Run("When parseHTTPSettings of empty jsonData and secureJSONData", func(t *testing.T) {
		jsonStr := `{}`
		secureData := map[string]string{}
		s, err := parseHTTPSettings([]byte(jsonStr), secureData)
		require.NoError(t, err)
		require.NotNil(t, s)
	})

	t.Run("When parseHTTPSettings of full jsonData and secureJSONData", func(t *testing.T) {
		jsonStr := `{
			"access": "browser",
			"url": "http://domain.com",
			"basicAuth": true,
			"basicAuthUser": "user",
			"timeout": 10,
			"dialTimeout": 10,
			"httpKeepAlive": 11,
			"httpTLSHandshakeTimeout": 12,
			"httpExpectContinueTimeout": 13,
			"httpMaxConnsPerHost": 20,
			"httpMaxIdleConns": 14,
			"httpMaxIdleConnsPerHost": 16,
			"httpIdleConnTimeout": 15,
			"tlsAuth": true,
			"tlsAuthWithCACert": true,
			"tlsSkipVerify": true,
			"serverName": "domain.io",
			"sigV4Auth": true,
			"sigV4Region": "region a",
			"sigV4AssumeRoleArn": "abc.def",
			"sigV4AuthType": "at",
			"sigV4ExternalId": "ext123",
			"sigV4Profile": "ghi",
			"httpHeaderName1": "X-HeaderOne",
			"httpHeaderName2": "X-HeaderTwo"
		}`
		secureData := map[string]string{
			"basicAuthPassword": "pwd",
			"tlsCACert":         "tlsCACert1",
			"tlsClientCert":     "tlsClientCert2",
			"tlsClientKey":      "tlsClientKey3",
			"sigV4AccessKey":    "sigV4AccessKey4",
			"sigV4SecretKey":    "sigV4SecretKey5",
			"httpHeaderValue1":  "SecretOne",
			"httpHeaderValue2":  "SecretTwo",
		}
		var jsonMap map[string]interface{}
		err := json.Unmarshal([]byte(jsonStr), &jsonMap)
		require.NoError(t, err)
		s, err := parseHTTPSettings([]byte(jsonStr), secureData)
		require.NoError(t, err)
		require.NotNil(t, s)
		require.Equal(t, &HTTPSettings{
			Access:            "browser",
			URL:               "http://domain.com",
			BasicAuthEnabled:  true,
			BasicAuthUser:     "user",
			BasicAuthPassword: "pwd",
			Headers: map[string]string{
				"X-HeaderOne": "SecretOne",
				"X-HeaderTwo": "SecretTwo",
			},
			Timeout:               10 * time.Second,
			DialTimeout:           10 * time.Second,
			KeepAlive:             11 * time.Second,
			TLSHandshakeTimeout:   12 * time.Second,
			ExpectContinueTimeout: 13 * time.Second,
			MaxConnsPerHost:       20,
			MaxIdleConns:          14,
			MaxIdleConnsPerHost:   16,
			IdleConnTimeout:       15 * time.Second,
			TLSClientAuth:         true,
			TLSAuthWithCACert:     true,
			TLSSkipVerify:         true,
			TLSServerName:         "domain.io",
			TLSCACert:             "tlsCACert1",
			TLSClientCert:         "tlsClientCert2",
			TLSClientKey:          "tlsClientKey3",
			SigV4Auth:             true,
			SigV4Region:           "region a",
			SigV4AssumeRoleARN:    "abc.def",
			SigV4AuthType:         "at",
			SigV4ExternalID:       "ext123",
			SigV4Profile:          "ghi",
			SigV4AccessKey:        "sigV4AccessKey4",
			SigV4SecretKey:        "sigV4SecretKey5",
			JSONData:              jsonMap,
			SecureJSONData:        secureData,
		}, s)

		t.Run("HTTPClientOptions() should convert to expected httpclient.Options", func(t *testing.T) {
			opts := s.HTTPClientOptions()
			require.NotNil(t, opts)
			expectedOpts := httpclient.Options{
				BasicAuth: &httpclient.BasicAuthOptions{
					User:     "user",
					Password: "pwd",
				},
				Headers: map[string]string{
					"X-HeaderOne": "SecretOne",
					"X-HeaderTwo": "SecretTwo",
				},
				Timeouts: &httpclient.TimeoutOptions{
					Timeout:               10 * time.Second,
					DialTimeout:           10 * time.Second,
					KeepAlive:             11 * time.Second,
					TLSHandshakeTimeout:   12 * time.Second,
					ExpectContinueTimeout: 13 * time.Second,
					MaxConnsPerHost:       20,
					MaxIdleConns:          14,
					MaxIdleConnsPerHost:   16,
					IdleConnTimeout:       15 * time.Second,
				},
				TLS: &httpclient.TLSOptions{
					InsecureSkipVerify: true,
					ServerName:         "domain.io",
					CACertificate:      "tlsCACert1",
					ClientCertificate:  "tlsClientCert2",
					ClientKey:          "tlsClientKey3",
				},
				SigV4: &httpclient.SigV4Config{
					Region:        "region a",
					AssumeRoleARN: "abc.def",
					AuthType:      "at",
					ExternalID:    "ext123",
					Profile:       "ghi",
					AccessKey:     "sigV4AccessKey4",
					SecretKey:     "sigV4SecretKey5",
				},
				Labels:        map[string]string{},
				CustomOptions: map[string]interface{}{},
			}
			require.Equal(t, expectedOpts, opts)
		})
	})
}
