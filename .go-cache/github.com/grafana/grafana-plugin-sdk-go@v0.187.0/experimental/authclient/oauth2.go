package authclient

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/clientcredentials"
	"golang.org/x/oauth2/jwt"
)

// OAuth2Type defines type of oauth2 grant type
type OAuth2Type string

const (
	OAuth2TypeClientCredentials OAuth2Type = "client_credentials"
	OAuth2TypeJWT               OAuth2Type = "jwt"
)

// OAuth2Options defines options for OAuth2 Client
type OAuth2Options struct {
	OAuth2Type     OAuth2Type
	TokenURL       string
	Scopes         []string
	ClientID       string
	ClientSecret   string
	EndpointParams map[string]string
	Subject        string
	Email          string
	PrivateKey     []byte
	PrivateKeyID   string
}

func getOAuth2Client(client *http.Client, oAuth2Options OAuth2Options) (o *http.Client, err error) {
	switch oAuth2Options.OAuth2Type {
	case OAuth2TypeClientCredentials:
		return getOAuth2ClientCredentialsClient(client, oAuth2Options)
	case OAuth2TypeJWT:
		return getOAuth2JWTClient(client, oAuth2Options)
	}
	return client, fmt.Errorf("invalid/empty oauth2 type (%s)", oAuth2Options.OAuth2Type)
}

func getOAuth2ClientCredentialsClient(client *http.Client, options OAuth2Options) (*http.Client, error) {
	config := clientcredentials.Config{
		TokenURL:       options.TokenURL,
		Scopes:         sanitizeOAuth2Scopes(options),
		EndpointParams: sanitizeOAuth2EndpointParams(options),
		ClientID:       options.ClientID,
		ClientSecret:   options.ClientSecret,
	}
	if client == nil {
		return config.Client(context.Background()), nil
	}
	ctx := context.WithValue(context.Background(), oauth2.HTTPClient, client)
	return config.Client(ctx), nil
}

func getOAuth2JWTClient(client *http.Client, options OAuth2Options) (*http.Client, error) {
	config := jwt.Config{
		TokenURL:     options.TokenURL,
		Scopes:       sanitizeOAuth2Scopes(options),
		PrivateKey:   options.PrivateKey,
		PrivateKeyID: options.PrivateKeyID,
		Email:        options.Email,
		Subject:      options.Subject,
	}
	if client == nil {
		return config.Client(context.Background()), nil
	}
	ctx := context.WithValue(context.Background(), oauth2.HTTPClient, client)
	return config.Client(ctx), nil
}

func sanitizeOAuth2Scopes(options OAuth2Options) []string {
	scopes := []string{}
	for _, scope := range options.Scopes {
		if scope != "" {
			scopes = append(scopes, strings.TrimSpace(scope))
		}
	}
	return scopes
}

func sanitizeOAuth2EndpointParams(options OAuth2Options) url.Values {
	endpointParams := url.Values{}
	for k, v := range options.EndpointParams {
		if k != "" && v != "" {
			endpointParams.Set(strings.TrimSpace(k), strings.TrimSpace(v))
		}
	}
	return endpointParams
}
