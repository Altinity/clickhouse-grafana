package httpclient

import (
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBasicAuthMiddleware(t *testing.T) {
	t.Run("Without basic auth options should return next http.RoundTripper", func(t *testing.T) {
		ctx := &testContext{}
		finalRoundTripper := ctx.createRoundTripper("final")
		basicAuth := BasicAuthenticationMiddleware()
		rt := basicAuth.CreateMiddleware(Options{}, finalRoundTripper)
		require.NotNil(t, rt)
		middlewareName, ok := basicAuth.(MiddlewareName)
		require.True(t, ok)
		require.Equal(t, BasicAuthenticationMiddlewareName, middlewareName.MiddlewareName())

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
	})

	t.Run("With basic auth options should apply basic auth authentication HTTP header to the request", func(t *testing.T) {
		ctx := &testContext{}
		finalRoundTripper := ctx.createRoundTripper("final")
		basicAuth := BasicAuthenticationMiddleware()
		rt := basicAuth.CreateMiddleware(Options{BasicAuth: &BasicAuthOptions{User: "user1", Password: "pwd"}}, finalRoundTripper)
		require.NotNil(t, rt)
		middlewareName, ok := basicAuth.(MiddlewareName)
		require.True(t, ok)
		require.Equal(t, BasicAuthenticationMiddlewareName, middlewareName.MiddlewareName())

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

		authHeader := req.Header.Get("Authorization")
		require.NotEmpty(t, authHeader)
		require.True(t, strings.HasPrefix(authHeader, "Basic"))
		user, password, ok := req.BasicAuth()
		require.True(t, ok)
		require.Equal(t, "user1", user)
		require.Equal(t, "pwd", password)
	})

	t.Run("With basic auth options should not apply basic auth authentication HTTP header to the request if header already set", func(t *testing.T) {
		ctx := &testContext{}
		finalRoundTripper := ctx.createRoundTripper("final")
		basicAuth := BasicAuthenticationMiddleware()
		rt := basicAuth.CreateMiddleware(Options{BasicAuth: &BasicAuthOptions{User: "user1", Password: "pwd"}}, finalRoundTripper)
		require.NotNil(t, rt)
		middlewareName, ok := basicAuth.(MiddlewareName)
		require.True(t, ok)
		require.Equal(t, BasicAuthenticationMiddlewareName, middlewareName.MiddlewareName())

		req, err := http.NewRequest(http.MethodGet, "http://", nil)
		require.NoError(t, err)
		req.Header.Set("Authorization", "test")
		res, err := rt.RoundTrip(req)
		require.NoError(t, err)
		require.NotNil(t, res)
		if res.Body != nil {
			require.NoError(t, res.Body.Close())
		}
		require.Len(t, ctx.callChain, 1)
		require.ElementsMatch(t, []string{"final"}, ctx.callChain)

		authHeader := req.Header.Get("Authorization")
		require.Equal(t, "test", authHeader)
	})
}
