package main

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"time"

	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// timeMacroPattern matches all ClickHouse plugin macros that incorporate time range filtering.
// Delta streaming mode requires at least one of these to properly scope queries to a time window.
var timeMacroPattern = regexp.MustCompile(`\$(?:` +
	`timeFilter\b|timeFilterMs\b|timeFilterByColumn\(|timeFilter64ByColumn\(|` +
	`timeSeries\b|timeSeriesMs\b|naturalTimeSeries\b|` +
	`columns\b|columnsMs\b|` +
	`rate\b|rateColumns\b|rateColumnsAggregated\b|` +
	`perSecond\b|perSecondColumns\b|perSecondColumnsAggregated\b|` +
	`delta\b|deltaColumns\b|deltaColumnsAggregated\b|` +
	`increase\b|increaseColumns\b|increaseColumnsAggregated\b|` +
	`lttb\b|lttbMs\b` +
	`)`)

// queryHasTimeMacro checks whether the raw query contains any time-scoping macros.
func queryHasTimeMacro(query string) bool {
	return timeMacroPattern.MatchString(query)
}

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
	StreamingMode          string `json:"streamingMode"`    // "delta" or "full"
	StreamingLookback      int    `json:"streamingLookback"` // number of points to re-query for partial bucket updates

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

// runDeltaLoop implements delta streaming with server-side accumulation:
//   - Tick 1: queries the full time range [dashboardFrom, now] and stores frames in memory
//   - Tick 2+: queries only the narrow window [lastTo, now], merges new rows into stored frames
//
// The frontend always receives the complete accumulated dataset via Replace mode.
// This avoids Grafana's Append buffer issues with multi-frame responses (e.g. GROUP BY host)
// while still keeping ClickHouse load low (only delta queries after tick 1).
//
// Requires time-scoping macros ($timeFilter, $timeSeries, $columns, etc.) in the query
// so that the time range substitution actually limits the data fetched.
func (ds *ClickHouseDatasource) runDeltaLoop(
	ctx context.Context,
	req *backend.RunStreamRequest,
	sender *backend.StreamSender,
	sq *streamQuery,
	dashboardFrom time.Time,
	ticker *time.Ticker,
	queryIntervalSec int64,
) error {
	// Validate that the query contains time-scoping macros
	if !queryHasTimeMacro(sq.Query) {
		errMsg := "Delta streaming mode requires a time-scoping macro in the query " +
			"(e.g. $timeFilter, $timeFilterMs, $timeSeries, $columns, $rate, etc.). " +
			"Without it, every tick would fetch the entire dataset. " +
			"Either add a time macro to the WHERE clause or switch to Full refresh mode."
		backend.Logger.Error(fmt.Sprintf("[streaming] DELTA VALIDATION FAILED | refId=%s | %s", sq.RefId, errMsg))
		ds.sendErrorFrame(sender, sq.RefId, errMsg)
		return fmt.Errorf("delta mode validation: %s", errMsg)
	}

	tickCount := 0
	// Server-side accumulated frames, keyed by frame name
	accumulated := map[string]*data.Frame{}

	// Tick 1: full range [dashboardFrom, now] — initial data load
	tickCount++
	now := roundDownTo(time.Now(), queryIntervalSec)
	backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | DELTA/INITIAL | from=%s | to=%s",
		tickCount, dashboardFrom.Format("15:04:05"), now.Format("15:04:05")))

	response := ds.executeStreamEvalQuery(req.PluginContext, ctx, sq, dashboardFrom, now)
	if response.Error != nil {
		backend.Logger.Error(fmt.Sprintf("[streaming] tick #%d | QUERY ERROR: %s", tickCount, response.Error))
		ds.sendErrorFrame(sender, sq.RefId, response.Error.Error())
	} else {
		for _, frame := range response.Frames {
			if frame.Rows() > 0 {
				name := frameKey(frame)
				accumulated[name] = frame
			}
		}
		ds.sendAccumulatedFrames(sender, accumulated, sq, tickCount)
	}
	lastTo := now

	// Lookback: re-query N recent points to update partial buckets
	lookbackPoints := sq.StreamingLookback
	if lookbackPoints < 0 {
		lookbackPoints = 0
	}

	// Tick 2+: delta query with lookback overlap
	for {
		select {
		case <-ctx.Done():
			backend.Logger.Info(fmt.Sprintf("[streaming] RunStream STOPPED | path=%s | totalTicks=%d", req.Path, tickCount))
			return nil
		case <-ticker.C:
			tickCount++
			now = roundDownTo(time.Now(), queryIntervalSec)

			if !now.After(lastTo) {
				backend.Logger.Debug(fmt.Sprintf("[streaming] tick #%d | DELTA: skipped (now <= lastTo)", tickCount))
				continue
			}

			// Shift from back by lookback to re-query recent incomplete buckets
			deltaFrom := lastTo
			if lookbackPoints > 0 && queryIntervalSec > 0 {
				lookbackDuration := time.Duration(int64(lookbackPoints)*queryIntervalSec) * time.Second
				deltaFrom = lastTo.Add(-lookbackDuration)
				if deltaFrom.Before(dashboardFrom) {
					deltaFrom = dashboardFrom
				}
			}

			backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | DELTA | from=%s | to=%s | lookback=%d",
				tickCount, deltaFrom.Format("15:04:05"), now.Format("15:04:05"), lookbackPoints))

			response := ds.executeStreamEvalQuery(req.PluginContext, ctx, sq, deltaFrom, now)
			if response.Error != nil {
				backend.Logger.Error(fmt.Sprintf("[streaming] tick #%d | QUERY ERROR: %s", tickCount, response.Error))
				ds.sendErrorFrame(sender, sq.RefId, response.Error.Error())
				lastTo = now
				continue
			}

			hasNewData := false
			for _, frame := range response.Frames {
				if frame.Rows() == 0 {
					continue
				}
				hasNewData = true
				name := frameKey(frame)
				if existing, ok := accumulated[name]; ok {
					upsertFrameRows(existing, frame)
				} else {
					accumulated[name] = frame
				}
			}

			if hasNewData {
				// Trim data older than dashboardFrom to prevent unbounded memory growth
				trimAccumulatedFrames(accumulated, dashboardFrom)
				ds.sendAccumulatedFrames(sender, accumulated, sq, tickCount)
			} else {
				backend.Logger.Debug(fmt.Sprintf("[streaming] tick #%d | DELTA: no new rows", tickCount))
			}

			lastTo = now
		}
	}
}

