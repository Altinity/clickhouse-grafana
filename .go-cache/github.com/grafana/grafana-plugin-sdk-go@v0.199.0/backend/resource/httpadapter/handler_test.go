package httpadapter

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

func TestHttpResourceHandler(t *testing.T) {
	t.Run("Given http resource handler and calling CallResource", func(t *testing.T) {
		testSender := newTestCallResourceResponseSender()
		httpHandler := &testHTTPHandler{
			responseHeaders: map[string][]string{
				"X-Header-Out-1": {"A", "B"},
				"X-Header-Out-2": {"C"},
			},
			responseData: map[string]interface{}{
				"message": "hello client",
			},
			responseStatus: http.StatusCreated,
		}
		resourceHandler := New(httpHandler)

		jsonMap := map[string]interface{}{
			"message": "hello server",
		}
		reqBody, err := json.Marshal(&jsonMap)
		require.NoError(t, err)

		req := &backend.CallResourceRequest{
			PluginContext: backend.PluginContext{
				OrgID:    3,
				PluginID: "my-plugin",
				User:     &backend.User{Name: "foobar", Email: "foo@bar.com", Login: "foo@bar.com"},
				DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
					ID:               2,
					Name:             "my-ds",
					URL:              "http://",
					Database:         "db123",
					User:             "usr",
					BasicAuthEnabled: true,
					BasicAuthUser:    "busr",
				},
			},
			Method: http.MethodPost,
			Path:   "path",
			URL:    "/api/plugins/plugin-abc/resources/path?query=1",
			Headers: map[string][]string{
				"X-Header-In-1": {"D", "E"},
				"X-Header-In-2": {"F"},
			},
			Body: reqBody,
		}
		err = resourceHandler.CallResource(context.Background(), req, testSender)
		require.NoError(t, err)
		require.Equal(t, 1, httpHandler.callerCount)

		t.Run("Should provide expected request to http handler", func(t *testing.T) {
			require.NotNil(t, httpHandler.req)
			require.Equal(t, "/path?query=1", httpHandler.req.URL.String())
			require.Equal(t, req.Method, httpHandler.req.Method)
			require.Contains(t, httpHandler.req.Header, "X-Header-In-1")
			require.Equal(t, []string{"D", "E"}, httpHandler.req.Header["X-Header-In-1"])
			require.Contains(t, httpHandler.req.Header, "X-Header-In-2")
			require.Equal(t, []string{"F"}, httpHandler.req.Header["X-Header-In-2"])
			require.NotNil(t, httpHandler.req.Body)
			defer httpHandler.req.Body.Close()
			actualBodyBytes, err := io.ReadAll(httpHandler.req.Body)
			require.NoError(t, err)
			var actualJSONMap map[string]interface{}
			err = json.Unmarshal(actualBodyBytes, &actualJSONMap)
			require.NoError(t, err)
			require.Contains(t, actualJSONMap, "message")
			require.Equal(t, "hello server", actualJSONMap["message"])
		})

		t.Run("Should return expected response from http handler", func(t *testing.T) {
			require.Len(t, testSender.respMessages, 1)
			resp := testSender.respMessages[0]
			require.NotNil(t, resp)
			require.NoError(t, httpHandler.writeErr)
			require.NotNil(t, resp)
			require.Equal(t, http.StatusCreated, resp.Status)
			require.Contains(t, resp.Headers, "X-Header-Out-1")
			require.Equal(t, []string{"A", "B"}, resp.Headers["X-Header-Out-1"])
			require.Contains(t, resp.Headers, "X-Header-Out-2")
			require.Equal(t, []string{"C"}, resp.Headers["X-Header-Out-2"])
			var actualJSONMap map[string]interface{}
			err = json.Unmarshal(resp.Body, &actualJSONMap)
			require.NoError(t, err)
			require.Contains(t, actualJSONMap, "message")
			require.Equal(t, "hello client", actualJSONMap["message"])
		})

		t.Run("Should be able to get plugin config from request context", func(t *testing.T) {
			require.NotNil(t, httpHandler.req)
			actualPluginCtx := PluginConfigFromContext(httpHandler.req.Context())
			require.NotNil(t, actualPluginCtx)
			require.Equal(t, req.PluginContext.OrgID, actualPluginCtx.OrgID)
			require.Equal(t, req.PluginContext.PluginID, actualPluginCtx.PluginID)
			require.NotNil(t, actualPluginCtx.DataSourceInstanceSettings)
			require.Equal(t, req.PluginContext.DataSourceInstanceSettings.ID, actualPluginCtx.DataSourceInstanceSettings.ID)
			require.Equal(t, req.PluginContext.DataSourceInstanceSettings.Name, actualPluginCtx.DataSourceInstanceSettings.Name)
			require.Equal(t, req.PluginContext.DataSourceInstanceSettings.URL, actualPluginCtx.DataSourceInstanceSettings.URL)
			require.Equal(t, req.PluginContext.DataSourceInstanceSettings.User, actualPluginCtx.DataSourceInstanceSettings.User)
			require.Equal(t, req.PluginContext.DataSourceInstanceSettings.Database, actualPluginCtx.DataSourceInstanceSettings.Database)
			require.Equal(t, req.PluginContext.DataSourceInstanceSettings.BasicAuthEnabled, actualPluginCtx.DataSourceInstanceSettings.BasicAuthEnabled)
			require.Equal(t, req.PluginContext.DataSourceInstanceSettings.BasicAuthUser, actualPluginCtx.DataSourceInstanceSettings.BasicAuthUser)

			user := UserFromContext(httpHandler.req.Context())
			require.NotNil(t, user)
			require.Equal(t, req.PluginContext.User.Name, "foobar")
			require.Equal(t, req.PluginContext.User.Login, "foo@bar.com")
			require.Equal(t, req.PluginContext.User.Email, "foo@bar.com")
		})
	})

	t.Run("Given streaming http resource handler and calling CallResource", func(t *testing.T) {
		testSender := newTestCallResourceResponseSender()
		httpHandler := &testStreamingHTTPHandler{
			responseHeaders: map[string][]string{
				"X-Header-Out-1": {"A", "B"},
				"X-Header-Out-2": {"C"},
			},
			responseData: [][]byte{
				[]byte("hello"),
				[]byte("world"),
				[]byte("bye bye"),
			},
			responseStatus: http.StatusOK,
		}
		resourceHandler := New(httpHandler)
		req := &backend.CallResourceRequest{
			PluginContext: backend.PluginContext{
				OrgID:    3,
				PluginID: "my-plugin",
			},
			Method: http.MethodPost,
			Path:   "path",
			URL:    "/api/plugins/plugin-abc/resources/path?query=1",
			Headers: map[string][]string{
				"X-Header-In-1": {"D", "E"},
				"X-Header-In-2": {"F"},
			},
		}
		err := resourceHandler.CallResource(context.Background(), req, testSender)
		require.NoError(t, err)
		require.Equal(t, 1, httpHandler.callerCount)

		t.Run("Should return expected response from http handler", func(t *testing.T) {
			require.Len(t, testSender.respMessages, 3)
			resp1 := testSender.respMessages[0]
			require.NotNil(t, resp1)
			require.NoError(t, httpHandler.writeErr)
			require.NotNil(t, resp1)
			require.Equal(t, http.StatusOK, resp1.Status)
			require.Contains(t, resp1.Headers, "X-Header-Out-1")
			require.Equal(t, []string{"A", "B"}, resp1.Headers["X-Header-Out-1"])
			require.Contains(t, resp1.Headers, "X-Header-Out-2")
			require.Equal(t, []string{"C"}, resp1.Headers["X-Header-Out-2"])
			require.Equal(t, "hello", string(resp1.Body))

			resp2 := testSender.respMessages[1]
			require.NotNil(t, resp2)
			require.Equal(t, "world", string(resp2.Body))

			resp3 := testSender.respMessages[2]
			require.NotNil(t, resp3)
			require.Equal(t, "bye bye", string(resp3.Body))
		})
	})
}

