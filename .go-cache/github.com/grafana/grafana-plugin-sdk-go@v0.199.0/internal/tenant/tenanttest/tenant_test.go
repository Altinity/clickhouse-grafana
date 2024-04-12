package tenanttest

import (
	"context"
	"fmt"
	"net"
	"strconv"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/metadata"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	experimentalDS "github.com/grafana/grafana-plugin-sdk-go/experimental/datasourcetest"
	"github.com/grafana/grafana-plugin-sdk-go/internal/tenant"
)

const (
	tenantID1 = "abc123"
	tenantID2 = "def456"
)

// A test to verify the impact tenant ID (passed via context) has on plugin instance management
func TestTenantWithPluginInstanceManagement(t *testing.T) {
	port, err := getFreePort()
	require.NoError(t, err)
	addr := "127.0.0.1:" + strconv.Itoa(port)
	t.Log("addr:", addr)

	factoryInvocations := 0
	factory := datasource.InstanceFactoryFunc(func(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
		factoryInvocations++
		return &testPlugin{}, nil
	})
	tp, err := experimentalDS.Manage(factory, experimentalDS.ManageOpts{Address: addr})
	require.NoError(t, err)
	defer func() {
		err = tp.Shutdown()
		t.Log("plugin shutdown error", err)
	}()

	t.Run("Request without tenant information creates an instance", func(t *testing.T) {
		pCtx := backend.PluginContext{DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{}}
		qdr := &backend.QueryDataRequest{PluginContext: pCtx}
		crr := &backend.CallResourceRequest{PluginContext: pCtx}
		chr := &backend.CheckHealthRequest{PluginContext: pCtx}
		responseSender := newTestCallResourceResponseSender()

		ctx := context.Background()
		resp, err := tp.Client.QueryData(ctx, qdr)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.Equal(t, 1, factoryInvocations)

		err = tp.Client.CallResource(ctx, crr, responseSender)
		require.NoError(t, err)
		require.Equal(t, 1, factoryInvocations)

		t.Run("Request from tenant #1 creates new instance", func(t *testing.T) {
			ctx = metadata.AppendToOutgoingContext(context.Background(), tenant.CtxKey, tenantID1)
			resp, err = tp.Client.QueryData(ctx, qdr)
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, 2, factoryInvocations)

			// subsequent requests from tenantID1 with same settings will reuse instance
			resp, err = tp.Client.QueryData(ctx, qdr)
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, 2, factoryInvocations)

			var chRes *backend.CheckHealthResult
			chRes, err = tp.Client.CheckHealth(ctx, chr)
			require.NoError(t, err)
			require.NotNil(t, chRes)
			require.Equal(t, 2, factoryInvocations)

			t.Run("Request from tenant #2 creates new instance", func(t *testing.T) {
				ctx = metadata.AppendToOutgoingContext(context.Background(), tenant.CtxKey, tenantID2)
				resp, err = tp.Client.QueryData(ctx, qdr)
				require.NoError(t, err)
				require.NotNil(t, resp)
				require.Equal(t, 3, factoryInvocations)

				// subsequent requests from tenantID2 with same settings will reuse instance
				err = tp.Client.CallResource(ctx, crr, responseSender)
				require.NoError(t, err)
				require.Equal(t, 3, factoryInvocations)
			})

			// subsequent requests from tenantID1 with same settings will reuse instance
			ctx = metadata.AppendToOutgoingContext(context.Background(), tenant.CtxKey, tenantID1)
			resp, err = tp.Client.QueryData(ctx, qdr)
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, 3, factoryInvocations)

			chRes, err = tp.Client.CheckHealth(ctx, chr)
			require.NoError(t, err)
			require.NotNil(t, chRes)
			require.Equal(t, 3, factoryInvocations)
		})
	})
}

type testPlugin struct{}

func (p *testPlugin) QueryData(_ context.Context, _ *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	return backend.NewQueryDataResponse(), nil
}

func (p *testPlugin) CallResource(_ context.Context, _ *backend.CallResourceRequest, _ backend.CallResourceResponseSender) error {
	return nil
}

func (p *testPlugin) CheckHealth(_ context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	return &backend.CheckHealthResult{}, nil
}

type testCallResourceResponseSender struct{}

func newTestCallResourceResponseSender() *testCallResourceResponseSender {
	return &testCallResourceResponseSender{}
}

func (s *testCallResourceResponseSender) Send(_ *backend.CallResourceResponse) error {
	return nil
}

// getFreePort returns a random free port listening on 127.0.0.1.
func getFreePort() (int, error) {
	a, err := net.ResolveTCPAddr("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, fmt.Errorf("resolve tcp addr: %w", err)
	}
	l, err := net.ListenTCP("tcp", a)
	if err != nil {
		return 0, fmt.Errorf("listen tcp: %w", err)
	}
	port := l.Addr().(*net.TCPAddr).Port
	if err = l.Close(); err != nil {
		return 0, fmt.Errorf("close: %w", err)
	}
	return port, nil
}