// frameKey returns a stable key for a frame, used to match frames across ticks.
// response.go creates frames with empty Name — the unique series identifier
// is stored in the value field's name (e.g., "host0", "host1").
func frameKey(frame *data.Frame) string {
	if frame.Name != "" {
		return frame.Name
	}
	// Use the first non-time field name as key (this is the series name)
	for _, field := range frame.Fields {
		if field.Type() != data.FieldTypeTime && field.Type() != data.FieldTypeNullableTime {
			return field.Name
		}
	}
	return frame.RefID
}

// upsertFrameRows merges rows from src into dst:
//   - If a timestamp already exists in dst, update the value fields
//   - If a timestamp is new, append the row
//
// This handles the lookback overlap where recent buckets are re-queried
// and may have updated aggregation values.
func upsertFrameRows(dst, src *data.Frame) {
	srcRows := src.Rows()
	if srcRows == 0 || len(dst.Fields) != len(src.Fields) || len(dst.Fields) < 2 {
		return
	}

	// Build time -> row index lookup for dst
	dstTimeIdx := map[int64]int{}
	dstTimeField := dst.Fields[0]
	for r := 0; r < dst.Rows(); r++ {
		if t, ok := dstTimeField.At(r).(time.Time); ok {
			dstTimeIdx[t.UnixMilli()] = r
		}
	}

	for r := 0; r < srcRows; r++ {
		srcTime, ok := src.Fields[0].At(r).(time.Time)
		if !ok {
			continue
		}
		if existingRow, exists := dstTimeIdx[srcTime.UnixMilli()]; exists {
			// Update existing row — overwrite value fields
			for i := 1; i < len(src.Fields); i++ {
				dst.Fields[i].Set(existingRow, src.Fields[i].At(r))
			}
		} else {
			// Append new row
			for i, srcField := range src.Fields {
				dst.Fields[i].Append(srcField.At(r))
			}
			dstTimeIdx[srcTime.UnixMilli()] = dst.Rows() - 1
		}
	}
}

