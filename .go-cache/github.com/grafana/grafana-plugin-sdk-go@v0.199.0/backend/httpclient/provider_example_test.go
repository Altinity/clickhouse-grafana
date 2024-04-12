package httpclient_test

import (
	"log"
	"net/http"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

func ExampleNewProvider() {
	provider := httpclient.NewProvider(httpclient.ProviderOptions{Middlewares: []httpclient.Middleware{httpclient.CustomHeadersMiddleware()}})
	log.Printf("Middleware length: %d", len(provider.Opts.Middlewares))
}

func ExampleProvider_New() {
	provider := httpclient.NewProvider(httpclient.ProviderOptions{Middlewares: []httpclient.Middleware{httpclient.CustomHeadersMiddleware()}})

	client, err := provider.New(httpclient.Options{
		Timeouts: &httpclient.TimeoutOptions{
			Timeout: 5 * time.Second,
		},
		Middlewares: []httpclient.Middleware{
			httpclient.MiddlewareFunc(func(opts httpclient.Options, next http.RoundTripper) http.RoundTripper {
				return httpclient.RoundTripperFunc(func(req *http.Request) (*http.Response, error) {
					log.Println("Before outgoing request")
					res, err := next.RoundTrip(req)
					log.Println("After outgoing request")
					return res, err
				})
			}),
		},
	})
	if err != nil {
		log.Fatalf("failed to create HTTP client. error: %s", err)
	}

	rsp, err := client.Get("http://www.google.com")
	if err != nil {
		log.Fatalf("failed to GET. error: %s", err)
	}
	if err := rsp.Body.Close(); err != nil {
		log.Printf("failed to close response body. error: %s", err)
	}

	log.Printf("Got response: %v", rsp.StatusCode)
}

func ExampleProvider_GetTransport() {
	provider := httpclient.NewProvider(httpclient.ProviderOptions{Middlewares: []httpclient.Middleware{httpclient.CustomHeadersMiddleware()}})

	transport, err := provider.GetTransport(httpclient.Options{
		Timeouts: &httpclient.TimeoutOptions{
			Timeout: 5 * time.Second,
		},
		Middlewares: []httpclient.Middleware{
			httpclient.MiddlewareFunc(func(opts httpclient.Options, next http.RoundTripper) http.RoundTripper {
				return httpclient.RoundTripperFunc(func(req *http.Request) (*http.Response, error) {
					log.Println("Before outgoing request")
					res, err := next.RoundTrip(req)
					log.Println("After outgoing request")
					return res, err
				})
			}),
		},
	})
	if err != nil {
		log.Fatalf("failed to get HTTP transport. error: %s", err)
	}

	client := http.Client{
		Transport: transport,
	}

	rsp, err := client.Get("http://www.google.com")
	if err != nil {
		log.Fatalf("failed to GET. error: %s", err)
	}
	if err := rsp.Body.Close(); err != nil {
		log.Printf("failed to close response body. error: %s", err)
	}

	log.Printf("Got response: %v", rsp.StatusCode)
}

func ExampleProvider_GetTLSConfig() {
	provider := httpclient.NewProvider(httpclient.ProviderOptions{Middlewares: []httpclient.Middleware{httpclient.CustomHeadersMiddleware()}})
	tlsConfig, err := provider.GetTLSConfig(httpclient.Options{
		TLS: &httpclient.TLSOptions{
			InsecureSkipVerify: true,
		}})
	if err != nil {
		log.Fatalf("failed to get TLS config. error: %s", err)
	}

	client := http.Client{
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
	}

	rsp, err := client.Get("http://www.google.com")
	if err != nil {
		log.Fatalf("failed to GET. error: %s", err)
	}
	if err := rsp.Body.Close(); err != nil {
		log.Printf("failed to close response body. error: %s", err)
	}

	log.Printf("Got response: %v", rsp.StatusCode)
}
