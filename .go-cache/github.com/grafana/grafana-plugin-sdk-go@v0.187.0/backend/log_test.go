package backend

import (
	"context"
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/genproto/pluginv2"
)

func checkCtxLogger(ctx context.Context, t *testing.T, expParams map[string]any) {
	t.Helper()
	logAttrs := log.ContextualAttributesFromContext(ctx)
	if len(expParams) == 0 {
		require.Empty(t, logAttrs)
		return
	}

	require.NotEmpty(t, logAttrs)
	require.Truef(t, len(logAttrs)%2 == 0, "expected even number of log params, got %d", len(logAttrs))
	require.Equal(t, len(expParams)*2, len(logAttrs))
	for i := 0; i < len(logAttrs)/2; i++ {
		key := logAttrs[i*2].(string)
		val := logAttrs[i*2+1]
		expVal, ok := expParams[key]
		require.Truef(t, ok, "unexpected log param: %s", key)
		require.Equal(t, expVal, val)
	}
}

func TestContextualLogger(t *testing.T) {
	const pluginID = "plugin-id"
	pCtx := &pluginv2.PluginContext{PluginId: pluginID}
	t.Run("DataSDKAdapter", func(t *testing.T) {
		run := make(chan struct{}, 1)
		a := newDataSDKAdapter(QueryDataHandlerFunc(func(ctx context.Context, req *QueryDataRequest) (*QueryDataResponse, error) {
			checkCtxLogger(ctx, t, map[string]any{"endpoint": "queryData", "pluginID": pluginID})
			run <- struct{}{}
			return NewQueryDataResponse(), nil
		}))
		_, err := a.QueryData(context.Background(), &pluginv2.QueryDataRequest{
			PluginContext: pCtx,
		})
		require.NoError(t, err)
		<-run
	})

	t.Run("DiagnosticsSDKAdapter", func(t *testing.T) {
		run := make(chan struct{}, 1)
		a := newDiagnosticsSDKAdapter(prometheus.DefaultGatherer, CheckHealthHandlerFunc(func(ctx context.Context, req *CheckHealthRequest) (*CheckHealthResult, error) {
			checkCtxLogger(ctx, t, map[string]any{"endpoint": "checkHealth", "pluginID": pluginID})
			run <- struct{}{}
			return &CheckHealthResult{}, nil
		}))
		_, err := a.CheckHealth(context.Background(), &pluginv2.CheckHealthRequest{
			PluginContext: pCtx,
		})
		require.NoError(t, err)
		<-run
	})

	t.Run("ResourceSDKAdapter", func(t *testing.T) {
		run := make(chan struct{}, 1)
		a := newResourceSDKAdapter(CallResourceHandlerFunc(func(ctx context.Context, req *CallResourceRequest, sender CallResourceResponseSender) error {
			checkCtxLogger(ctx, t, map[string]any{"endpoint": "callResource", "pluginID": pluginID})
			run <- struct{}{}
			return nil
		}))
		err := a.CallResource(&pluginv2.CallResourceRequest{
			PluginContext: pCtx,
		}, newTestCallResourceServer())
		require.NoError(t, err)
		<-run
	})

	t.Run("StreamHandler", func(t *testing.T) {
		subscribeStreamRun := make(chan struct{}, 1)
		publishStreamRun := make(chan struct{}, 1)
		runStreamRun := make(chan struct{}, 1)
		a := newStreamSDKAdapter(&streamAdapter{
			subscribeStreamFunc: func(ctx context.Context, request *SubscribeStreamRequest) (*SubscribeStreamResponse, error) {
				checkCtxLogger(ctx, t, map[string]any{"endpoint": "subscribeStream", "pluginID": pluginID})
				subscribeStreamRun <- struct{}{}
				return &SubscribeStreamResponse{}, nil
			},
			publishStreamFunc: func(ctx context.Context, request *PublishStreamRequest) (*PublishStreamResponse, error) {
				checkCtxLogger(ctx, t, map[string]any{"endpoint": "publishStream", "pluginID": pluginID})
				publishStreamRun <- struct{}{}
				return &PublishStreamResponse{}, nil
			},
			runStreamFunc: func(ctx context.Context, request *RunStreamRequest, sender *StreamSender) error {
				checkCtxLogger(ctx, t, map[string]any{"endpoint": "runStream", "pluginID": pluginID})
				runStreamRun <- struct{}{}
				return nil
			},
		})

		t.Run("SubscribeStream", func(t *testing.T) {
			_, err := a.SubscribeStream(context.Background(), &pluginv2.SubscribeStreamRequest{
				PluginContext: pCtx,
			})
			require.NoError(t, err)
			<-subscribeStreamRun
		})

		t.Run("PublishStream", func(t *testing.T) {
			_, err := a.PublishStream(context.Background(), &pluginv2.PublishStreamRequest{
				PluginContext: pCtx,
			})
			require.NoError(t, err)
			<-publishStreamRun
		})

		t.Run("RunStream", func(t *testing.T) {
			err := a.RunStream(&pluginv2.RunStreamRequest{
				PluginContext: pCtx,
			}, newTestRunStreamServer())
			require.NoError(t, err)
			<-runStreamRun
		})
	})
}
