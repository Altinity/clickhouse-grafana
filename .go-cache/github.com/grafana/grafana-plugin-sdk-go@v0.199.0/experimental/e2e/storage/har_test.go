package storage_test

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/experimental/e2e/storage"
	"github.com/stretchr/testify/require"
)

func TestHARStorage(t *testing.T) {
	t.Run("Add", func(t *testing.T) {
		t.Run("should add a new entry to the storage", func(t *testing.T) {
			f, err := os.CreateTemp("", "example_*.har")
			require.NoError(t, err)
			s := storage.NewHARStorage(f.Name())
			req, res := exampleRequest()
			defer res.Body.Close()
			err = s.Add(req, res)
			require.NoError(t, err)
			require.Len(t, s.Entries(), 1)
			require.Equal(t, req.URL.String(), s.Entries()[0].Request.URL.String())
			require.Equal(t, res.Status, s.Entries()[0].Response.Status)
			err = os.Remove(f.Name())
			require.NoError(t, err)
		})

		t.Run("should support multiple instances concurrently adding to the same file", func(t *testing.T) {
			f, err := os.CreateTemp("", "example_*.har")
			require.NoError(t, err)
			c := make(chan bool)
			one := storage.NewHARStorage(f.Name())
			two := storage.NewHARStorage(f.Name())
			go func() {
				req, res := exampleRequest()
				defer res.Body.Close()
				req.URL.Path = "/one"
				e := one.Add(req, res)
				require.NoError(t, e)
				c <- true
			}()
			go func() {
				req, res := exampleRequest()
				defer res.Body.Close()
				req.URL.Path = "/two"
				err = two.Add(req, res)
				require.NoError(t, err)
				c <- true
			}()

			<-c
			<-c
			require.Len(t, one.Entries(), 2)
			require.Len(t, two.Entries(), 2)
			require.Equal(t, one.Entries()[0].Request.URL.String(), two.Entries()[0].Request.URL.String())
			require.Equal(t, one.Entries()[1].Request.URL.String(), two.Entries()[1].Request.URL.String())
			err = os.Remove(f.Name())
			require.NoError(t, err)
		})
	})

	t.Run("Load", func(t *testing.T) {
		t.Run("should load the HAR from disk", func(t *testing.T) {
			s := storage.NewHARStorage("testdata/example.har")
			req := s.Entries()[0].Request
			res := s.Entries()[0].Response
			require.Equal(t, "https://grafana.com/api/plugins", req.URL.String())
			require.Len(t, req.Header, 13)
			require.Equal(t, http.MethodGet, req.Method)
			require.Equal(t, http.StatusOK, res.StatusCode)
			require.Len(t, res.Header, 14)
			require.Equal(t, int64(2), res.ContentLength)

			req = s.Entries()[1].Request
			res = s.Entries()[1].Response
			require.Equal(t, "https://grafana.com/favicon.ico", req.URL.String())
			require.Len(t, req.Header, 6)
			require.Equal(t, http.MethodGet, req.Method)
			require.Equal(t, 0, res.StatusCode)
			require.Len(t, res.Header, 0)
			require.Equal(t, int64(0), res.ContentLength)
		})
	})

	t.Run("Delete", func(t *testing.T) {
		t.Run("should delete second entry", func(t *testing.T) {
			source, err := os.Open("testdata/example.har")
			require.NoError(t, err)
			f, err := os.CreateTemp("", "example_*.har")
			require.NoError(t, err)
			_, err = io.Copy(f, source)
			require.NoError(t, err)
			s := storage.NewHARStorage(f.Name())
			require.Equal(t, 2, len(s.Entries()))
			ok := s.Delete(s.Entries()[1].Request)
			require.True(t, ok)
			require.Equal(t, 1, len(s.Entries()))
			require.Equal(t, "https://grafana.com/api/plugins", s.Entries()[0].Request.URL.String())
		})
	})

	t.Run("Save", func(t *testing.T) {
		t.Run("should save", func(t *testing.T) {
			source := storage.NewHARStorage("testdata/example.har")
			f, err := os.CreateTemp("", "example_*.har")
			require.NoError(t, err)
			dest := storage.NewHARStorage(f.Name())
			dest.WithCurrentTimeOverride(func() time.Time {
				return time.Date(2020, time.January, 1, 0, 0, 0, 0, time.UTC)
			})
			counter := 0
			dest.WithUUIDOverride(func() string {
				counter++
				return fmt.Sprintf("%d", counter)
			})
			dest.Init()
			for _, entry := range source.Entries() {
				err = dest.Add(entry.Request, entry.Response)
				require.NoError(t, err)
			}
			require.NoError(t, err)
			sourceData, err := os.ReadFile("testdata/example.har")
			require.NoError(t, err)
			destData, err := os.ReadFile(f.Name())
			require.NoError(t, err)
			// we can't compare the two HAR files directly because header maps are not ordered
			require.Equal(t, len(sourceData), len(destData))
			err = os.Remove(f.Name())
			require.NoError(t, err)
		})
	})
}

func exampleRequest() (*http.Request, *http.Response) {
	req, _ := http.NewRequest(http.MethodGet, "http://example.com/", nil)
	res := &http.Response{
		StatusCode: http.StatusNotFound,
		Body:       io.NopCloser(strings.NewReader("")),
	}
	return req, res
}
