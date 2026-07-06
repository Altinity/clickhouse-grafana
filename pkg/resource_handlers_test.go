package main

import (
	"context"
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

var updateGolden = flag.Bool("update", false, "rewrite handler golden files")

type captureSender struct {
	resp *backend.CallResourceResponse
}

func (c *captureSender) Send(r *backend.CallResourceResponse) error {
	c.resp = r
	return nil
}

type handlerFunc func(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error

func runHandlerGolden(t *testing.T, name string, handler handlerFunc, reqFile string) {
	t.Helper()
	body, err := os.ReadFile(filepath.Join("testdata", "handlers", reqFile))
	require.NoError(t, err)

	sender := &captureSender{}
	err = handler(context.Background(), &backend.CallResourceRequest{Body: body}, sender)
	require.NoError(t, err)
	require.NotNil(t, sender.resp, "handler sent no response")

	got := map[string]interface{}{
		"status": sender.resp.Status,
		"body":   json.RawMessage(sender.resp.Body),
	}
	gotJSON, err := json.MarshalIndent(got, "", "  ")
	require.NoError(t, err)

	goldenPath := filepath.Join("testdata", "handlers", name+".golden.json")
	if *updateGolden {
		require.NoError(t, os.WriteFile(goldenPath, gotJSON, 0o644))
		return
	}
	want, err := os.ReadFile(goldenPath)
	require.NoError(t, err, "run with -update to create golden")
	require.JSONEq(t, string(want), string(gotJSON))
}

func TestHandlerCharacterization(t *testing.T) {
	ds := &ClickHouseDatasource{}
	cases := []struct {
		name    string
		handler handlerFunc
		reqFile string
	}{
		{"create_query_basic", ds.handleCreateQuery, "create_query_basic.req.json"},
		{"apply_adhoc_basic", ds.handleApplyAdhocFilters, "apply_adhoc_basic.req.json"},
		{"apply_adhoc_macro", ds.handleApplyAdhocFilters, "apply_adhoc_macro.req.json"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			runHandlerGolden(t, tc.name, tc.handler, tc.reqFile)
		})
	}
}
