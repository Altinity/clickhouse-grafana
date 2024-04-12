package oauthtokenretriever

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/clientcredentials"
)

const (
	AppURL        = "GF_APP_URL"
	AppClientID   = "GF_PLUGIN_APP_CLIENT_ID"
	AppPrivateKey = "GF_PLUGIN_APP_PRIVATE_KEY"
	// nolint:gosec
	// AppClientSecret constant represents a string index value for the secret, not the secret itself.
	AppClientSecret = "GF_PLUGIN_APP_CLIENT_SECRET"
)

type TokenRetriever interface {
	OnBehalfOfUser(ctx context.Context, userID string) (string, error)
	Self(ctx context.Context) (string, error)
}

type tokenRetriever struct {
	signer signer
	conf   *clientcredentials.Config
}

// tokenPayload returns a JWT payload for the given user ID, client ID, and host.
func (t *tokenRetriever) tokenPayload(userID string) map[string]interface{} {
	iat := time.Now().Unix()
	exp := iat + 1800
	u := uuid.New()
	payload := map[string]interface{}{
		"iss": t.conf.ClientID,
		"sub": fmt.Sprintf("user:id:%s", userID),
		"aud": t.conf.TokenURL,
		"exp": exp,
		"iat": iat,
		"jti": u.String(),
	}
	return payload
}

func (t *tokenRetriever) Self(ctx context.Context) (string, error) {
	t.conf.EndpointParams = url.Values{}
	tok, err := t.conf.TokenSource(ctx).Token()
	if err != nil {
		return "", err
	}
	return tok.AccessToken, nil
}

func (t *tokenRetriever) OnBehalfOfUser(ctx context.Context, userID string) (string, error) {
	signed, err := t.signer.sign(t.tokenPayload(userID))
	if err != nil {
		return "", err
	}

	t.conf.EndpointParams = url.Values{
		"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"},
		"assertion":  {signed},
	}
	tok, err := t.conf.TokenSource(ctx).Token()
	if err != nil {
		return "", err
	}

	return tok.AccessToken, nil
}

func New() (TokenRetriever, error) {
	// The Grafana URL is required to obtain tokens later on
	grafanaAppURL := strings.TrimRight(os.Getenv(AppURL), "/")
	if grafanaAppURL == "" {
		// For debugging purposes only
		grafanaAppURL = "http://localhost:3000"
	}

	clientID := os.Getenv(AppClientID)
	if clientID == "" {
		return nil, fmt.Errorf("GF_PLUGIN_APP_CLIENT_ID is required")
	}

	clientSecret := os.Getenv(AppClientSecret)
	if clientSecret == "" {
		return nil, fmt.Errorf("GF_PLUGIN_APP_CLIENT_SECRET is required")
	}

	privateKey := os.Getenv(AppPrivateKey)
	if privateKey == "" {
		return nil, fmt.Errorf("GF_PLUGIN_APP_PRIVATE_KEY is required")
	}

	signer, err := parsePrivateKey([]byte(privateKey))
	if err != nil {
		return nil, err
	}

	return &tokenRetriever{
		signer: signer,
		conf: &clientcredentials.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			TokenURL:     grafanaAppURL + "/oauth2/token",
			AuthStyle:    oauth2.AuthStyleInParams,
			Scopes:       []string{"profile", "email", "entitlements"},
		},
	}, nil
}
