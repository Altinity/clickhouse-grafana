package main

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/andybalholm/brotli"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/klauspost/compress/zstd"
	"github.com/stretchr/testify/require"
)

const emptyResponseJSON = `{"meta":[],"data":[]}`

// newTestClient spins up a ClickHouse HTTP stub and a client pointed at it.
func newTestClient(t *testing.T, handler http.HandlerFunc, mutate func(*DatasourceSettings)) *ClickHouseClient {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	settings := &DatasourceSettings{
		Instance:   backend.DataSourceInstanceSettings{URL: srv.URL},
		HTTPClient: srv.Client(),
	}
	if mutate != nil {
		mutate(settings)
	}
	return &ClickHouseClient{settings: settings}
}

func TestClientQueryGetPutsQueryInURL(t *testing.T) {
	var gotMethod, gotQuery string
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		gotMethod, gotQuery = r.Method, r.URL.Query().Get("query")
		_, _ = w.Write([]byte(emptyResponseJSON))
	}, nil)

	_, err := client.Query(context.Background(), "SELECT 1")

	require.NoError(t, err)
	require.Equal(t, "GET", gotMethod)
	require.Equal(t, "SELECT 1", gotQuery)
}

func TestClientQueryPostPutsQueryInBody(t *testing.T) {
	var gotMethod, gotBody string
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		gotMethod, gotBody = r.Method, string(body)
		_, _ = w.Write([]byte(emptyResponseJSON))
	}, func(s *DatasourceSettings) { s.UsePost = true })

	_, err := client.Query(context.Background(), "SELECT 1")

	require.NoError(t, err)
	require.Equal(t, "POST", gotMethod)
	require.Equal(t, "SELECT 1", gotBody)
}

func compress(t *testing.T, encoding string, payload []byte) []byte {
	t.Helper()
	var buf bytes.Buffer
	switch encoding {
	case "gzip":
		w := gzip.NewWriter(&buf)
		_, err := w.Write(payload)
		require.NoError(t, err)
		require.NoError(t, w.Close())
	case "deflate":
		w, err := flate.NewWriter(&buf, flate.DefaultCompression)
		require.NoError(t, err)
		_, err = w.Write(payload)
		require.NoError(t, err)
		require.NoError(t, w.Close())
	case "br":
		w := brotli.NewWriter(&buf)
		_, err := w.Write(payload)
		require.NoError(t, err)
		require.NoError(t, w.Close())
	case "zstd":
		w, err := zstd.NewWriter(&buf)
		require.NoError(t, err)
		_, err = w.Write(payload)
		require.NoError(t, err)
		require.NoError(t, w.Close())
	}
	return buf.Bytes()
}

func TestClientQueryDecodesCompressedResponses(t *testing.T) {
	for _, encoding := range []string{"gzip", "deflate", "br", "zstd"} {
		t.Run(encoding, func(t *testing.T) {
			client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
				require.Equal(t, encoding, r.Header.Get("Accept-Encoding"))
				require.Equal(t, "1", r.URL.Query().Get("enable_http_compression"))
				w.Header().Set("Content-Encoding", encoding)
				_, _ = w.Write(compress(t, encoding, []byte(`{"meta":[],"data":[{"x":1}]}`)))
			}, func(s *DatasourceSettings) {
				s.UseCompression = true
				s.CompressionType = encoding
			})

			resp, err := client.Query(context.Background(), "SELECT 1")

			require.NoError(t, err)
			require.Len(t, resp.Data, 1)
		})
	}
}

func TestClientQueryUnknownCompressionTypeIsIgnored(t *testing.T) {
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		// The transport adds its own Accept-Encoding; the client must not opt in itself.
		require.Empty(t, r.URL.Query().Get("enable_http_compression"))
		_, _ = w.Write([]byte(emptyResponseJSON))
	}, func(s *DatasourceSettings) {
		s.UseCompression = true
		s.CompressionType = "lz77"
	})

	_, err := client.Query(context.Background(), "SELECT 1")
	require.NoError(t, err)
}

