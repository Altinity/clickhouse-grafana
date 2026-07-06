# Streaming: Append Mode + Delta Macro Validation

**Issue:** [#429](https://github.com/Altinity/clickhouse-grafana/issues/429)
**Branch:** `streaming`
**Date:** 2026-04-05
**Status:** Implemented

## Context

The `streaming` branch implements real-time data streaming via Grafana Live with two modes (delta and full). This design refines the delta mode to use true append semantics and adds backend validation for required time macros.

## Changes

### 1. Delta Mode: True Append

**Previous behavior:**
- Tick 1: full range query `[dashboardFrom, now]` → Replace
- Tick 2+: lightweight probe `[lastTo, now]` → if new data found → re-query full range `[dashboardFrom, now]` → Replace

**New behavior:**
- Tick 1: full range query `[dashboardFrom, now]` → sent to frontend (initial dataset)
- Tick 2+: query only `[lastTo, now]` → send only new data points (append to existing dataset)
- `lastTo` is updated after each tick, aligned to complete buckets via `roundDownTo`
- Tick is skipped if rounded `now <= lastTo` (time hasn't advanced by a full bucket)

**Backend (`pkg/streaming.go`):**
- `runDeltaLoop` rewritten: tick 1 queries full range, tick 2+ queries narrow `[lastTo, now]` window
- New `sendDeltaFrames` function sends all non-empty frames without fingerprint deduplication — each tick sends whatever new data exists
- `sendFramesWithDedup` (with fingerprint comparison) is now only used by full refresh mode
- `lastTo` is set to rounded `now` (not `time.Now()`), preventing boundary issues

**Frontend (`src/datasource/datasource.ts`):**
- `StreamingFrameAction.Append` when `streamingMode === 'delta'`
- `StreamingFrameAction.Replace` when `streamingMode === 'full'` (unchanged)

**Note on first tick:** Grafana's Append on an empty buffer is equivalent to Replace — the first full-range result populates the panel, subsequent narrow results are appended. No special handling needed.

### 2. Full Mode: No Changes

Full refresh mode stays as-is:
- Every tick: full range query `[dashboardFrom, now]` → Replace
- Deduplication via fingerprint to avoid redundant sends

### 3. Delta Mode: Mandatory Time Macro Validation

Time macros are required for delta mode because the backend substitutes `from`/`to` into the query. Without them, every tick would fetch the entire dataset regardless of the time window.

**Backend validation (`pkg/streaming.go`):**
- `timeMacroPattern` regex covers all time-scoping macros: `$timeFilter`, `$timeFilterMs`, `$timeFilterByColumn`, `$timeFilter64ByColumn`, `$timeSeries`, `$timeSeriesMs`, `$naturalTimeSeries`, `$columns`, `$columnsMs`, `$rate`, `$rateColumns`, `$rateColumnsAggregated`, `$perSecond`, `$perSecondColumns`, `$perSecondColumnsAggregated`, `$delta`, `$deltaColumns`, `$deltaColumnsAggregated`, `$increase`, `$increaseColumns`, `$increaseColumnsAggregated`, `$lttb`, `$lttbMs`
- `queryHasTimeMacro()` validates the query before the delta loop starts
- If no macro found: sends error frame to the panel AND returns error (stream does not start)
- Error message explains the issue and suggests adding a macro or switching to full refresh mode

**Frontend (`StreamingModeSelect.tsx`):**
- `TIME_MACRO_PATTERN` regex expanded to match the same full list of macros as the backend
- Inline Alert shown when delta mode is selected without time macros in the query (severity: `error`)

### 4. Debug Logging

Console.log statements in `datasource.ts` are kept as-is for now (development/debugging phase).

## Time Range Changes

When the user changes the dashboard time range, `timeRange.from` is part of the channel path hash. Grafana creates a new channel → old `RunStream` terminates via `ctx.Done()` → new `RunStream` starts with tick 1 (full range). This is correct behavior — effectively a "stream reset".

## What Is NOT Changing

- `frameFingerprint` implementation (first/last value comparison) — stays as-is, used only by full mode
- Full mode behavior — stays as-is
- Test coverage — deferred
- Console.log cleanup — deferred
- Template variable resolution — out of scope for this iteration
- `rawQuery` field handling — out of scope
