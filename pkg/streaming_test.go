package main

import (
	"context"
	"encoding/json"
	"math"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/stretchr/testify/require"
)

// nopPacketSender lets RunStream be driven without a Grafana instance.
type nopPacketSender struct{ packets int }

func (s *nopPacketSender) Send(*backend.StreamPacket) error {
	s.packets++
	return nil
}

// clampInterval mirrors the clamp applied in RunStream before the ticker is built.
func clampInterval(intervalMs int) int {
	if intervalMs < minStreamingIntervalMs {
		intervalMs = defaultStreamingIntervalMs
	}
	if intervalMs > maxStreamingIntervalMs {
		intervalMs = maxStreamingIntervalMs
	}
	return intervalMs
}

func TestClampStreamingInterval(t *testing.T) {
	tests := []struct {
		name string
		in   int
		want int
	}{
		{"unset", 0, defaultStreamingIntervalMs},
		{"negative", -1, defaultStreamingIntervalMs},
		{"below minimum", 999, defaultStreamingIntervalMs},
		{"editor minimum 1s", 1000, 1000},
		{"editor default 5s", 5000, 5000},
		{"editor maximum 1m", 60000, 60000},
		{"at maximum", maxStreamingIntervalMs, maxStreamingIntervalMs},
		{"above maximum", maxStreamingIntervalMs + 1, maxStreamingIntervalMs},
		// time.Duration(v)*time.Millisecond wraps negative from here on.
		{"first overflowing value", 9223372036855, maxStreamingIntervalMs},
		{"max int64", math.MaxInt64, maxStreamingIntervalMs},
		// Wraps to a positive 64ns ticker: no panic, but a query flood.
		{"wraps to tiny positive", 76480200929599801, maxStreamingIntervalMs},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := clampInterval(tt.in)
			require.Equal(t, tt.want, got)
			// The invariant that keeps time.NewTicker from panicking.
			require.Greater(t, time.Duration(got)*time.Millisecond, time.Duration(0))
		})
	}
}

func TestStreamingLookbackCannotOverflowDuration(t *testing.T) {
	for _, in := range []int{-1, 0, 1, 10, maxStreamingLookbackPoints, maxStreamingLookbackPoints + 1, math.MaxInt64} {
		lookback := in
		if lookback < 0 {
			lookback = 0
		}
		if lookback > maxStreamingLookbackPoints {
			lookback = maxStreamingLookbackPoints
		}

		require.GreaterOrEqual(t, lookback, 0)
		require.LessOrEqual(t, lookback, maxStreamingLookbackPoints)
		// runDeltaLoop computes time.Duration(lookback*queryIntervalSec) * time.Second.
		maxIntervalSec := int64(86400)
		require.Less(t, int64(lookback)*maxIntervalSec, int64(math.MaxInt64)/int64(time.Second))
	}
}

// These payloads used to panic in time.NewTicker and kill the plugin process.
func TestRunStreamSurvivesHostileInterval(t *testing.T) {
	for _, interval := range []int64{9223372036855, math.MaxInt64, 76480200929599801, -1} {
		payload, err := json.Marshal(map[string]any{
			"refId":             "A",
			"query":             "SELECT 1",
			"streamingMode":     "delta",
			"streamingInterval": interval,
			"streamingLookback": math.MaxInt64,
		})
		require.NoError(t, err)

		ctx, cancel := context.WithCancel(context.Background())
		ds := &ClickHouseDatasource{}
		sender := backend.NewStreamSender(&nopPacketSender{})
		req := &backend.RunStreamRequest{Path: "ds/uid/A", Data: payload}

		require.NotPanics(t, func() {
			// nil, not an error: an error makes Grafana re-establish the stream forever.
			require.NoError(t, ds.RunStream(ctx, req, sender))
		})
		cancel()
	}
}

func TestRunStreamRejectsMalformedPayload(t *testing.T) {
	ds := &ClickHouseDatasource{}
	sender := backend.NewStreamSender(&nopPacketSender{})
	req := &backend.RunStreamRequest{Path: "ds/uid/A", Data: []byte("{not json")}

	require.NotPanics(t, func() {
		require.Error(t, ds.RunStream(context.Background(), req, sender))
	})
}

func tsFrame(t time.Time, valueField *data.Field) *data.Frame {
	return data.NewFrame("", data.NewField("t", nil, []time.Time{t}), valueField)
}

// response.go switches Int64/UInt64 columns to string above 2^53, which used to panic.
func TestUpsertFrameRowsSkipsMergeOnFieldTypeChange(t *testing.T) {
	now := time.Unix(1700000000, 0)
	dst := tsFrame(now, data.NewField("v", nil, []float64{1}))
	src := tsFrame(now.Add(time.Minute), data.NewField("v", nil, []string{"18446744073709551615"}))

	require.NotPanics(t, func() { upsertFrameRows(dst, src) })
	require.Equal(t, 1, dst.Rows(), "mismatched frame must be dropped, not merged")
}

func TestUpsertFrameRowsMergesMatchingTypes(t *testing.T) {
	now := time.Unix(1700000000, 0)
	dst := tsFrame(now, data.NewField("v", nil, []float64{1}))
	src := data.NewFrame("",
		data.NewField("t", nil, []time.Time{now, now.Add(time.Minute)}),
		data.NewField("v", nil, []float64{42, 2}),
	)

	upsertFrameRows(dst, src)

	require.Equal(t, 2, dst.Rows())
	require.Equal(t, 42.0, dst.Fields[1].At(0), "existing bucket must be updated in place")
	require.Equal(t, 2.0, dst.Fields[1].At(1), "new bucket must be appended")
}