func TestServeMuxHandler(t *testing.T) {
	t.Run("Given http resource ServeMux handler and calling CallResource", func(t *testing.T) {
		testSender := newTestCallResourceResponseSender()
		mux := http.NewServeMux()
		handlerWasCalled := false
		mux.HandleFunc("/test", func(rw http.ResponseWriter, req *http.Request) {
			handlerWasCalled = true
		})
		resourceHandler := New(mux)

		req := &backend.CallResourceRequest{
			PluginContext: backend.PluginContext{
				OrgID:    3,
				PluginID: "my-plugin",
			},
			Method: http.MethodGet,
			Path:   "test",
			URL:    "/test?query=1",
		}
		err := resourceHandler.CallResource(context.Background(), req, testSender)
		require.NoError(t, err)
		require.True(t, handlerWasCalled)
	})
}

type testHTTPHandler struct {
	responseStatus  int
	responseHeaders map[string][]string
	responseData    map[string]interface{}
	callerCount     int
	req             *http.Request
	writeErr        error
}

func (h *testHTTPHandler) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	h.callerCount++
	h.req = req

	if h.responseHeaders != nil {
		for k, values := range h.responseHeaders {
			for _, v := range values {
				rw.Header().Add(k, v)
			}
		}
	}

	if h.responseStatus != 0 {
		rw.WriteHeader(h.responseStatus)
	} else {
		rw.WriteHeader(200)
	}

	if h.responseData != nil {
		body, _ := json.Marshal(&h.responseData)
		_, h.writeErr = rw.Write(body)
	}
}

type testStreamingHTTPHandler struct {
	responseStatus  int
	responseHeaders map[string][]string
	responseData    [][]byte
	callerCount     int
	req             *http.Request
	writeErr        error
}

func (h *testStreamingHTTPHandler) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	h.callerCount++
	h.req = req

	if h.responseHeaders != nil {
		for k, values := range h.responseHeaders {
			for _, v := range values {
				rw.Header().Add(k, v)
			}
		}
	}

	if h.responseStatus != 0 {
		rw.WriteHeader(h.responseStatus)
	} else {
		rw.WriteHeader(200)
	}

	for _, bytes := range h.responseData {
		_, h.writeErr = rw.Write(bytes)
		rw.(http.Flusher).Flush()
	}
}

type testCallResourceResponseSender struct {
	respMessages []*backend.CallResourceResponse
}

func newTestCallResourceResponseSender() *testCallResourceResponseSender {
	return &testCallResourceResponseSender{
		respMessages: []*backend.CallResourceResponse{},
	}
}

func (s *testCallResourceResponseSender) Send(resp *backend.CallResourceResponse) error {
	s.respMessages = append(s.respMessages, resp)
	return nil
}
