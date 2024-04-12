package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/metadata"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/genproto/pluginv2"
	"github.com/grafana/grafana-plugin-sdk-go/internal/tenant"
)

func TestCallResource(t *testing.T) {
	t.Run("When call resource handler not set should return http status not implemented", func(t *testing.T) {
		testSender := newTestCallResourceServer()
		adapter := &resourceSDKAdapter{}
		err := adapter.CallResource(&pluginv2.CallResourceRequest{}, testSender)
		require.NoError(t, err)
		require.Len(t, testSender.respMessages, 1)
		resp := testSender.respMessages[0]
		require.NotNil(t, resp)
		require.Equal(t, http.StatusNotImplemented, int(resp.Code))
		require.Empty(t, resp.Headers)
		require.Empty(t, resp.Body)
	})

	t.Run("When call resource handler set should provide expected request and return expected response", func(t *testing.T) {
		data := map[string]interface{}{
			"message": "hello",
		}
		body, err := json.Marshal(&data)
		require.NoError(t, err)
		handler := &testCallResourceHandler{
			responseStatus: http.StatusOK,
			responseHeaders: map[string][]string{
				"X-Header-Out-1": {"D", "E"},
				"X-Header-Out-2": {"F"},
			},
			responseBody: body,
		}
		testSender := newTestCallResourceServer()
		adapter := newResourceSDKAdapter(handler)
		req := &pluginv2.CallResourceRequest{
			PluginContext: &pluginv2.PluginContext{
				OrgId:    2,
				PluginId: "my-plugin",
			},
			Path:   "some/path",
			Method: http.MethodGet,
			Url:    "plugins/test-plugin/resources/some/path?test=1",
			Headers: map[string]*pluginv2.StringList{
				"X-Header-In-1": {Values: []string{"A", "B"}},
				"X-Header-In-2": {Values: []string{"C"}},
			},
			Body: body,
		}
		err = adapter.CallResource(req, testSender)

		require.NoError(t, err)

		require.NotNil(t, handler.actualReq)
		require.Equal(t, int64(2), handler.actualReq.PluginContext.OrgID)
		require.Equal(t, "my-plugin", handler.actualReq.PluginContext.PluginID)
		require.Equal(t, "some/path", handler.actualReq.Path)
		require.Equal(t, http.MethodGet, handler.actualReq.Method)
		require.Equal(t, "plugins/test-plugin/resources/some/path?test=1", handler.actualReq.URL)
		require.Contains(t, handler.actualReq.Headers, "X-Header-In-1")
		require.Equal(t, []string{"A", "B"}, handler.actualReq.Headers["X-Header-In-1"])
		require.Contains(t, handler.actualReq.Headers, "X-Header-In-2")
		require.Equal(t, []string{"C"}, handler.actualReq.Headers["X-Header-In-2"])
		var actualRequestData map[string]interface{}
		err = json.Unmarshal(req.Body, &actualRequestData)
		require.NoError(t, err)
		require.Equal(t, data, actualRequestData)

		// response
		require.Len(t, testSender.respMessages, 1)
		resp := testSender.respMessages[0]
		require.NotNil(t, resp)
		require.Equal(t, http.StatusOK, int(resp.Code))
		require.Contains(t, resp.Headers, "X-Header-Out-1")
		require.Equal(t, []string{"D", "E"}, resp.Headers["X-Header-Out-1"].Values)
		require.Contains(t, resp.Headers, "X-Header-Out-2")
		require.Equal(t, []string{"F"}, resp.Headers["X-Header-Out-2"].Values)
		var actualResponseData map[string]interface{}
		err = json.Unmarshal(resp.Body, &actualResponseData)
		require.NoError(t, err)
		require.Equal(t, data, actualResponseData)
	})

	t.Run("When call resource handler set should result in expected streaming response", func(t *testing.T) {
		handler := &testCallResourceStreamHandler{
			responseStatus: http.StatusOK,
			responseHeaders: map[string][]string{
				"X-Header-Out-1": {"D", "E"},
				"X-Header-Out-2": {"F"},
			},
			responseMessages: [][]byte{
				[]byte("hello"),
				[]byte("world"),
				[]byte("over and out"),
			},
		}
		testSender := newTestCallResourceServer()
		adapter := newResourceSDKAdapter(handler)
		req := &pluginv2.CallResourceRequest{
			PluginContext: &pluginv2.PluginContext{
				OrgId:    2,
				PluginId: "my-plugin",
			},
			Path:    "some/path",
			Method:  http.MethodGet,
			Url:     "plugins/test-plugin/resources/some/path?test=1",
			Headers: map[string]*pluginv2.StringList{},
		}
		err := adapter.CallResource(req, testSender)

		require.NoError(t, err)

		// response
		require.Len(t, testSender.respMessages, 3)
		resp1 := testSender.respMessages[0]
		require.NotNil(t, resp1)
		require.Equal(t, http.StatusOK, int(resp1.Code))
		require.Contains(t, resp1.Headers, "X-Header-Out-1")
		require.Equal(t, []string{"D", "E"}, resp1.Headers["X-Header-Out-1"].Values)
		require.Contains(t, resp1.Headers, "X-Header-Out-2")
		require.Equal(t, []string{"F"}, resp1.Headers["X-Header-Out-2"].Values)
		require.Equal(t, "hello", string(resp1.Body))

		resp2 := testSender.respMessages[1]
		require.NotNil(t, resp2)
		require.Equal(t, "world", string(resp2.Body))

		resp3 := testSender.respMessages[2]
		require.NotNil(t, resp3)
		require.Equal(t, "over and out", string(resp3.Body))
	})

	t.Run("When oauth headers are set it should set the middleware to set headers", func(t *testing.T) {
		testSender := newTestCallResourceServer()
		adapter := newResourceSDKAdapter(&testCallResourceWithHeaders{})
		err := adapter.CallResource(&pluginv2.CallResourceRequest{
			PluginContext: &pluginv2.PluginContext{},
			Headers: map[string]*pluginv2.StringList{
				"Authorization": {
					Values: []string{"Bearer 123"},
				},
			},
		}, testSender)
		require.NoError(t, err)
	})

	t.Run("When tenant information is attached to incoming context, it is propagated from adapter to handler", func(t *testing.T) {
		tid := "123456"
		a := newResourceSDKAdapter(CallResourceHandlerFunc(func(ctx context.Context, req *CallResourceRequest, sender CallResourceResponseSender) error {
			require.Equal(t, tid, tenant.IDFromContext(ctx))
			return nil
		}))

		testSender := newTestCallResourceServer()
		testSender.WithContext(metadata.NewIncomingContext(context.Background(), metadata.New(map[string]string{
			tenant.CtxKey: tid,
		})))

		err := a.CallResource(&pluginv2.CallResourceRequest{
			PluginContext: &pluginv2.PluginContext{},
		}, testSender)
		require.NoError(t, err)
	})
}

