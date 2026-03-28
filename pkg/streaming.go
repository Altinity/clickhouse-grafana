package main

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"time"

	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

const (
	defaultStreamingIntervalMs = 5000
	minStreamingIntervalMs     = 1000
)

// streamQuery represents the query parameters passed from the frontend via the channel path data.
type streamQuery struct {
	RefId                  string `json:"refId"`
	RawQuery               bool   `json:"rawQuery"`
	Query                  string `json:"query"`
	DateTimeCol            string `json:"dateTimeColDataType"`
	DateCol                string `json:"dateColDataType"`
	DateTimeType           string `json:"dateTimeType"`
	Extrapolate            bool   `json:"extrapolate"`
	SkipComments           bool   `json:"skip_comments"`
	AddMetadata            bool   `json:"add_metadata"`
	UseWindowFuncForMacros bool   `json:"useWindowFuncForMacros"`
	Format                 string `json:"format"`
	Round                  string `json:"round"`
	IntervalFactor         int    `json:"intervalFactor"`
	Interval               string `json:"interval"`
	Database               string `json:"database"`
	Table                  string `json:"table"`
	MaxDataPoints          int64  `json:"maxDataPoints"`
	StreamingInterval      int    `json:"streamingInterval"`
	StreamingMode          string `json:"streamingMode"` // "delta" or "full"

	// Time range from the dashboard
	TimeRange struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"timeRange"`
}

// parseIntervalSeconds extracts seconds from an interval string like "20s", "1m", "200ms".
func parseIntervalSeconds(interval string) int64 {
	if interval == "" {
		return 0
	}
	// Parse number
	n := int64(0)
	i := 0
	for i < len(interval) && interval[i] >= '0' && interval[i] <= '9' {
		n = n*10 + int64(interval[i]-'0')
		i++
	}
	unit := interval[i:]
	switch unit {
	case "ms":
		return n / 1000 // sub-second intervals round to 0 → roundDownTo becomes no-op
	case "s":
		return n
	case "m":
		return n * 60
	case "h":
		return n * 3600
	case "d":
		return n * 86400
	}
	return n
}

// roundDownTo rounds a time down to the nearest interval boundary.
// This ensures we only include complete GROUP BY buckets, avoiding partial-bucket jumps.
func roundDownTo(t time.Time, intervalSec int64) time.Time {
	if intervalSec <= 0 {
		return t
	}
	unix := t.Unix()
	rounded := (unix / intervalSec) * intervalSec
	return time.Unix(rounded, 0)
}

// SubscribeStream validates a subscription request and allows the client to subscribe.
func (ds *ClickHouseDatasource) SubscribeStream(_ context.Context, req *backend.SubscribeStreamRequest) (*backend.SubscribeStreamResponse, error) {
	backend.Logger.Debug(fmt.Sprintf("SubscribeStream called for path: %s", req.Path))
	return &backend.SubscribeStreamResponse{
		Status: backend.SubscribeStreamStatusOK,
	}, nil
}

// PublishStream denies publication from the frontend — this is a read-only stream.
func (ds *ClickHouseDatasource) PublishStream(_ context.Context, _ *backend.PublishStreamRequest) (*backend.PublishStreamResponse, error) {
	return &backend.PublishStreamResponse{
		Status: backend.PublishStreamStatusPermissionDenied,
	}, nil
}

// frameFingerprint computes a lightweight hash of a frame for change detection.
func frameFingerprint(frame *data.Frame) [16]byte {
	rows := frame.Rows()
	if rows == 0 {
		return [16]byte{}
	}
	h := md5.New()
	fmt.Fprintf(h, "rows=%d;fields=%d;", rows, len(frame.Fields))
	for _, field := range frame.Fields {
		fmt.Fprintf(h, "first=%v;last=%v;", field.At(0), field.At(rows-1))
	}
	var result [16]byte
	copy(result[:], h.Sum(nil))
	return result
}

// RunStream is the core streaming loop. Supports two modes:
//   - "delta": first tick full range, subsequent ticks only new data (reduces CH load)
//   - "full": every tick re-queries full range, sends only when data changes
func (ds *ClickHouseDatasource) RunStream(ctx context.Context, req *backend.RunStreamRequest, sender *backend.StreamSender) error {
	backend.Logger.Info(fmt.Sprintf("[streaming] RunStream STARTED | path=%s", req.Path))

	var sq streamQuery
	if err := json.Unmarshal(req.Data, &sq); err != nil {
		return fmt.Errorf("failed to unmarshal stream query: %w", err)
	}

	intervalMs := sq.StreamingInterval
	if intervalMs < minStreamingIntervalMs {
		intervalMs = defaultStreamingIntervalMs
	}

	mode := sq.StreamingMode
	if mode == "" {
		mode = "delta"
	}

	backend.Logger.Info(fmt.Sprintf("[streaming] config | refId=%s | mode=%s | pollInterval=%dms | interval=%s | query=%.100s",
		sq.RefId, mode, intervalMs, sq.Interval, sq.Query))

	ticker := time.NewTicker(time.Duration(intervalMs) * time.Millisecond)
	defer ticker.Stop()

	dashboardFrom := time.Now().Add(-time.Duration(intervalMs) * time.Millisecond)
	if sq.TimeRange.From != "" {
		if parsed, err := time.Parse(time.RFC3339, sq.TimeRange.From); err == nil {
			dashboardFrom = parsed
		}
	}

	// Parse query $interval to round timestamps to complete buckets.
	// This prevents the last partial bucket from causing visual jumps.
	queryIntervalSec := parseIntervalSeconds(sq.Interval)
	backend.Logger.Info(fmt.Sprintf("[streaming] dashboardFrom=%s | queryInterval=%ds",
		dashboardFrom.Format(time.RFC3339), queryIntervalSec))

	if mode == "full" {
		return ds.runFullRefreshLoop(ctx, req, sender, &sq, dashboardFrom, intervalMs, ticker, queryIntervalSec)
	}
	return ds.runDeltaLoop(ctx, req, sender, &sq, dashboardFrom, ticker, queryIntervalSec)
}

// runDeltaLoop: checks for new data with a small delta query [lastTo, now()].
// If new data exists, re-queries the full range and sends the complete frame.
// This reduces ClickHouse load: the lightweight delta check runs every tick,
// but the heavy full-range query only runs when there's actually new data.
func (ds *ClickHouseDatasource) runDeltaLoop(
	ctx context.Context,
	req *backend.RunStreamRequest,
	sender *backend.StreamSender,
	sq *streamQuery,
	dashboardFrom time.Time,
	ticker *time.Ticker,
	queryIntervalSec int64,
) error {
	tickCount := 0
	lastFingerprints := map[string][16]byte{}

	// Tick 1: full range query
	tickCount++
	now := roundDownTo(time.Now(), queryIntervalSec)
	backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | DELTA/FULL_RANGE | from=%s | to=%s",
		tickCount, dashboardFrom.Format("15:04:05"), now.Format("15:04:05")))
	ds.sendFramesWithDedup(ctx, req.PluginContext, sender, sq, dashboardFrom, now, lastFingerprints, tickCount)
	lastTo := time.Now()

	// Tick 2+: probe with delta, send full range only if new data found
	for {
		select {
		case <-ctx.Done():
			backend.Logger.Info(fmt.Sprintf("[streaming] RunStream STOPPED | path=%s | totalTicks=%d", req.Path, tickCount))
			return nil
		case <-ticker.C:
			tickCount++
			now = time.Now()

			// Lightweight delta probe — only checks if new data exists
			probeResponse := ds.executeStreamEvalQuery(req.PluginContext, ctx, sq, lastTo, now)
			hasNewData := false
			if probeResponse.Error == nil {
				for _, frame := range probeResponse.Frames {
					if frame.Rows() > 0 {
						hasNewData = true
						break
					}
				}
			}
			lastTo = now

			if hasNewData {
				// New data found — re-query full range, round to complete buckets
				roundedTo := roundDownTo(now, queryIntervalSec)
				backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | DELTA: new data, full range to=%s",
					tickCount, roundedTo.Format("15:04:05")))
				ds.sendFramesWithDedup(ctx, req.PluginContext, sender, sq, dashboardFrom, roundedTo, lastFingerprints, tickCount)
			} else {
				backend.Logger.Debug(fmt.Sprintf("[streaming] tick #%d | DELTA: no new data (probe only)", tickCount))
			}
		}
	}
}

// runFullRefreshLoop: every tick re-queries [dashboardFrom, now()].
// Only sends data when the result actually changes (fingerprint comparison).
// Frontend uses Replace mode.
func (ds *ClickHouseDatasource) runFullRefreshLoop(
	ctx context.Context,
	req *backend.RunStreamRequest,
	sender *backend.StreamSender,
	sq *streamQuery,
	dashboardFrom time.Time,
	intervalMs int,
	ticker *time.Ticker,
	queryIntervalSec int64,
) error {
	tickCount := 0
	lastFingerprints := map[string][16]byte{}

	// First tick immediately
	tickCount++
	now := roundDownTo(time.Now(), queryIntervalSec)
	backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | FULL_REFRESH | from=%s | to=%s",
		tickCount, dashboardFrom.Format("15:04:05"), now.Format("15:04:05")))
	ds.sendFramesWithDedup(ctx, req.PluginContext, sender, sq, dashboardFrom, now, lastFingerprints, tickCount)

	for {
		select {
		case <-ctx.Done():
			backend.Logger.Info(fmt.Sprintf("[streaming] RunStream STOPPED | path=%s | totalTicks=%d", req.Path, tickCount))
			return nil
		case <-ticker.C:
			tickCount++
			now = roundDownTo(time.Now(), queryIntervalSec)
			backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | FULL_REFRESH | from=%s | to=%s",
				tickCount, dashboardFrom.Format("15:04:05"), now.Format("15:04:05")))
			ds.sendFramesWithDedup(ctx, req.PluginContext, sender, sq, dashboardFrom, now, lastFingerprints, tickCount)
		}
	}
}

// sendFramesWithDedup executes a query and sends only changed frames.
// Used by both delta mode (full range re-query) and full refresh mode.
func (ds *ClickHouseDatasource) sendFramesWithDedup(
	ctx context.Context,
	pluginContext backend.PluginContext,
	sender *backend.StreamSender,
	sq *streamQuery,
	from, to time.Time,
	lastFingerprints map[string][16]byte,
	tickCount int,
) {
	response := ds.executeStreamEvalQuery(pluginContext, ctx, sq, from, to)
	if response.Error != nil {
		backend.Logger.Error(fmt.Sprintf("[streaming] tick #%d | QUERY ERROR: %s", tickCount, response.Error))
		ds.sendErrorFrame(sender, sq.RefId, response.Error.Error())
		return
	}

	if len(response.Frames) == 0 {
		ds.sendHeartbeat(sender, sq.RefId)
		backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | refId=%s | NO DATA (heartbeat sent)", tickCount, sq.RefId))
		return
	}

	sent, skipped := 0, 0
	for _, frame := range response.Frames {
		if frame.Rows() == 0 {
			skipped++
			continue
		}
		fp := frameFingerprint(frame)
		name := frame.Name
		if name == "" {
			name = fmt.Sprintf("frame-%d", sent+skipped)
		}
		if prev, ok := lastFingerprints[name]; ok && prev == fp {
			skipped++
			continue
		}
		lastFingerprints[name] = fp
		sent++
		mode := sq.StreamingMode
		if mode == "" {
			mode = "delta"
		}
		addStreamingNotice(frame, mode, tickCount, frame.Rows())
		if err := sender.SendFrame(frame, data.IncludeAll); err != nil {
			backend.Logger.Error(fmt.Sprintf("[streaming] tick #%d | SendFrame ERROR: %s", tickCount, err))
			return
		}
	}

	backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | refId=%s | sent=%d | skipped=%d",
		tickCount, sq.RefId, sent, skipped))
}

// executeStreamEvalQuery builds and executes an EvalQuery.
func (ds *ClickHouseDatasource) executeStreamEvalQuery(
	pluginContext backend.PluginContext,
	ctx context.Context,
	sq *streamQuery,
	from, to time.Time,
) backend.DataResponse {
	return ds.evalQuery(pluginContext, ctx, &eval.EvalQuery{
		RefId:                  sq.RefId,
		RawQuery:               sq.RawQuery,
		Query:                  sq.Query,
		DateTimeCol:            sq.DateTimeCol,
		DateCol:                sq.DateCol,
		DateTimeType:           sq.DateTimeType,
		Extrapolate:            sq.Extrapolate,
		SkipComments:           sq.SkipComments,
		AddMetadata:            sq.AddMetadata,
		UseWindowFuncForMacros: sq.UseWindowFuncForMacros,
		Format:                 sq.Format,
		Round:                  sq.Round,
		IntervalFactor:         sq.IntervalFactor,
		Interval:               sq.Interval,
		Database:               sq.Database,
		Table:                  sq.Table,
		MaxDataPoints:          sq.MaxDataPoints,
		FrontendDatasource:     true,
		From:                   from,
		To:                     to,
	})
}

// addStreamingNotice attaches a streaming status notice to the frame's metadata.
func addStreamingNotice(frame *data.Frame, mode string, tickCount int, rows int) {
	text := fmt.Sprintf("Streaming: %s mode | tick #%d | %d rows", mode, tickCount, rows)
	notice := data.Notice{
		Severity: data.NoticeSeverityInfo,
		Text:     text,
	}
	if frame.Meta == nil {
		frame.Meta = &data.FrameMeta{}
	}
	frame.Meta.Notices = []data.Notice{notice}
}

func (ds *ClickHouseDatasource) sendHeartbeat(sender *backend.StreamSender, refId string) {
	frame := data.NewFrame("heartbeat",
		data.NewField("time", nil, []time.Time{}),
		data.NewField("value", nil, []float64{}),
	)
	frame.RefID = refId
	_ = sender.SendFrame(frame, data.IncludeAll)
}

func (ds *ClickHouseDatasource) sendErrorFrame(sender *backend.StreamSender, refId, errMsg string) {
	frame := data.NewFrame("error")
	frame.RefID = refId
	frame.Meta = &data.FrameMeta{
		Notices: []data.Notice{{Severity: data.NoticeSeverityError, Text: errMsg}},
	}
	_ = sender.SendFrame(frame, data.IncludeAll)
}
