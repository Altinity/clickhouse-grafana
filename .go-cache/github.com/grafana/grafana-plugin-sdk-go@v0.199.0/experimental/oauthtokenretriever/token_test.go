package oauthtokenretriever

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_GetExternalServiceToken(t *testing.T) {
	for _, test := range []struct {
		name   string
		userID string
	}{
		{"On Behalf Of", "1"},
		{"Service account", ""},
	} {
		t.Run(test.name, func(t *testing.T) {
			s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				b, err := io.ReadAll(r.Body)
				assert.NoError(t, err)
				if test.userID != "" {
					assert.Contains(t, string(b), "assertion=")
					assert.Contains(t, string(b), "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer")
				} else {
					assert.NotContains(t, string(b), "assertion=")
					assert.Contains(t, string(b), "grant_type=client_credentials")
				}
				assert.Contains(t, string(b), "client_id=test_client_id")
				assert.Contains(t, string(b), "client_secret=test_client_secret")

				w.Header().Set("Content-Type", "application/json")
				_, err = w.Write([]byte(`{"access_token":"test_token"}`))
				assert.NoError(t, err)
			}))
			defer s.Close()

			os.Setenv("GF_APP_URL", s.URL)
			defer os.Unsetenv("GF_APP_URL")
			os.Setenv("GF_PLUGIN_APP_CLIENT_ID", "test_client_id")
			defer os.Unsetenv("GF_PLUGIN_APP_CLIENT_ID")
			os.Setenv("GF_PLUGIN_APP_CLIENT_SECRET", "test_client_secret")
			defer os.Unsetenv("GF_PLUGIN_APP_CLIENT_SECRET")
			os.Setenv("GF_PLUGIN_APP_PRIVATE_KEY", testECDSAKey)
			defer os.Unsetenv("GF_PLUGIN_APP_PRIVATE_KEY")

			ss, err := New()
			assert.NoError(t, err)

			var token string
			if test.userID != "" {
				token, err = ss.OnBehalfOfUser(context.Background(), test.userID)
			} else {
				token, err = ss.Self(context.Background())
			}
			assert.NoError(t, err)
			assert.Equal(t, "test_token", token)
		})
	}
}
