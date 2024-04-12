package fixture_test

import (
	"bytes"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/experimental/e2e/fixture"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/e2e/storage"
	"github.com/stretchr/testify/require"
)

func TestFixtureAdd(t *testing.T) {
	t.Run("should add request and response to fixture store", func(t *testing.T) {
		req, res := setupFixture()
		defer res.Body.Close()
		store := newFakeStorage()
		f := fixture.NewFixture(store)
		require.Equal(t, 0, len(f.Entries()))
		err := f.Add(req, res)
		require.NoError(t, err)
		require.Equal(t, 1, len(f.Entries()))
		require.Equal(t, "http://example.com", f.Entries()[0].Request.URL.String())
		require.Equal(t, 200, f.Entries()[0].Response.StatusCode)
	})

	t.Run("should apply request processor", func(t *testing.T) {
		req, res := setupFixture()
		defer res.Body.Close()
		store := newFakeStorage()
		f := fixture.NewFixture(store)
		f.WithRequestProcessor(func(req *http.Request) *http.Request {
			req.URL.Path = "/example"
			return req
		})
		require.Equal(t, 0, len(f.Entries()))
		err := f.Add(req, res)
		require.NoError(t, err)
		require.Equal(t, 1, len(f.Entries()))
		require.Equal(t, "http://example.com/example", f.Entries()[0].Request.URL.String())
	})

	t.Run("should apply response processor", func(t *testing.T) {
		req, res := setupFixture()
		defer res.Body.Close()
		store := newFakeStorage()
		f := fixture.NewFixture(store)
		f.WithResponseProcessor(func(res *http.Response) *http.Response {
			res.StatusCode = 201
			return res
		})
		require.Equal(t, 0, len(f.Entries()))
		err := f.Add(req, res)
		require.NoError(t, err)
		require.Equal(t, 1, len(f.Entries()))
		require.Equal(t, 201, f.Entries()[0].Response.StatusCode)
	})

	t.Run("should apply response processor", func(t *testing.T) {
		req, res := setupFixture()
		defer req.Body.Close()
		defer res.Body.Close()
		store := newFakeStorage()
		f := fixture.NewFixture(store)
		f.WithResponseProcessor(func(res *http.Response) *http.Response {
			res.StatusCode = 201
			return res
		})
		require.Equal(t, 0, len(f.Entries()))
		err := f.Add(req, res)
		require.NoError(t, err)
		require.Equal(t, 1, len(f.Entries()))
		require.Equal(t, 201, f.Entries()[0].Response.StatusCode)
	})
}

func TestFixtureMatch(t *testing.T) {
	t.Run("should match request and return response", func(t *testing.T) {
		store := newFakeStorage()
		_ = store.Load()
		f := fixture.NewFixture(store)
		res := f.Match(store.entries[0].Request)
		defer res.Body.Close()
		require.Equal(t, 200, res.StatusCode)
	})

	t.Run("should not match", func(t *testing.T) {
		store := newFakeStorage()
		_ = store.Load()
		f := fixture.NewFixture(store)
		f.WithMatcher(func(res *http.Request) *http.Response {
			return nil
		})
		res := f.Match(store.entries[0].Request) // nolint:bodyclose
		require.Nil(t, res)
	})

	t.Run("default matcher", func(t *testing.T) {
		t.Run("should match", func(t *testing.T) {
			store := newFakeStorage()
			_ = store.Load()
			f := fixture.NewFixture(store)
			req, resp := setupFixture()
			defer resp.Body.Close()
			res := f.Match(req)
			defer res.Body.Close()
			require.NotNil(t, res)
		})

		t.Run("should not return response if req method does not match", func(t *testing.T) {
			store := newFakeStorage()
			_ = store.Load()
			f := fixture.NewFixture(store)
			req, resp := setupFixture()
			defer resp.Body.Close()
			req.Method = "PUT"
			res := f.Match(req) //nolint:bodyclose
			require.Nil(t, res)
		})

		t.Run("should not return response if URL does not match", func(t *testing.T) {
			store := newFakeStorage()
			_ = store.Load()
			f := fixture.NewFixture(store)
			req, resp := setupFixture()
			defer resp.Body.Close()
			req.URL.Path = "/foo"
			res := f.Match(req) //nolint:bodyclose
			require.Nil(t, res)
		})

		t.Run("should not return response if headers do not match", func(t *testing.T) {
			store := newFakeStorage()
			_ = store.Load()
			f := fixture.NewFixture(store)
			req, resp := setupFixture()
			defer resp.Body.Close()
			req.Header.Set("Content-Type", "plain/text")
			res := f.Match(req) //nolint:bodyclose
			require.Nil(t, res)
		})

		t.Run("should not return response if request body does not match", func(t *testing.T) {
			store := newFakeStorage()
			_ = store.Load()
			f := fixture.NewFixture(store)
			req, resp := setupFixture()
			defer resp.Body.Close()
			req.Body = io.NopCloser(bytes.NewBufferString("foo"))
			res := f.Match(req) // nolint:bodyclose
			require.Nil(t, res)
		})
	})
}

func TestDefaultProcessRequest(t *testing.T) {
	t.Run("should remove headers as expected", func(t *testing.T) {
		req, resp := setupFixture()
		defer resp.Body.Close()
		req.Header.Add("Date", "foo")
		req.Header.Add("Coookie", "bar")
		req.Header.Add("Authorization", "baz")
		req.Header.Add("User-Agent", "qux")
		req.Header.Add("Content-Type", "application/json")
		require.Equal(t, 5, len(req.Header))
		proccessedReq := fixture.DefaultProcessRequest(req)
		require.Equal(t, 1, len(proccessedReq.Header))
		require.Equal(t, "application/json", proccessedReq.Header.Get("Content-Type"))
	})
}

func TestFixtureDelete(t *testing.T) {
	t.Run("should delete fixture from storage", func(t *testing.T) {
		store := newFakeStorage()
		_ = store.Load()
		f := fixture.NewFixture(store)
		require.Equal(t, 1, len(f.Entries()))
		f.Delete(f.Entries()[0].Request)
		require.Equal(t, 0, len(f.Entries()))
	})
}

func setupFixture() (*http.Request, *http.Response) {
	req, err := http.NewRequest("POST", "http://example.com", io.NopCloser(strings.NewReader("test")))
	if err != nil {
		panic(err)
	}
	req.Header.Add("Content-Type", "application/json")
	res := &http.Response{
		StatusCode: 200,
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
	for i, entry := range s.Entries() {
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
