package e2e_test

import (
	"bytes"
	"crypto/tls"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/experimental/e2e"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/e2e/config"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/e2e/fixture"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/e2e/storage"
	"github.com/stretchr/testify/require"
)

func TestProxy(t *testing.T) {
	t.Run("Append", func(t *testing.T) {
		t.Run("should panic if more than one fixture is provided", func(t *testing.T) {
			defer func() {
				if r := recover(); r == nil {
					t.Errorf("Expected panic, but got none")
				}
			}()
			fixtures := []*fixture.Fixture{
				fixture.NewFixture(newFakeStorage()),
				fixture.NewFixture(newFakeStorage()),
			}
			config, err := config.LoadConfig("proxy.json")
			require.NoError(t, err)
			_ = e2e.NewProxy(e2e.ProxyModeAppend, fixtures, config)
		})

		t.Run("should add new request to store", func(t *testing.T) {
			proxy, client, s := setupProxy(e2e.ProxyModeAppend)
			defer s.Close()
			req, err := http.NewRequest(http.MethodGet, srv.URL+"/foo", nil)
			require.NoError(t, err)
			res, err := client.Do(req)
			require.NoError(t, err)
			defer res.Body.Close()
			require.Equal(t, "/foo", proxy.Fixtures[0].Entries()[0].Request.URL.Path)
			require.Equal(t, http.StatusOK, proxy.Fixtures[0].Entries()[0].Response.StatusCode)
			require.Equal(t, http.StatusOK, res.StatusCode)
			resBody, err := io.ReadAll(res.Body)
			require.NoError(t, err)
			require.Equal(t, "/foo", string(resBody))
		})

		t.Run("should not add or modify existing request", func(t *testing.T) {
			var err error
			proxy, client, s := setupProxy(e2e.ProxyModeAppend)
			defer s.Close()
			// Add an existing request directly to the fixture
			req, err := http.NewRequest(http.MethodPost, srv.URL+"/foo", bytes.NewBuffer([]byte("bar")))
			require.NoError(t, err)
			req.Header = make(http.Header)
			res := &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBufferString("bar")),
				Request:    req,
			}
			require.Len(t, proxy.Fixtures[0].Entries(), 0)
			err = proxy.Fixtures[0].Add(req, res)
			require.NoError(t, err)
			require.Len(t, proxy.Fixtures[0].Entries(), 1)
			req, err = http.NewRequest(http.MethodPost, srv.URL+"/foo", bytes.NewBuffer([]byte("bar")))
			require.NoError(t, err)
			resp, err := client.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()
			require.Len(t, proxy.Fixtures[0].Entries(), 1)
			require.Equal(t, "/foo", proxy.Fixtures[0].Entries()[0].Request.URL.Path)
			require.Equal(t, http.StatusOK, proxy.Fixtures[0].Entries()[0].Response.StatusCode)
			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)
			require.Equal(t, "bar", string(body))
		})
	})

	t.Run("Overwrite", func(t *testing.T) {
		t.Run("should panic if more than one fixture is provided", func(t *testing.T) {
			defer func() {
				if r := recover(); r == nil {
					t.Errorf("Expected panic, but got none")
				}
			}()
			fixtures := []*fixture.Fixture{
				fixture.NewFixture(newFakeStorage()),
				fixture.NewFixture(newFakeStorage()),
			}
			config, err := config.LoadConfig("proxy.json")
			require.NoError(t, err)
			_ = e2e.NewProxy(e2e.ProxyModeOverwrite, fixtures, config)
		})

		t.Run("should add new request to store", func(t *testing.T) {
			proxy, client, s := setupProxy(e2e.ProxyModeOverwrite)
			defer s.Close()
			req, err := http.NewRequest(http.MethodGet, srv.URL+"/foo", nil)
			require.NoError(t, err)
			res, err := client.Do(req)
			require.NoError(t, err)
			defer res.Body.Close()
			require.Equal(t, "/foo", proxy.Fixtures[0].Entries()[0].Request.URL.Path)
			require.Equal(t, http.StatusOK, proxy.Fixtures[0].Entries()[0].Response.StatusCode)
			require.Equal(t, http.StatusOK, res.StatusCode)
			resBody, err := io.ReadAll(res.Body)
			require.NoError(t, err)
			require.Equal(t, "/foo", string(resBody))
		})

		t.Run("should replace existing request", func(t *testing.T) {
			var err error
			proxy, client, s := setupProxy(e2e.ProxyModeOverwrite)
			defer s.Close()
			// Add an existing request directly to the fixture
			req, err := http.NewRequest(http.MethodGet, srv.URL+"/foo", nil)
			require.NoError(t, err)
			req.Header = make(http.Header)
			req.Body = io.NopCloser(bytes.NewBuffer([]byte("bar")))
			res := &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBufferString("bar")),
				Request:    req,
			}
			err = proxy.Fixtures[0].Add(req, res)
			require.NoError(t, err)
			resp, err := client.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()
			require.Equal(t, "/foo", proxy.Fixtures[0].Entries()[0].Request.URL.Path)
			require.Equal(t, http.StatusOK, proxy.Fixtures[0].Entries()[0].Response.StatusCode)
			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)
			require.Equal(t, "/foo", string(body))
		})
	})

	t.Run("Replay", func(t *testing.T) {
		t.Run("should not panic if more than one fixture is provided", func(t *testing.T) {
			fixtures := []*fixture.Fixture{
				fixture.NewFixture(newFakeStorage()),
				fixture.NewFixture(newFakeStorage()),
			}
			config, err := config.LoadConfig("proxy.json")
			require.NoError(t, err)
			_ = e2e.NewProxy(e2e.ProxyModeReplay, fixtures, config)
		})
	})
}

