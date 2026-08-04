package main

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"context"
	"encoding/json"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
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

func TestResolveWindowSpan(t *testing.T) {
	from := time.Date(2026, 8, 4, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name string
		to   string
		now  time.Time
		want time.Duration
	}{
		{"dashboard range", from.Add(time.Hour).Format(time.RFC3339), from.Add(time.Second), time.Hour},
		{"millisecond ISO from the frontend", "2026-08-04T11:00:00.000Z", from.Add(time.Second), time.Hour},
		{"absolute past range", from.Add(24 * time.Hour).Format(time.RFC3339), time.Now(), 24 * time.Hour},
		{"missing to falls back to elapsed", "", from.Add(90 * time.Second), 90 * time.Second},
		{"unparsable to falls back to elapsed", "1700000000", from.Add(90 * time.Second), 90 * time.Second},
		{"to before from falls back to elapsed", from.Add(-time.Hour).Format(time.RFC3339), from.Add(90 * time.Second), 90 * time.Second},
		{"from in the future falls back to default", "", from.Add(-time.Hour), time.Hour},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sq := &streamQuery{}
			sq.TimeRange.To = tt.to

			got := resolveWindowSpan(sq, from, tt.now)

			require.Equal(t, tt.want, got)
			require.Greater(t, got, time.Duration(0))
		})
	}
}

// The window must stay a constant number of buckets wide and advance one whole bucket at
// a time, otherwise identical ticks would stop deduplicating by fingerprint.
func TestWindowStartKeepsConstantWidth(t *testing.T) {
	const intervalSec = 60
	span := time.Hour
	base := time.Unix(1785000000, 0)

	var prevFrom, prevTo time.Time
	for offset := 0; offset < 3600; offset++ {
		to := roundDownTo(base.Add(time.Duration(offset)*time.Second), intervalSec)
		from := windowStart(to, span, intervalSec)

		require.Equal(t, span, to.Sub(from), "window width must not drift")
		require.Zero(t, from.Unix()%intervalSec, "both edges must sit on bucket boundaries")
		require.Zero(t, to.Unix()%intervalSec)

		if !prevTo.IsZero() {
			if to.Equal(prevTo) {
				require.True(t, from.Equal(prevFrom), "from must not move within a bucket")
			} else {
				require.Equal(t, int64(intervalSec), to.Unix()-prevTo.Unix())
				require.Equal(t, int64(intervalSec), from.Unix()-prevFrom.Unix())
			}
		}
		prevFrom, prevTo = from, to
	}
}

func TestWindowStartWithoutBucketAlignment(t *testing.T) {
	// Sub-second $interval parses to 0, which disables rounding.
	now := time.Unix(1785000000, 500)
	require.Equal(t, 10*time.Minute, now.Sub(windowStart(now, 10*time.Minute, 0)))
}

func accumFrame(times []time.Time, values []float64) *data.Frame {
	return data.NewFrame("",
		data.NewField("t", nil, times),
		data.NewField("v", nil, values),
	)
}

func TestTrimAccumulatedFrames(t *testing.T) {
	base := time.Unix(1785000000, 0)

	t.Run("drops rows below the cutoff", func(t *testing.T) {
		acc := map[string]*data.Frame{"s": accumFrame(
			[]time.Time{base, base.Add(time.Minute), base.Add(2 * time.Minute)},
			[]float64{1, 2, 3},
		)}

		trimAccumulatedFrames(acc, base.Add(time.Minute))

		require.Equal(t, 2, acc["s"].Rows())
		require.Equal(t, 2.0, acc["s"].Fields[1].At(0))
	})

	t.Run("removes a series that slid out of the window entirely", func(t *testing.T) {
		acc := map[string]*data.Frame{"s": accumFrame([]time.Time{base}, []float64{1})}

		trimAccumulatedFrames(acc, base.Add(time.Hour))

		require.NotContains(t, acc, "s")
	})

	t.Run("leaves a fully valid frame untouched", func(t *testing.T) {
		frame := accumFrame([]time.Time{base, base.Add(time.Minute)}, []float64{1, 2})
		acc := map[string]*data.Frame{"s": frame}

		trimAccumulatedFrames(acc, base)

		require.Same(t, frame, acc["s"])
	})

	t.Run("trims out-of-order rows appended by backfill", func(t *testing.T) {
		acc := map[string]*data.Frame{"s": accumFrame(
			[]time.Time{base.Add(2 * time.Minute), base.Add(3 * time.Minute), base},
			[]float64{3, 4, 1},
		)}

		trimAccumulatedFrames(acc, base.Add(time.Minute))

		require.Equal(t, 2, acc["s"].Rows(), "the stale row at the end must go, not survive a prefix cut")
		require.Equal(t, 3.0, acc["s"].Fields[1].At(0))
		require.Equal(t, 4.0, acc["s"].Fields[1].At(1))
	})
}

