package main

import (
	"context"
	"testing"
	"time"
)

// TestToFramesWithTimeStampAndLabels verifies that 3-field queries
// (time, category/label, value) are processed correctly:
// - The timestamp column should be used only for timestamps, not as a data field
// - The label column should be used for series naming, not as a data field
// - Only the value column should appear in the data frames
// This is a regression test for issue #500 ($lttb dashboards broken after issue #832 changes)
func TestToFramesWithTimeStampAndLabels(t *testing.T) {
	r := &Response{
		ctx: context.Background(),
		Meta: []*FieldMeta{
			{Name: "event_time", Type: "DateTime"},
			{Name: "category", Type: "String"},
			{Name: "requests", Type: "Float64"},
		},
		Data: []map[string]interface{}{
			{"event_time": "2024-01-15 10:00:00", "category": "web", "requests": 150.0},
			{"event_time": "2024-01-15 10:00:00", "category": "api", "requests": 300.0},
			{"event_time": "2024-01-15 11:00:00", "category": "web", "requests": 200.0},
			{"event_time": "2024-01-15 11:00:00", "category": "api", "requests": 350.0},
		},
	}

	query := &Query{RefId: "A"}
	fetchTZ := func(ctx context.Context) *time.Location { return time.UTC }

	frames, err := r.toFrames(query, fetchTZ)
	if err != nil {
		t.Fatalf("toFrames returned error: %v", err)
	}

	// Should have 2 frames: one for "web" and one for "api"
	if len(frames) != 2 {
		t.Fatalf("expected 2 frames, got %d", len(frames))
	}

	for _, frame := range frames {
		// Each frame should have exactly 2 fields: timestamp + value
		if len(frame.Fields) != 2 {
			t.Errorf("frame %q: expected 2 fields (timestamp + value), got %d", frame.Name, len(frame.Fields))
		}

		// First field should be the timestamp
		if frame.Fields[0].Name != "event_time" {
			t.Errorf("frame %q: expected first field to be 'event_time', got %q", frame.Name, frame.Fields[0].Name)
		}

		// Second field should be "requests", NOT "event_time" or "category"
		valueFieldName := frame.Fields[1].Name
		if valueFieldName == "event_time" {
			t.Errorf("frame %q: timestamp column 'event_time' leaked into data fields", frame.Name)
		}
		if valueFieldName == "category" {
			t.Errorf("frame %q: label column 'category' leaked into data fields", frame.Name)
		}

		// Verify the value field contains numeric data (Float64), not DateTime strings
		if frame.Fields[1].Len() != 2 {
			t.Errorf("frame %q: expected 2 data points, got %d", frame.Name, frame.Fields[1].Len())
		}
	}
}

// TestToFramesWithTimeStampNoLabels verifies that 2-field queries
// (time, value) work correctly without label fields
func TestToFramesWithTimeStampNoLabels(t *testing.T) {
	r := &Response{
		ctx: context.Background(),
		Meta: []*FieldMeta{
			{Name: "event_time", Type: "DateTime"},
			{Name: "requests", Type: "Float64"},
		},
		Data: []map[string]interface{}{
			{"event_time": "2024-01-15 10:00:00", "requests": 150.0},
			{"event_time": "2024-01-15 11:00:00", "requests": 200.0},
		},
	}

	query := &Query{RefId: "A"}
	fetchTZ := func(ctx context.Context) *time.Location { return time.UTC }

	frames, err := r.toFrames(query, fetchTZ)
	if err != nil {
		t.Fatalf("toFrames returned error: %v", err)
	}

	if len(frames) != 1 {
		t.Fatalf("expected 1 frame, got %d", len(frames))
	}

	frame := frames[0]
	if len(frame.Fields) != 2 {
		t.Errorf("expected 2 fields, got %d", len(frame.Fields))
	}

	if frame.Fields[0].Name != "event_time" {
		t.Errorf("expected first field 'event_time', got %q", frame.Fields[0].Name)
	}
	if frame.Fields[1].Name != "requests" {
		t.Errorf("expected second field 'requests', got %q", frame.Fields[1].Name)
	}
	if frame.Fields[1].Len() != 2 {
		t.Errorf("expected 2 data points, got %d", frame.Fields[1].Len())
	}
}