// trimAccumulatedFrames removes rows older than cutoff from all accumulated frames.
// This prevents unbounded memory growth for long-running streams.
func trimAccumulatedFrames(accumulated map[string]*data.Frame, cutoff time.Time) {
	cutoffMs := cutoff.UnixMilli()
	for name, frame := range accumulated {
		if len(frame.Fields) == 0 || frame.Rows() == 0 {
			continue
		}
		timeField := frame.Fields[0]
		// Find the first row >= cutoff
		firstValid := -1
		for r := 0; r < frame.Rows(); r++ {
			if t, ok := timeField.At(r).(time.Time); ok && t.UnixMilli() >= cutoffMs {
				firstValid = r
				break
			}
		}
		if firstValid <= 0 {
			continue // nothing to trim (or all rows are valid)
		}
		// Rebuild fields with only valid rows
		trimmed := data.NewFrame(frame.Name)
		trimmed.RefID = frame.RefID
		trimmed.Meta = frame.Meta
		for _, field := range frame.Fields {
			newField := data.NewFieldFromFieldType(field.Type(), 0)
			newField.Name = field.Name
			newField.Labels = field.Labels
			for r := firstValid; r < field.Len(); r++ {
				newField.Append(field.At(r))
			}
			trimmed.Fields = append(trimmed.Fields, newField)
		}
		accumulated[name] = trimmed
	}
}

// sendAccumulatedFrames merges accumulated frames into a single wide-format frame
// and sends it via Replace. Grafana's streaming Replace mode only keeps the last
// frame sent per channel, so we must combine all series into one frame.
func (ds *ClickHouseDatasource) sendAccumulatedFrames(
	sender *backend.StreamSender,
	accumulated map[string]*data.Frame,
	sq *streamQuery,
	tickCount int,
) {
	wide := mergeFramesToWide(accumulated)
	if wide == nil {
		backend.Logger.Debug(fmt.Sprintf("[streaming] tick #%d | DELTA: nothing to send", tickCount))
		return
	}
	wide.RefID = sq.RefId
	addStreamingNotice(wide, "delta", tickCount, wide.Rows())
	if err := sender.SendFrame(wide, data.IncludeAll); err != nil {
		backend.Logger.Error(fmt.Sprintf("[streaming] tick #%d | SendFrame ERROR: %s", tickCount, err))
		return
	}
	backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | refId=%s | series=%d | rows=%d",
		tickCount, sq.RefId, len(accumulated), wide.Rows()))
}

// mergeFramesToWide combines multiple frames that share a common time field
// into a single wide-format frame using time-based JOIN. This is necessary
// because Grafana's streaming Replace mode only keeps the last frame sent.
//
// Handles frames with different row counts by building a unified time index
// and filling missing values with nil (null). This supports GROUP BY queries
// where some series may not have data in every time bucket.
//
// Input:  {host0: [t, cpu], host1: [t, cpu], host2: [t, cpu]}
// Output: single frame [t, host0_cpu, host1_cpu, host2_cpu]
func mergeFramesToWide(accumulated map[string]*data.Frame) *data.Frame {
	if len(accumulated) == 0 {
		return nil
	}
	// Single frame — no merge needed
	if len(accumulated) == 1 {
		for _, frame := range accumulated {
			return frame
		}
	}

	// Sort frame names for consistent field ordering across ticks
	names := make([]string, 0, len(accumulated))
	for name := range accumulated {
		names = append(names, name)
	}
	sort.Strings(names)
	backend.Logger.Info(fmt.Sprintf("[streaming] mergeFramesToWide: %d frames to merge, keys=%v", len(names), names))

	// 1. Collect all unique timestamps from all frames
	timeSet := map[int64]time.Time{}
	for _, name := range names {
		frame := accumulated[name]
		if len(frame.Fields) == 0 {
			continue
		}
		timeField := frame.Fields[0]
		for r := 0; r < timeField.Len(); r++ {
			if t, ok := timeField.At(r).(time.Time); ok {
				timeSet[t.UnixMilli()] = t
			}
		}
	}

	// 2. Sort timestamps
	sortedMs := make([]int64, 0, len(timeSet))
	for ms := range timeSet {
		sortedMs = append(sortedMs, ms)
	}
	sort.Slice(sortedMs, func(i, j int) bool { return sortedMs[i] < sortedMs[j] })

	totalRows := len(sortedMs)
	msToIdx := make(map[int64]int, totalRows)
	timeValues := make([]time.Time, totalRows)
	for i, ms := range sortedMs {
		msToIdx[ms] = i
		timeValues[i] = timeSet[ms]
	}

	// 3. Build wide frame with unified time field
	wide := data.NewFrame("")
	wide.Fields = append(wide.Fields, data.NewField("t", nil, timeValues))

	// 4. For each series, create nullable value fields aligned to the time index
	for _, name := range names {
		frame := accumulated[name]
		if len(frame.Fields) < 2 {
			continue
		}
		timeField := frame.Fields[0]

		for fi := 1; fi < len(frame.Fields); fi++ {
			srcField := frame.Fields[fi]
			values := make([]*float64, totalRows) // nil = no data

			for r := 0; r < frame.Rows(); r++ {
				t, ok := timeField.At(r).(time.Time)
				if !ok {
					continue
				}
				idx, exists := msToIdx[t.UnixMilli()]
				if !exists {
					continue
				}
				v := toFloat64(srcField.At(r))
				values[idx] = &v
			}

			wide.Fields = append(wide.Fields, data.NewField(srcField.Name, srcField.Labels, values))
		}
	}

	fieldNames := make([]string, 0, len(wide.Fields))
	for _, f := range wide.Fields {
		fieldNames = append(fieldNames, f.Name)
	}
	backend.Logger.Info(fmt.Sprintf("[streaming] mergeFramesToWide: result — %d fields %v, %d rows",
		len(wide.Fields), fieldNames, totalRows))

	return wide
}

