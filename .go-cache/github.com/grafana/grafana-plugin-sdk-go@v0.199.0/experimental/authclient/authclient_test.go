package authclient_test

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/authclient"
)

const (
	handlerToken = "/token"
	handlerFoo   = "/foo"
)

func TestNew(t *testing.T) {
	t.Run("oauth2", func(t *testing.T) {
		server := getOAuthServer(t)
		defer server.Close()
		t.Run("client credentials", func(t *testing.T) {
			t.Run("valid client credentials", func(t *testing.T) {
				hc, err := authclient.New(httpclient.Options{
					Headers: map[string]string{"h1": "v1"},
				}, authclient.AuthOptions{
					AuthMethod: authclient.AuthMethodOAuth2,
					OAuth2Options: &authclient.OAuth2Options{
						OAuth2Type: authclient.OAuth2TypeClientCredentials,
						TokenURL:   server.URL + handlerToken,
					},
				})
				require.Nil(t, err)
				require.NotNil(t, hc)
				res, err := hc.Get(server.URL + handlerFoo)
				require.Nil(t, err)
				require.NotNil(t, res)
				if res != nil && res.Body != nil {
					defer res.Body.Close()
				}
				bodyBytes, err := io.ReadAll(res.Body)
				require.Nil(t, err)
				assert.Equal(t, http.StatusOK, res.StatusCode)
				assert.Equal(t, `"hello world"`, string(bodyBytes))
			})
			t.Run("valid client credentials with basic auth settings", func(t *testing.T) {
				hc, err := authclient.New(httpclient.Options{
					Headers:   map[string]string{"h1": "v1"},
					BasicAuth: &httpclient.BasicAuthOptions{User: "userFoo", Password: "pwdBar"},
				}, authclient.AuthOptions{
					AuthMethod: authclient.AuthMethodOAuth2,
					OAuth2Options: &authclient.OAuth2Options{
						OAuth2Type: authclient.OAuth2TypeClientCredentials,
						TokenURL:   server.URL + handlerToken,
					},
				})
				require.Nil(t, err)
				require.NotNil(t, hc)
				res, err := hc.Get(server.URL + handlerFoo)
				require.Nil(t, err)
				require.NotNil(t, res)
				if res != nil && res.Body != nil {
					defer res.Body.Close()
				}
				bodyBytes, err := io.ReadAll(res.Body)
				require.Nil(t, err)
				assert.Equal(t, http.StatusOK, res.StatusCode)
				assert.Equal(t, `"hello world"`, string(bodyBytes))
			})
		})
		t.Run("jwt", func(t *testing.T) {
			t.Run("invalid private key", func(t *testing.T) {
				privateKey := generateKey(t, true)
				hc, err := authclient.New(httpclient.Options{
					Headers: map[string]string{"h1": "v1"},
				}, authclient.AuthOptions{
					AuthMethod: authclient.AuthMethodOAuth2,
					OAuth2Options: &authclient.OAuth2Options{
						OAuth2Type: authclient.OAuth2TypeJWT,
						TokenURL:   server.URL + handlerToken,
						PrivateKey: privateKey,
					},
				})
				require.Nil(t, err)
				require.NotNil(t, hc)
				res, err := hc.Get(server.URL + handlerFoo)
				if res != nil && res.Body != nil {
					defer res.Body.Close()
				}
				require.NotNil(t, err)
				assert.True(t, strings.Contains(err.Error(), "private key should be a PEM or plain PKCS1 or PKCS8; parse error: asn1: structure error"))
				require.Nil(t, res)
			})
			t.Run("valid private key", func(t *testing.T) {
				privateKey := generateKey(t, false)
				hc, err := authclient.New(httpclient.Options{
					Headers: map[string]string{"h1": "v1"},
				}, authclient.AuthOptions{
					AuthMethod: authclient.AuthMethodOAuth2,
					OAuth2Options: &authclient.OAuth2Options{
						OAuth2Type: authclient.OAuth2TypeJWT,
						TokenURL:   server.URL + handlerToken,
						PrivateKey: privateKey,
					},
				})
				require.Nil(t, err)
				require.NotNil(t, hc)
				res, err := hc.Get(server.URL + handlerFoo)
				require.Nil(t, err)
				require.NotNil(t, res)
				if res != nil && res.Body != nil {
					defer res.Body.Close()
				}
				bodyBytes, err := io.ReadAll(res.Body)
				require.Nil(t, err)
				assert.Equal(t, http.StatusOK, res.StatusCode)
				assert.Equal(t, `"hello world"`, string(bodyBytes))
			})
		})
	})
}

func getOAuthServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		oAuth2TokenValue := "foo"
		t.Run("ensure custom headers propagated correctly", func(t *testing.T) {
			require.Equal(t, "v1", r.Header.Get("h1"))
		})
		if r.URL.String() == handlerToken {
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, fmt.Sprintf(`{"access_token": "%s", "refresh_token": "bar"}`, oAuth2TokenValue))
			return
		}
		t.Run("ensure oauth token correctly sets to the authorization header", func(t *testing.T) {
			require.Equal(t, fmt.Sprintf("Bearer %s", oAuth2TokenValue), r.Header.Get("Authorization"))
		})
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `"hello world"`)
	}))
}

func generateKey(t *testing.T, incorrectKey bool) (privateKey []byte) {
	t.Helper()
	if incorrectKey {
		return []byte("invalid private key")
	}
	key, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		panic(err)
	}
	privateKey = pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})
	return privateKey
}
