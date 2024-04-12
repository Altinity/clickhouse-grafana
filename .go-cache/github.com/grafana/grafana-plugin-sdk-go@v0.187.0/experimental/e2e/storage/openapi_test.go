package storage_test

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/experimental/e2e/storage"
	"github.com/stretchr/testify/require"
)

func TestOpenAPIStorage(t *testing.T) {
	t.Run("should match request", func(t *testing.T) {
		s := storage.NewOpenAPIStorage("testdata/openapi.yml")
		req, err := http.NewRequest("GET", "http://example.com/versions", nil)
		require.NoError(t, err)
		res := s.Match(req)
		defer res.Body.Close()
		require.Equal(t, http.StatusOK, res.StatusCode)
		var respBody map[string]string
		b, err := io.ReadAll(res.Body)
		require.NoError(t, err)
		err = json.Unmarshal(b, &respBody)
		require.NoError(t, err)
		require.Equal(t, "2.0.0", respBody["version"])
	})
}
