package main

import (
	"context"
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

	// Time range from the dashboard
	TimeRange struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"timeRange"`
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

// RunStream is the core streaming loop.
// Strategy:
//   - First tick: full range [dashboardFrom, now()] — heavy query, populates historical data
//   - Subsequent ticks: delta [lastTo, now()] — lightweight query, only new data
//   - The same Interval string is used for all queries so $timeSeries buckets stay aligned
//   - Frontend uses Append mode to accumulate data
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

	backend.Logger.Info(fmt.Sprintf("[streaming] config | refId=%s | pollInterval=%dms | interval=%s | query=%.100s",
		sq.RefId, intervalMs, sq.Interval, sq.Query))

	ticker := time.NewTicker(time.Duration(intervalMs) * time.Millisecond)
	defer ticker.Stop()

	// Parse the dashboard's "from" time for the initial full query.
	dashboardFrom := time.Now().Add(-time.Duration(intervalMs) * time.Millisecond)
	if sq.TimeRange.From != "" {
		if parsed, err := time.Parse(time.RFC3339, sq.TimeRange.From); err == nil {
			dashboardFrom = parsed
		}
	}

	backend.Logger.Info(fmt.Sprintf("[streaming] dashboardFrom=%s", dashboardFrom.Format(time.RFC3339)))

	tickCount := 0

	// === TICK 1: Full range query — heavy, populates the panel ===
	tickCount++
	now := time.Now()
	backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | FULL RANGE | from=%s | to=%s",
		tickCount, dashboardFrom.Format("15:04:05"), now.Format("15:04:05")))
	ds.sendStreamQuery(ctx, req.PluginContext, sender, &sq, dashboardFrom, now, tickCount)
	lastTo := now

	// === TICK 2+: Delta queries — lightweight, only new data ===
	for {
		select {
		case <-ctx.Done():
			backend.Logger.Info(fmt.Sprintf("[streaming] RunStream STOPPED | path=%s | totalTicks=%d", req.Path, tickCount))
			return nil
		case <-ticker.C:
			tickCount++
			now = time.Now()
			backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | DELTA | from=%s | to=%s | window=%s",
				tickCount, lastTo.Format("15:04:05"), now.Format("15:04:05"),
				now.Sub(lastTo).Round(time.Millisecond)))
			ds.sendStreamQuery(ctx, req.PluginContext, sender, &sq, lastTo, now, tickCount)
			lastTo = now
		}
	}
}

// sendStreamQuery executes one query against ClickHouse and sends result frames.
// The Interval field stays the same for all queries (full and delta) so that
// $timeSeries, $interval and other macros expand consistently.
func (ds *ClickHouseDatasource) sendStreamQuery(
	ctx context.Context,
	pluginContext backend.PluginContext,
	sender *backend.StreamSender,
	sq *streamQuery,
	from, to time.Time,
	tickCount int,
) {
	evalQ := eval.EvalQuery{
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
		Interval:               sq.Interval, // same interval for full + delta queries
		Database:               sq.Database,
		Table:                  sq.Table,
		MaxDataPoints:          sq.MaxDataPoints,
		FrontendDatasource:     true,
		From:                   from,
		To:                     to,
	}

	response := ds.evalQuery(pluginContext, ctx, &evalQ)
	if response.Error != nil {
		backend.Logger.Error(fmt.Sprintf("[streaming] tick #%d | QUERY ERROR: %s", tickCount, response.Error))
		errFrame := data.NewFrame("error")
		errFrame.RefID = sq.RefId
		errFrame.Meta = &data.FrameMeta{
			Notices: []data.Notice{{Severity: data.NoticeSeverityError, Text: response.Error.Error()}},
		}
		_ = sender.SendFrame(errFrame, data.IncludeAll)
		return
	}

	// If no frames at all, send a heartbeat so the frontend knows the stream is alive
	if len(response.Frames) == 0 {
		emptyFrame := data.NewFrame("heartbeat",
			data.NewField("time", nil, []time.Time{}),
			data.NewField("value", nil, []float64{}),
		)
		emptyFrame.RefID = sq.RefId
		_ = sender.SendFrame(emptyFrame, data.IncludeAll)
		backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | refId=%s | NO DATA (heartbeat sent)", tickCount, sq.RefId))
		return
	}

	sentRows := 0
	for _, frame := range response.Frames {
		sentRows += frame.Rows()
		if err := sender.SendFrame(frame, data.IncludeAll); err != nil {
			backend.Logger.Error(fmt.Sprintf("[streaming] tick #%d | SendFrame ERROR: %s", tickCount, err))
			return
		}
	}

	backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | refId=%s | frames=%d | rows=%d | from=%s | to=%s",
		tickCount, sq.RefId, len(response.Frames), sentRows,
		from.Format("15:04:05"), to.Format("15:04:05"),
	))
}
