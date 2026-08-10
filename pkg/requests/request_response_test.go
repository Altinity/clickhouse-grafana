package requests

import (
	"net/http"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

type captureSender struct{ resps []*backend.CallResourceResponse }

func (s *captureSender) Send(r *backend.CallResourceResponse) error {
	s.resps = append(s.resps, r)
	return nil
}

func TestUnmarshalRequest(t *testing.T) {
	type payload struct {
		Query string `json:"query"`
	}

	t.Run("valid body", func(t *testing.T) {
		sender := &captureSender{}
		req, ok := UnmarshalRequest[payload](&backend.CallResourceRequest{Body: []byte(`{"query":"SELECT 1"}`)}, sender)
		require.True(t, ok)
		require.Equal(t, "SELECT 1", req.Query)
		require.Empty(t, sender.resps)
	})

	t.Run("invalid body", func(t *testing.T) {
		sender := &captureSender{}
		req, ok := UnmarshalRequest[payload](&backend.CallResourceRequest{Body: []byte(`{bad`)}, sender)
		require.False(t, ok)
		require.Nil(t, req)
		require.Len(t, sender.resps, 1)
		require.Equal(t, http.StatusBadRequest, sender.resps[0].Status)
	})
}

func TestSendSuccessResponse(t *testing.T) {
	sender := &captureSender{}
	require.NoError(t, SendSuccessResponse(sender, map[string]string{"sql": "SELECT 1"}))
	require.Len(t, sender.resps, 1)
	require.Equal(t, http.StatusOK, sender.resps[0].Status)
	require.Equal(t, []string{"application/json"}, sender.resps[0].Headers["Content-Type"])
	require.JSONEq(t, `{"sql":"SELECT 1"}`, string(sender.resps[0].Body))
}