// The accumulator used to grow forever because the trim cutoff never advanced.
func TestDeltaAccumulatorStopsGrowing(t *testing.T) {
	const intervalSec = 60
	span := 10 * time.Minute
	base := time.Unix(1785000000, 0)

	acc := map[string]*data.Frame{"s": accumFrame([]time.Time{base}, []float64{0})}

	for tick := 1; tick <= 500; tick++ {
		now := roundDownTo(base.Add(time.Duration(tick)*time.Minute), intervalSec)
		upsertFrameRows(acc["s"], accumFrame([]time.Time{now}, []float64{float64(tick)}))
		trimAccumulatedFrames(acc, windowStart(now, span, intervalSec))

		require.LessOrEqual(t, acc["s"].Rows(), 11, "tick %d: window holds at most span/interval+1 rows", tick)
	}
	require.Equal(t, 11, acc["s"].Rows())
}

type fakeInstanceManager struct{ settings *DatasourceSettings }

func (f *fakeInstanceManager) Get(context.Context, backend.PluginContext) (instancemgmt.Instance, error) {
	return f.settings, nil
}

func (f *fakeInstanceManager) Do(context.Context, backend.PluginContext, instancemgmt.InstanceCallbackFunc) error {
	return nil
}

// clickhouseStub records the SQL it is asked to run and answers with an empty result set.
type clickhouseStub struct {
	mu      sync.Mutex
	queries []string
}

func (s *clickhouseStub) record(q string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.queries = append(s.queries, q)
}

func (s *clickhouseStub) recorded() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.queries...)
}

func newStubDatasource(t *testing.T) (*ClickHouseDatasource, *clickhouseStub) {
	t.Helper()
	stub := &clickhouseStub{}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("query")
		if strings.Contains(query, "timezone()") {
			_, _ = w.Write([]byte(`{"meta":[{"name":"timezone()","type":"String"}],"data":[{"timezone()":"UTC"}]}`))
			return
		}
		stub.record(query)
		_, _ = w.Write([]byte(`{"meta":[{"name":"t","type":"DateTime"},{"name":"v","type":"Float64"}],"data":[]}`))
	}))
	t.Cleanup(srv.Close)

	ds := &ClickHouseDatasource{im: &fakeInstanceManager{settings: &DatasourceSettings{
		Instance:   backend.DataSourceInstanceSettings{URL: srv.URL},
		HTTPClient: srv.Client(),
	}}}
	return ds, stub
}

var timeFilterBounds = regexp.MustCompile(`toDateTime\((\d+)\)`)

// queryRange extracts the [from, to] epochs the $timeFilter macro expanded to.
func queryRange(t *testing.T, sql string) (int64, int64) {
	t.Helper()
	m := timeFilterBounds.FindAllStringSubmatch(sql, -1)
	require.GreaterOrEqual(t, len(m), 2, "expected a time filter in %q", sql)
	from, err := strconv.ParseInt(m[0][1], 10, 64)
	require.NoError(t, err)
	to, err := strconv.ParseInt(m[1][1], 10, 64)
	require.NoError(t, err)
	return from, to
}

// Full refresh mode used to query [session start, now] on every tick, so the range grew
// for as long as the dashboard stayed open.
func TestFullRefreshQueryRangeStaysBounded(t *testing.T) {
	ds, stub := newStubDatasource(t)
	sq := &streamQuery{
		RefId:        "A",
		Query:        "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t",
		Table:        "test",
		DateTimeCol:  "event_time",
		DateTimeType: "DATETIME",
		Interval:     "1s",
		Format:       "time_series",
	}

	// Run over several 1s buckets: the window start must step with them, which is what
	// distinguishes a sliding window from the fixed session start it replaced.
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()
	ctx, cancel := context.WithTimeout(context.Background(), 2500*time.Millisecond)
	defer cancel()

	require.NoError(t, ds.runFullRefreshLoop(ctx, &backend.RunStreamRequest{Path: "ds/uid/A"}, backend.NewStreamSender(&nopPacketSender{}), sq, 10*time.Minute, 1000, ticker, 1))

	queries := stub.recorded()
	require.GreaterOrEqual(t, len(queries), 3, "expected several ticks")

	starts := map[int64]bool{}
	for i, sql := range queries {
		from, to := queryRange(t, sql)
		require.Equal(t, int64(600), to-from, "tick %d: query range must stay windowSpan wide", i+1)
		starts[from] = true
	}
	require.Greater(t, len(starts), 1, "window start must advance, not stay pinned to the session start")
}