// toFloat64 converts a data.Field value to float64.
func toFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int64:
		return float64(val)
	case int32:
		return float64(val)
	case int:
		return float64(val)
	case uint64:
		return float64(val)
	case uint32:
		return float64(val)
	case *float64:
		if val != nil {
			return *val
		}
		return 0
	case *float32:
		if val != nil {
			return float64(*val)
		}
		return 0
	default:
		return 0
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
	var lastFingerprint [16]byte

	// First tick immediately
	tickCount++
	now := roundDownTo(time.Now(), queryIntervalSec)
	backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | FULL_REFRESH | from=%s | to=%s",
		tickCount, dashboardFrom.Format("15:04:05"), now.Format("15:04:05")))
	ds.sendFramesWithDedup(ctx, req.PluginContext, sender, sq, dashboardFrom, now, &lastFingerprint, tickCount)

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
			ds.sendFramesWithDedup(ctx, req.PluginContext, sender, sq, dashboardFrom, now, &lastFingerprint, tickCount)
		}
	}
}

// sendFramesWithDedup executes a query, merges frames into a single wide-format frame,
// and sends it only when the result has changed (fingerprint comparison).
// Used by full refresh mode.
func (ds *ClickHouseDatasource) sendFramesWithDedup(
	ctx context.Context,
	pluginContext backend.PluginContext,
	sender *backend.StreamSender,
	sq *streamQuery,
	from, to time.Time,
	lastFingerprint *[16]byte,
	tickCount int,
) {
	response := ds.executeStreamEvalQuery(pluginContext, ctx, sq, from, to)
	if response.Error != nil {
		backend.Logger.Error(fmt.Sprintf("[streaming] tick #%d | QUERY ERROR: %s", tickCount, response.Error))
		ds.sendErrorFrame(sender, sq.RefId, response.Error.Error())
		return
	}

	// Collect non-empty frames into a map for merging
	framesMap := map[string]*data.Frame{}
	for _, frame := range response.Frames {
		if frame.Rows() > 0 {
			framesMap[frameKey(frame)] = frame
		}
	}

	if len(framesMap) == 0 {
		ds.sendHeartbeat(sender, sq.RefId)
		backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | refId=%s | NO DATA (heartbeat sent)", tickCount, sq.RefId))
		return
	}

	wide := mergeFramesToWide(framesMap)
	if wide == nil {
		return
	}

	// Dedup: skip if fingerprint unchanged
	fp := frameFingerprint(wide)
	if *lastFingerprint == fp {
		backend.Logger.Debug(fmt.Sprintf("[streaming] tick #%d | FULL: unchanged (skipped)", tickCount))
		return
	}
	*lastFingerprint = fp

	wide.RefID = sq.RefId
	addStreamingNotice(wide, "full", tickCount, wide.Rows())
	if err := sender.SendFrame(wide, data.IncludeAll); err != nil {
		backend.Logger.Error(fmt.Sprintf("[streaming] tick #%d | SendFrame ERROR: %s", tickCount, err))
		return
	}

	backend.Logger.Info(fmt.Sprintf("[streaming] tick #%d | refId=%s | series=%d | rows=%d",
		tickCount, sq.RefId, len(framesMap), wide.Rows()))
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