type testCallResourceHandler struct {
	responseStatus  int
	responseHeaders map[string][]string
	responseBody    []byte
	responseErr     error
	actualReq       *CallResourceRequest
}

func (h *testCallResourceHandler) CallResource(_ context.Context, req *CallResourceRequest, sender CallResourceResponseSender) error {
	h.actualReq = req
	err := sender.Send(&CallResourceResponse{
		Status:  h.responseStatus,
		Headers: h.responseHeaders,
		Body:    h.responseBody,
	})
	if err != nil {
		return err
	}

	return h.responseErr
}

type testCallResourceStreamHandler struct {
	responseStatus   int
	responseHeaders  map[string][]string
	responseMessages [][]byte
	responseErr      error
}

func (h *testCallResourceStreamHandler) CallResource(_ context.Context, _ *CallResourceRequest, sender CallResourceResponseSender) error {
	err := sender.Send(&CallResourceResponse{
		Status:  h.responseStatus,
		Headers: h.responseHeaders,
		Body:    h.responseMessages[0],
	})
	if err != nil {
		return err
	}

	for _, msg := range h.responseMessages[1:] {
		err := sender.Send(&CallResourceResponse{
			Body: msg,
		})
		if err != nil {
			return err
		}
	}

	return h.responseErr
}

type testCallResourceServer struct {
	ctx          context.Context
	respMessages []*pluginv2.CallResourceResponse
}

func newTestCallResourceServer() *testCallResourceServer {
	return &testCallResourceServer{
		respMessages: []*pluginv2.CallResourceResponse{},
		ctx:          context.Background(),
	}
}

func (srv *testCallResourceServer) Send(resp *pluginv2.CallResourceResponse) error {
	srv.respMessages = append(srv.respMessages, resp)
	return nil
}

func (srv *testCallResourceServer) SetHeader(metadata.MD) error {
	return nil
}

func (srv *testCallResourceServer) SendHeader(metadata.MD) error {
	return nil
}

func (srv *testCallResourceServer) SetTrailer(metadata.MD) {

}

func (srv *testCallResourceServer) Context() context.Context {
	return srv.ctx
}

func (srv *testCallResourceServer) SendMsg(_ interface{}) error {
	return nil
}

func (srv *testCallResourceServer) RecvMsg(_ interface{}) error {
	return nil
}

func (srv *testCallResourceServer) WithContext(ctx context.Context) {
	srv.ctx = ctx
}

type testCallResourceWithHeaders struct{}

func (h *testCallResourceWithHeaders) CallResource(ctx context.Context, _ *CallResourceRequest, _ CallResourceResponseSender) error {
	middlewares := httpclient.ContextualMiddlewareFromContext(ctx)
	if len(middlewares) == 0 {
		return fmt.Errorf("no middlewares found")
	}
	return nil
}
