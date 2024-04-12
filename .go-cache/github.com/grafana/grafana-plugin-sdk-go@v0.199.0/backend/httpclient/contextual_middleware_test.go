package httpclient

import (
	"context"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestContextualMiddleware(t *testing.T) {
	t.Run("Without contextual middlewares should return next http.RoundTripper", func(t *testing.T) {
		ctx := &testContext{}
		finalRoundTripper := ctx.createRoundTripper("final")
		ctxMiddleware := ContextualMiddleware()
		rt := ctxMiddleware.CreateMiddleware(Options{}, finalRoundTripper)
		require.NotNil(t, rt)
		middlewareName, ok := ctxMiddleware.(MiddlewareName)
		require.True(t, ok)
		require.Equal(t, ContextualMiddlewareName, middlewareName.MiddlewareName())

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

	t.Run("With contextual middleware should apply additional middlewares to the request", func(t *testing.T) {
		tCtx := &testContext{}
		finalRoundTripper := tCtx.createRoundTripper("final")
		ctxMiddleware := ContextualMiddleware()

		middlewares := []Middleware{
			tCtx.createMiddleware("mw1"),
			tCtx.createMiddleware("mw2"),
			tCtx.createMiddleware("mw3"),
			ctxMiddleware,
		}
		rt := roundTripperFromMiddlewares(Options{}, middlewares, finalRoundTripper)
		require.NotNil(t, rt)
		middlewareName, ok := ctxMiddleware.(MiddlewareName)
		require.True(t, ok)
		require.Equal(t, ContextualMiddlewareName, middlewareName.MiddlewareName())

		ctx := context.Background()
		ctx = WithContextualMiddleware(ctx, tCtx.createMiddleware("ctxmw1"))
		ctx = WithContextualMiddleware(ctx, tCtx.createMiddleware("ctxmw2"))
		ctx = WithContextualMiddleware(ctx, tCtx.createMiddleware("ctxmw3"))
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://", nil)
		require.NoError(t, err)
		res, err := rt.RoundTrip(req)
		require.NoError(t, err)
		require.NotNil(t, res)
		if res.Body != nil {
			require.NoError(t, res.Body.Close())
		}
		require.Len(t, tCtx.callChain, 13)
		require.ElementsMatch(t, []string{
			"before mw1",
			"before mw2",
			"before mw3",
			"before ctxmw1",
			"before ctxmw2",
			"before ctxmw3",
			"final",
			"after ctxmw3",
			"after ctxmw2",
			"after ctxmw1",
			"after mw3",
			"after mw2",
			"after mw1",
		}, tCtx.callChain)
	})
}
