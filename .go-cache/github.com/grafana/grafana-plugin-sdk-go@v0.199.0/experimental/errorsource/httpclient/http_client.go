package httpclient

import (
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/errorsource"
)

const name = "errorsource"

// New wraps the existing http client constructor and adds the error source middleware
func New(opts ...httpclient.Options) (*http.Client, error) {
	if len(opts) == 0 {
		opts = append(opts, httpclient.Options{
			Middlewares: httpclient.DefaultMiddlewares(),
		})
	}
	if len(opts[0].Middlewares) == 0 {
		opts[0].Middlewares = httpclient.DefaultMiddlewares()
	}
	opts[0].Middlewares = append(opts[0].Middlewares, errorsource.Middleware(name))
	return httpclient.New(opts...)
}