// ignoring the G402 error here because this proxy is only used for testing
// nolint:gosec
var acceptAllCerts = &tls.Config{InsecureSkipVerify: true}

type pathEcho struct{}

func (pathEcho) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	_, err := io.WriteString(w, req.URL.Path)
	if err != nil {
		panic(err)
	}
}

var srv = httptest.NewServer(pathEcho{})

func setupProxy(mode e2e.ProxyMode) (proxy *e2e.Proxy, client *http.Client, server *httptest.Server) {
	fixtures := []*fixture.Fixture{
		fixture.NewFixture(newFakeStorage()),
	}
	config, err := config.LoadConfig("proxy.json")
	if err != nil {
		panic(err)
	}
	proxy = e2e.NewProxy(mode, fixtures, config)
	server = httptest.NewServer(proxy.Server)
	proxyURL, err := url.Parse(server.URL)
	if err != nil {
		panic(err)
	}
	tr := &http.Transport{TLSClientConfig: acceptAllCerts, Proxy: http.ProxyURL(proxyURL)}
	client = &http.Client{Transport: tr}
	return
}

func setupFixture() (*http.Request, *http.Response) {
	req, err := http.NewRequest("POST", "http://example.com", io.NopCloser(strings.NewReader("test")))
	if err != nil {
		panic(err)
	}
	req.Header.Add("Content-Type", "application/json")
	res := &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader("{\"foo\":\"bar\"}")),
	}
	return req, res
}

type fakeStorage struct {
	entries []*storage.Entry
	err     error
}

func newFakeStorage() *fakeStorage {
	return &fakeStorage{
		entries: make([]*storage.Entry, 0),
		err:     nil,
	}
}

func (s *fakeStorage) Add(req *http.Request, res *http.Response) error {
	resBody, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}
	res.Body = io.NopCloser(bytes.NewBuffer(resBody))
	resCopy := *res
	resCopy.Body = io.NopCloser(bytes.NewBuffer(resBody))
	s.entries = append(s.entries, &storage.Entry{
		Request:  req,
		Response: &resCopy,
	})
	return nil
}

func (s *fakeStorage) Delete(req *http.Request) bool {
	for i, entry := range s.entries {
		if res := entry.Match(req); res != nil {
			res.Body.Close()
			s.entries = append(s.entries[:i], s.entries[i+1:]...)
			return true
		}
	}
	return false
}

func (s *fakeStorage) Load() error {
	s.entries = make([]*storage.Entry, 0)
	req, res := setupFixture()
	defer res.Body.Close()
	s.entries = append(s.entries, &storage.Entry{
		Request:  req,
		Response: res,
	})
	return s.err
}

func (s *fakeStorage) Save() error {
	return s.err
}

func (s *fakeStorage) Entries() []*storage.Entry {
	return s.entries
}

func (s *fakeStorage) Match(req *http.Request) *http.Response {
	for _, entry := range s.entries {
		if res := entry.Match(req); res != nil {
			return res
		}
	}
	return nil
}
