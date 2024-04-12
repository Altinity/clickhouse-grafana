package httpclient

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCustomHeadersMiddleware(t *testing.T) {
	t.Run("Without custom headers set should return next http.RoundTripper", func(t *testing.T) {
		ctx := &testContext{}
		finalRoundTripper := ctx.createRoundTripper("finalrt")
		customHeaders := CustomHeadersMiddleware()
		rt := customHeaders.CreateMiddleware(Options{}, finalRoundTripper)
		require.NotNil(t, rt)
		middlewareName, ok := customHeaders.(MiddlewareName)
		require.True(t, ok)
		require.Equal(t, CustomHeadersMiddlewareName, middlewareName.MiddlewareName())

		req, err := http.NewRequest(http.MethodGet, "http://", nil)
		require.NoError(t, err)
		res, err := rt.RoundTrip(req)
		require.NoError(t, err)
		require.NotNil(t, res)
		if res.Body != nil {
			require.NoError(t, res.Body.Close())
		}
		require.Len(t, ctx.callChain, 1)
		require.ElementsMatch(t, []string{"finalrt"}, ctx.callChain)
	})

	t.Run("With custom headers set should apply HTTP headers to the request", func(t *testing.T) {
		ctx := &testContext{}
		finalRoundTripper := ctx.createRoundTripper("final")
		customHeaders := CustomHeadersMiddleware()
		rt := customHeaders.CreateMiddleware(Options{Headers: map[string]string{
			"X-HeaderOne":   "ValueOne",
			"X-HeaderTwo":   "ValueTwo",
			"X-HeaderThree": "ValueThree",
		}}, finalRoundTripper)
		require.NotNil(t, rt)
		middlewareName, ok := customHeaders.(MiddlewareName)
		require.True(t, ok)
		require.Equal(t, CustomHeadersMiddlewareName, middlewareName.MiddlewareName())

		req, err := http.NewRequest(http.MethodGet, "http://", nil)
		require.NoError(t, err)
		res, err := rt.RoundTrip(req)
		require.NoError(t, err)
		require.NotNil(t, res)
		if res.Body != nil {
			require.NoError(t, res.Body.Close())
		}
		require.Len(t, ctx.callChain, 1)
		require.ElementsMatch(t, []string{"final"}, ctx.callChain)

		require.Equal(t, "ValueOne", req.Header.Get("X-HeaderOne"))
		require.Equal(t, "ValueTwo", req.Header.Get("X-HeaderTwo"))
		require.Equal(t, "ValueThree", req.Header.Get("X-HeaderThree"))
	})
}
