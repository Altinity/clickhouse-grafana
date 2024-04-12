package httpclient_test

import (
	"context"
	"log"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

func ExampleWithContextualMiddleware() {
	provider := httpclient.NewProvider()
	client, err := provider.New()
	if err != nil {
		log.Fatalf("failed to create HTTP client. error: %s", err)
	}

	parent := context.Background()
	ctx := httpclient.WithContextualMiddleware(parent,
		httpclient.MiddlewareFunc(func(opts httpclient.Options, next http.RoundTripper) http.RoundTripper {
			return httpclient.RoundTripperFunc(func(req *http.Request) (*http.Response, error) {
				req.Header.Set("X-Custom-Header", "val")

				return next.RoundTrip(req)
			})
		}))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://www.google.com", nil)
	if err != nil {
		log.Fatalf("failed to create request. error: %s", err)
	}

	rsp, err := client.Do(req)
	if err != nil {
		log.Fatalf("failed to GET. error: %s", err)
	}
	if err := rsp.Body.Close(); err != nil {
		log.Printf("failed to close response body. error: %s", err)
	}

	log.Printf("Got response: %v", rsp.StatusCode)
}
