package requests

import (
	"math"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

type memSender struct{ resp *backend.CallResourceResponse }

func (m *memSender) Send(r *backend.CallResourceResponse) error { m.resp = r; return nil }

func TestSendJSONMarshalFailure(t *testing.T) {
	s := &memSender{}
	// math.NaN cannot be marshaled → must yield a 500 with an error body, not empty 200
	err := SendJSON(s, 200, map[string]interface{}{"v": math.NaN()})
	require.NoError(t, err)
	require.Equal(t, 500, s.resp.Status)
	require.Contains(t, string(s.resp.Body), "marshal")
}

func TestSendJSONOK(t *testing.T) {
	s := &memSender{}
	require.NoError(t, SendJSON(s, 200, map[string]string{"ok": "yes"}))
	require.Equal(t, 200, s.resp.Status)
	require.JSONEq(t, `{"ok":"yes"}`, string(s.resp.Body))
	require.Equal(t, []string{"application/json"}, s.resp.Headers["Content-Type"])
}
