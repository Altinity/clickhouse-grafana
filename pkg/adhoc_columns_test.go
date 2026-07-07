package main

import (
	"context"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
)

// --- parseColumnTypes ---

func TestParseColumnTypes_NilResponse(t *testing.T) {
	got := parseColumnTypes(nil)
	assert.NotNil(t, got, "should return non-nil empty map for nil response")
	assert.Empty(t, got)
}

func TestParseColumnTypes_EmptyData(t *testing.T) {
	resp := &Response{
		Meta: []*FieldMeta{
			{Name: "name", Type: "String"},
			{Name: "type", Type: "String"},
		},
		Data: []map[string]interface{}{},
	}
	got := parseColumnTypes(resp)
	assert.NotNil(t, got)
	assert.Empty(t, got)
}

func TestParseColumnTypes_TypicalRows(t *testing.T) {
	resp := &Response{
		Meta: []*FieldMeta{
			{Name: "name", Type: "String"},
			{Name: "type", Type: "String"},
		},
		Data: []map[string]interface{}{
			{"name": "_map", "type": "Map(String, String)"},
			{"name": "j", "type": "JSON"},
			{"name": "coords", "type": "Tuple(lat Float64, lon Float64)"},
		},
	}
	got := parseColumnTypes(resp)
	assert.Equal(t, map[string]string{
		"_map":   "Map(String, String)",
		"j":      "JSON",
		"coords": "Tuple(lat Float64, lon Float64)",
	}, got)
}

func TestParseColumnTypes_MissingNameKey(t *testing.T) {
	// Row missing "name" key — should be skipped, not panic.
	resp := &Response{
		Data: []map[string]interface{}{
			{"type": "String"},         // no "name" key
			{"name": "id", "type": "UInt64"}, // valid
		},
	}
	got := parseColumnTypes(resp)
	assert.Equal(t, map[string]string{"id": "UInt64"}, got)
}

func TestParseColumnTypes_NonStringValues(t *testing.T) {
	// Values that are not strings (e.g. numbers from JSON decoder) should be skipped.
	resp := &Response{
		Data: []map[string]interface{}{
			{"name": 42, "type": "UInt8"},    // name is not a string
			{"name": "ts", "type": 99},       // type is not a string
			{"name": "ok", "type": "DateTime"}, // valid
		},
	}
	got := parseColumnTypes(resp)
	assert.Equal(t, map[string]string{"ok": "DateTime"}, got)
}

func TestParseColumnTypes_EmptyNameSkipped(t *testing.T) {
	resp := &Response{
		Data: []map[string]interface{}{
			{"name": "", "type": "String"},   // empty name — skip
			{"name": "x", "type": "Float32"}, // valid
		},
	}
	got := parseColumnTypes(resp)
	assert.Equal(t, map[string]string{"x": "Float32"}, got)
}

// --- fetchColumnTypes: empty database/table short-circuit ---

func TestFetchColumnTypes_EmptyDatabaseReturnsNil(t *testing.T) {
	ds := &ClickHouseDatasource{}
	got := ds.fetchColumnTypes(context.Background(), backend.PluginContext{}, "", "mytable")
	assert.Nil(t, got, "should return nil for empty database without contacting server")
}

func TestFetchColumnTypes_EmptyTableReturnsNil(t *testing.T) {
	ds := &ClickHouseDatasource{}
	got := ds.fetchColumnTypes(context.Background(), backend.PluginContext{}, "mydb", "")
	assert.Nil(t, got, "should return nil for empty table without contacting server")
}

func TestFetchColumnTypes_BothEmptyReturnsNil(t *testing.T) {
	ds := &ClickHouseDatasource{}
	got := ds.fetchColumnTypes(context.Background(), backend.PluginContext{}, "", "")
	assert.Nil(t, got)
}

// --- Finding E: columnCacheKey must include datasource identity ---

// TestColumnCacheKey_IncludesDatasourceUID verifies that the cache key is
// scoped per-datasource-instance, so that two different ClickHouse
// datasources with the same database/table name never collide in the
// shared package-level columnTypeCache.
func TestColumnCacheKey_IncludesDatasourceUID(t *testing.T) {
	keyA := columnCacheKey("uid-A", "default", "logs")
	keyB := columnCacheKey("uid-B", "default", "logs")
	if keyA == keyB {
		t.Errorf("expected different cache keys for different datasource UIDs, got same key %q for both", keyA)
	}
}

// TestColumnCacheKey_SameInputsSameKey verifies determinism.
func TestColumnCacheKey_SameInputsSameKey(t *testing.T) {
	keyA := columnCacheKey("uid-A", "default", "logs")
	keyB := columnCacheKey("uid-A", "default", "logs")
	if keyA != keyB {
		t.Errorf("expected same cache key for identical inputs, got %q vs %q", keyA, keyB)
	}
}

// TestColumnCacheKey_EmptyUIDStillSafe verifies the guard: an empty UID
// (e.g. when PluginContext.DataSourceInstanceSettings is nil) still produces
// a usable, deterministic key rather than panicking.
func TestColumnCacheKey_EmptyUIDStillSafe(t *testing.T) {
	key := columnCacheKey("", "default", "logs")
	if key == "" {
		t.Errorf("expected non-empty cache key even with empty UID")
	}
}

// TestFetchColumnTypes_NilDataSourceInstanceSettingsSafe verifies that
// fetchColumnTypes does not panic when PluginContext.DataSourceInstanceSettings
// is nil (the guard from Finding E) — it should still short-circuit safely for
// empty database/table without touching the cache key logic's nil-deref risk.
func TestFetchColumnTypes_NilDataSourceInstanceSettingsSafe(t *testing.T) {
	ds := &ClickHouseDatasource{}
	pluginCtx := backend.PluginContext{DataSourceInstanceSettings: nil}
	got := ds.fetchColumnTypes(context.Background(), pluginCtx, "", "mytable")
	assert.Nil(t, got, "should return nil for empty database without touching cache key / client logic")
}