func TestClientQueryAuthHeaders(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*DatasourceSettings)
		check  func(*testing.T, *http.Request)
	}{
		{
			"basic auth uses the secure password",
			func(s *DatasourceSettings) {
				s.Instance.BasicAuthEnabled = true
				s.Instance.BasicAuthUser = "user"
				s.Instance.DecryptedSecureJSONData = map[string]string{"basicAuthPassword": "secret"}
			},
			func(t *testing.T, r *http.Request) {
				user, pass, ok := r.BasicAuth()
				require.True(t, ok)
				require.Equal(t, "user", user)
				require.Equal(t, "secret", pass)
			},
		},
		{
			"yandex ssl certificate auth",
			func(s *DatasourceSettings) {
				s.UseYandexCloudAuthorization = true
				s.XHeaderUser = "yc-user"
				s.XClickHouseSSLCertificateAuth = true
			},
			func(t *testing.T, r *http.Request) {
				require.Equal(t, "yc-user", r.Header.Get("X-ClickHouse-User"))
				require.Equal(t, "on", r.Header.Get("X-ClickHouse-SSL-Certificate-Auth"))
				require.Empty(t, r.Header.Get("X-ClickHouse-Key"))
			},
		},
		{
			"yandex plain key",
			func(s *DatasourceSettings) {
				s.UseYandexCloudAuthorization = true
				s.XHeaderUser = "yc-user"
				s.XHeaderKey = "plain-key"
			},
			func(t *testing.T, r *http.Request) {
				require.Equal(t, "plain-key", r.Header.Get("X-ClickHouse-Key"))
			},
		},
		{
			"yandex secure key overrides the plain one",
			func(s *DatasourceSettings) {
				s.UseYandexCloudAuthorization = true
				s.XHeaderKey = "plain-key"
				s.Instance.DecryptedSecureJSONData = map[string]string{"xHeaderKey": "secure-key"}
			},
			func(t *testing.T, r *http.Request) {
				require.Equal(t, "secure-key", r.Header.Get("X-ClickHouse-Key"))
			},
		},
		{
			"custom headers",
			func(s *DatasourceSettings) {
				s.CustomHeaders = map[string]string{"X-Custom": "yes"}
			},
			func(t *testing.T, r *http.Request) {
				require.Equal(t, "yes", r.Header.Get("X-Custom"))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got *http.Request
			client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
				got = r.Clone(context.Background())
				_, _ = w.Write([]byte(emptyResponseJSON))
			}, tt.mutate)

			_, err := client.Query(context.Background(), "SELECT 1")

			require.NoError(t, err)
			tt.check(t, got)
		})
	}
}

func TestClientQueryErrors(t *testing.T) {
	t.Run("unparsable datasource url", func(t *testing.T) {
		client := &ClickHouseClient{settings: &DatasourceSettings{
			Instance: backend.DataSourceInstanceSettings{URL: "://bad"},
		}}
		_, err := client.Query(context.Background(), "SELECT 1")
		require.ErrorContains(t, err, "unable to parse clickhouse datasource url")
	})

	t.Run("nil http client", func(t *testing.T) {
		client := &ClickHouseClient{settings: &DatasourceSettings{
			Instance: backend.DataSourceInstanceSettings{URL: "http://localhost:8123"},
		}}
		_, err := client.Query(context.Background(), "SELECT 1")
		require.ErrorContains(t, err, "http client is not initialized")
	})

	t.Run("non-200 returns the body as the error", func(t *testing.T) {
		client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte("Code: 62. DB::Exception: Syntax error"))
		}, nil)
		_, err := client.Query(context.Background(), "SELECT nope")
		require.ErrorContains(t, err, "Syntax error")
	})

	t.Run("invalid json body", func(t *testing.T) {
		client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte("{not json"))
		}, nil)
		_, err := client.Query(context.Background(), "SELECT 1")
		require.ErrorContains(t, err, "unable to parse json")
	})

	t.Run("corrupt gzip body", func(t *testing.T) {
		client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Encoding", "gzip")
			_, _ = w.Write([]byte("definitely not gzip"))
		}, func(s *DatasourceSettings) {
			s.UseCompression = true
			s.CompressionType = "gzip"
		})
		_, err := client.Query(context.Background(), "SELECT 1")
		require.ErrorContains(t, err, "GZIP reader")
	})
}

func TestFetchTimeZone(t *testing.T) {
	t.Run("returns the server timezone", func(t *testing.T) {
		client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(`{"meta":[{"name":"timezone()","type":"String"}],"data":[{"timezone()":"Europe/Moscow"}]}`))
		}, nil)

		tz := client.FetchTimeZone(context.Background())

		loc, err := time.LoadLocation("Europe/Moscow")
		require.NoError(t, err)
		require.Equal(t, loc.String(), tz.String())
	})

	t.Run("falls back to UTC on error", func(t *testing.T) {
		client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}, nil)

		require.Equal(t, time.UTC, client.FetchTimeZone(context.Background()))
	})
}
