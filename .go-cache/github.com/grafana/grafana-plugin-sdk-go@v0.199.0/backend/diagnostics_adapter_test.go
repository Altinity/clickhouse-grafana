package backend

import (
	"bytes"
	"context"
	"errors"
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/expfmt"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/metadata"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/genproto/pluginv2"
	"github.com/grafana/grafana-plugin-sdk-go/internal/tenant"
)

func TestCollectMetrcis(t *testing.T) {
	adapter := &diagnosticsSDKAdapter{
		metricGatherer: prometheus.DefaultGatherer,
	}
	res, err := adapter.CollectMetrics(context.Background(), &pluginv2.CollectMetricsRequest{})
	require.NoError(t, err)
	require.NotNil(t, res)
	require.NotNil(t, res.Metrics)
	require.NotNil(t, res.Metrics.Prometheus)

	reader := bytes.NewReader(res.Metrics.Prometheus)
	var parser expfmt.TextParser
	mfs, err := parser.TextToMetricFamilies(reader)
	require.NoError(t, err)
	require.Contains(t, mfs, "go_gc_duration_seconds")
	require.Contains(t, mfs, "go_goroutines")
}

func TestCheckHealth(t *testing.T) {
	t.Run("When check health handler not set should use default implementation", func(t *testing.T) {
		adapter := &diagnosticsSDKAdapter{}
		res, err := adapter.CheckHealth(context.Background(), &pluginv2.CheckHealthRequest{})
		require.NoError(t, err)
		require.NotNil(t, res)
		require.Equal(t, pluginv2.CheckHealthResponse_OK, res.Status)
		require.Empty(t, res.Message)
		require.Empty(t, res.JsonDetails)
	})

	t.Run("When check health handler set should call that", func(t *testing.T) {
		tcs := []struct {
			status              HealthStatus
			message             string
			jsonDetails         []byte
			err                 error
			expectedStatus      pluginv2.CheckHealthResponse_HealthStatus
			expectedMessage     string
			expectedJSONDetails []byte
			expectedError       bool
		}{
			{
				status:              HealthStatusUnknown,
				message:             "unknown",
				jsonDetails:         []byte("{}"),
				expectedStatus:      pluginv2.CheckHealthResponse_UNKNOWN,
				expectedMessage:     "unknown",
				expectedJSONDetails: []byte("{}"),
			},
			{
				status:              HealthStatusOk,
				message:             "all good",
				jsonDetails:         []byte("{}"),
				expectedStatus:      pluginv2.CheckHealthResponse_OK,
				expectedMessage:     "all good",
				expectedJSONDetails: []byte("{}"),
			},
			{
				status:              HealthStatusError,
				message:             "BOOM",
				jsonDetails:         []byte(`{"error": "boom"}`),
				expectedStatus:      pluginv2.CheckHealthResponse_ERROR,
				expectedMessage:     "BOOM",
				expectedJSONDetails: []byte(`{"error": "boom"}`),
			},
			{
				err:           errors.New("BOOM"),
				expectedError: true,
			},
		}

		for _, tc := range tcs {
			adapter := newDiagnosticsSDKAdapter(nil, &testCheckHealthHandler{
				status:      tc.status,
				message:     tc.message,
				jsonDetails: tc.jsonDetails,
				err:         tc.err,
			})

			req := &pluginv2.CheckHealthRequest{
				PluginContext: &pluginv2.PluginContext{},
			}
			res, err := adapter.CheckHealth(context.Background(), req)
			if tc.expectedError {
				require.Error(t, err)
				require.Nil(t, res)
			} else {
				require.NoError(t, err)
				require.NotNil(t, res)
				require.Equal(t, tc.expectedStatus, res.Status)
				require.Equal(t, tc.expectedMessage, res.Message)
				require.Equal(t, tc.expectedJSONDetails, res.JsonDetails)
			}
		}
	})

	t.Run("When headers are present", func(t *testing.T) {
		adapter := &diagnosticsSDKAdapter{
			checkHealthHandler: &testCheckHealthHandlerWithHeaders{},
		}
		res, err := adapter.CheckHealth(context.Background(), &pluginv2.CheckHealthRequest{
			Headers: map[string]string{
				"Authorization": "Bearer 123",
			},
			PluginContext: &pluginv2.PluginContext{},
		})
		require.NoError(t, err)
		require.NotNil(t, res)
		require.Equal(t, pluginv2.CheckHealthResponse_OK, res.Status)
	})

	t.Run("When tenant information is attached to incoming context, it is propagated from adapter to handler", func(t *testing.T) {
		tid := "123456"
		a := newDiagnosticsSDKAdapter(nil, CheckHealthHandlerFunc(func(ctx context.Context, req *CheckHealthRequest) (*CheckHealthResult, error) {
			require.Equal(t, tid, tenant.IDFromContext(ctx))
			return &CheckHealthResult{}, nil
		}))

		ctx := metadata.NewIncomingContext(context.Background(), metadata.New(map[string]string{
			tenant.CtxKey: tid,
		}))
		_, err := a.CheckHealth(ctx, &pluginv2.CheckHealthRequest{
			PluginContext: &pluginv2.PluginContext{},
		})
		require.NoError(t, err)
	})
}

type testCheckHealthHandler struct {
	status      HealthStatus
	message     string
	jsonDetails []byte
	err         error
}

func (h *testCheckHealthHandler) CheckHealth(_ context.Context, _ *CheckHealthRequest) (*CheckHealthResult, error) {
	return &CheckHealthResult{
		Status:      h.status,
		Message:     h.message,
		JSONDetails: h.jsonDetails,
	}, h.err
}

type testCheckHealthHandlerWithHeaders struct{}

func (h *testCheckHealthHandlerWithHeaders) CheckHealth(ctx context.Context, _ *CheckHealthRequest) (*CheckHealthResult, error) {
	middlewares := httpclient.ContextualMiddlewareFromContext(ctx)
	if len(middlewares) == 0 {
		return &CheckHealthResult{
			Status:  HealthStatusError,
			Message: "no middleware found",
		}, nil
	}
	return &CheckHealthResult{
		Status: HealthStatusOk,
	}, nil
}
