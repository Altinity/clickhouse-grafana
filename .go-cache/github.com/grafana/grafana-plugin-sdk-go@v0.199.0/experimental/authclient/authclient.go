package authclient

import (
	"errors"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

// New auth client which is basically a http client but specific functionalities implemented depends on AuthMethod
func New(httpOptions httpclient.Options, options AuthOptions) (client *http.Client, err error) {
	defaultClient, err := httpclient.New(httpOptions)
	if err != nil {
		return nil, err
	}
	switch options.AuthMethod {
	case AuthMethodOAuth2:
		if options.OAuth2Options == nil {
			return nil, errors.New("invalid options for OAuth2 client")
		}
		return getOAuth2Client(defaultClient, *options.OAuth2Options)
	default:
		return defaultClient, nil
	}
}

// AuthOptions Auth client options. Based on the AuthenticationMethod, further properties will be validated
type AuthOptions struct {
	// AuthMethod ...
	AuthMethod AuthMethod
	// OAuth2Options ...
	OAuth2Options *OAuth2Options
}

// AuthMethod defines the type of authentication method that needs to be use.
type AuthMethod string

const (
	// AuthMethodOAuth2 is oauth2 type authentication.
	// Currently support client credentials and JWT type OAuth2 workflows.
	AuthMethodOAuth2 AuthMethod = "oauth2"
)
