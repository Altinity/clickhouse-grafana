package main

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/stretchr/testify/require"
)

func ptr[T any](v T) *T { return &v }

func TestParseTimeZone(t *testing.T) {
	require.Equal(t, "Europe/Moscow", ParseTimeZone("Europe/Moscow").String())
	require.Equal(t, time.UTC, ParseTimeZone("Not/AZone"))
}

// Documents the current slicing behavior, including the off-by-one on quoted names.
func TestExtractTimeZoneNameFromFieldType(t *testing.T) {
	tests := []struct {
		fieldType string
		want      string
	}{
		{"DateTime('UTC')", "TC"},
		{"DateTime(' UTC')", "UTC"},
		{"Date(' UTC')", "UTC"},
		{"DateTime64('3', 'UTC')", "UTC"},
		{"DateTime64(3,'Europe/Moscow')", ""},
		{"Array(DateTime(' UTC'))", "UTC"},
		{"Array(String)", ""},
		{"DateTime", ""},
		{"String", ""},
	}
	for _, tt := range tests {
		t.Run(tt.fieldType, func(t *testing.T) {
			require.Equal(t, tt.want, extractTimeZoneNameFromFieldType(tt.fieldType))
		})
	}
}

func TestFetchTimeZoneFromFieldType(t *testing.T) {
	server := ParseTimeZone("Europe/Moscow")
	require.Equal(t, time.UTC, fetchTimeZoneFromFieldType("DateTime(' UTC')", server))
	require.Equal(t, server, fetchTimeZoneFromFieldType("DateTime", server))
}

func TestIsValueSafeForFloat64(t *testing.T) {
	tests := []struct {
		name      string
		value     interface{}
		fieldType string
		want      bool
	}{
		{"nil", nil, "UInt64", true},
		{"uint64 max safe", json.Number("9007199254740991"), "UInt64", true},
		{"uint64 unsafe", json.Number("9007199254740992"), "UInt64", false},
		{"uint64 string", "42", "UInt64", true},
		{"uint64 garbage", "abc", "UInt64", true},
		{"int64 min safe", "-9007199254740991", "Int64", true},
		{"int64 negative unsafe", "-9007199254740992", "Int64", false},
		{"int64 positive unsafe", json.Number("9007199254740992"), "Int64", false},
		{"int64 garbage", "abc", "Int64", true},
		{"nullable uint64 unsafe", json.Number("18446744073709551615"), "Nullable(UInt64)", false},
		{"lowcardinality nullable int64", json.Number("1"), "LowCardinality(Nullable(Int64))", true},
		{"non-integer type", "whatever", "String", true},
		{"non-string value", 42, "UInt64", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, IsValueSafeForFloat64(tt.value, tt.fieldType))
		})
	}
}

func TestNewDataFieldByTypeOptimized(t *testing.T) {
	tests := []struct {
		name      string
		fieldName string
		fieldType string
		stringPre bool
		want      data.FieldType
	}{
		{"string", "s", "String", true, data.FieldTypeString},
		{"nullable string", "s", "Nullable(String)", true, data.FieldTypeNullableString},
		{"lowcardinality string", "s", "LowCardinality(String)", true, data.FieldTypeString},
		{"uuid", "s", "UUID", true, data.FieldTypeString},
		{"uint32", "v", "UInt32", true, data.FieldTypeFloat64},
		{"nullable float64", "v", "Nullable(Float64)", true, data.FieldTypeNullableFloat64},
		{"uint64 t timestamp", "t", "UInt64", true, data.FieldTypeTime},
		{"uint64 nullable t", "t", "Nullable(UInt64)", true, data.FieldTypeNullableString},
		{"uint64 string precision", "v", "UInt64", true, data.FieldTypeString},
		{"uint64 float mode", "v", "UInt64", false, data.FieldTypeFloat64},
		{"int64 string precision", "v", "Int64", true, data.FieldTypeString},
		{"int64 float mode", "v", "Int64", false, data.FieldTypeFloat64},
		{"decimal", "v", "Decimal(10,2)", true, data.FieldTypeFloat64},
		{"fixed string", "v", "FixedString(3)", true, data.FieldTypeString},
		{"enum", "v", "Enum8('a' = 1)", true, data.FieldTypeString},
		{"datetime", "d", "DateTime", true, data.FieldTypeTime},
		{"nullable datetime", "d", "Nullable(DateTime)", true, data.FieldTypeNullableTime},
		{"datetime64", "d", "DateTime64(3)", true, data.FieldTypeTime},
		{"date", "d", "Date", true, data.FieldTypeTime},
		{"unknown", "v", "SomethingElse", true, data.FieldTypeString},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NewDataFieldByTypeOptimized(tt.fieldName, tt.fieldType, tt.stringPre)
			require.Equal(t, tt.want, got.Type())
			require.Equal(t, tt.fieldName, got.Name)
		})
	}
}

func TestNewDataFieldByType(t *testing.T) {
	require.Equal(t, data.FieldTypeString, NewDataFieldByType("v", "UInt64").Type())
}

func TestParseValueOptimized(t *testing.T) {
	tz := time.UTC
	ts := time.Unix(0, 1609459200000*int64(time.Millisecond))
	tests := []struct {
		name      string
		fieldName string
		fieldType string
		value     interface{}
		stringPre bool
		want      Value
	}{
		{"string", "s", "String", "abc", true, "abc"},
		{"nullable string", "s", "Nullable(String)", "abc", true, ptr("abc")},
		{"nullable string nil", "s", "Nullable(String)", nil, true, nil},
		{"lowcardinality string", "s", "LowCardinality(String)", "abc", true, "abc"},
		{"uuid", "s", "UUID", "id", true, "id"},
		{"map", "m", "Map(String,String)", map[string]interface{}{"k": "v"}, true, `{"k":"v"}`},
		{"map non-map", "m", "Map(String,String)", "x", true, ""},
		{"float64 number", "v", "Float64", json.Number("1.5"), true, 1.5},
		{"float64 raw", "v", "Float64", 2.5, true, 2.5},
		{"nullable uint8", "v", "Nullable(UInt8)", json.Number("7"), true, ptr(7.0)},
		{"uint64 t timestamp", "t", "UInt64", json.Number("1609459200000"), true, ts},
		{"int64 t timestamp", "t", "Int64", json.Number("1609459200000"), true, ts},
		{"uint64 as string", "v", "UInt64", json.Number("18446744073709551615"), true, "18446744073709551615"},
		{"uint64 as float", "v", "UInt64", json.Number("42"), false, 42.0},
		{"int64 as string", "v", "Int64", json.Number("-9223372036854775808"), true, "-9223372036854775808"},
		{"int64 as float", "v", "Int64", json.Number("-5"), false, -5.0},
		{"nullable uint64 nil", "v", "Nullable(UInt64)", nil, true, nil},
		{"decimal", "v", "Decimal(10,2)", json.Number("1.23"), true, 1.23},
		{"fixed string", "v", "FixedString(3)", "abc", true, "abc"},
		{"enum", "v", "Enum8('a' = 1)", "a", true, "a"},
		{"datetime64 3", "d", "DateTime64(3)", "2024-01-15 10:00:00.123", true, time.Date(2024, 1, 15, 10, 0, 0, 123000000, tz)},
		{"datetime64 6", "d", "DateTime64(6)", "2024-01-15 10:00:00.123456", true, time.Date(2024, 1, 15, 10, 0, 0, 123456000, tz)},
		{"datetime", "d", "DateTime", "2024-01-15 10:00:00", true, time.Date(2024, 1, 15, 10, 0, 0, 0, tz)},
		{"date", "d", "Date", "2024-01-15", true, time.Date(2024, 1, 15, 0, 0, 0, 0, tz)},
		{"unknown compound json fallback", "v", "Array(String)", []interface{}{"a"}, true, `["a"]`},
		{"unknown unmarshalable", "v", "SomethingElse", make(chan int), true, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, ParseValueOptimized(tt.fieldName, tt.fieldType, tz, tt.value, false, tt.stringPre))
		})
	}
}

func TestParseValueDefaultsToStringPrecision(t *testing.T) {
	require.Equal(t, "1", ParseValue("v", "UInt64", time.UTC, json.Number("1"), false))
}

func TestParseUInt64Value(t *testing.T) {
	require.Equal(t, uint64(18446744073709551615), parseUInt64Value(json.Number("18446744073709551615"), false))
	require.Equal(t, ptr(uint64(7)), parseUInt64Value("7", true))
	require.Equal(t, uint64(0), parseUInt64Value("abc", false))
	require.Nil(t, parseUInt64Value("abc", true))
	require.Nil(t, parseUInt64Value(nil, true))
	require.Equal(t, uint64(0), parseUInt64Value(nil, false))
}

func TestParseInt64Value(t *testing.T) {
	require.Equal(t, int64(-9223372036854775808), parseInt64Value(json.Number("-9223372036854775808"), false))
	require.Equal(t, ptr(int64(-7)), parseInt64Value("-7", true))
	require.Equal(t, int64(0), parseInt64Value("abc", false))
	require.Nil(t, parseInt64Value("abc", true))
	require.Nil(t, parseInt64Value(nil, true))
	require.Equal(t, int64(0), parseInt64Value(nil, false))
}

func TestParseIntegersAsStringValue(t *testing.T) {
	require.Equal(t, "0", parseUInt64AsStringValue(nil, false))
	require.Nil(t, parseUInt64AsStringValue(nil, true))
	require.Equal(t, "18446744073709551615", parseUInt64AsStringValue(json.Number("18446744073709551615"), false))
	require.Equal(t, ptr("42"), parseUInt64AsStringValue(42, true))
	require.Equal(t, "0", parseInt64AsStringValue(nil, false))
	require.Nil(t, parseInt64AsStringValue(nil, true))
	require.Equal(t, "-1", parseInt64AsStringValue(json.Number("-1"), false))
	require.Equal(t, ptr("-42"), parseInt64AsStringValue(-42, true))
}

func TestParseIntegersAsFloat64Value(t *testing.T) {
	require.Equal(t, 0.0, parseUInt64AsFloat64Value(nil, false))
	require.Nil(t, parseUInt64AsFloat64Value(nil, true))
	require.Equal(t, float64(18446744073709551615), parseUInt64AsFloat64Value(json.Number("18446744073709551615"), false))
	require.Equal(t, 0.0, parseUInt64AsFloat64Value("abc", false))
	require.Nil(t, parseUInt64AsFloat64Value("abc", true))
	require.Equal(t, ptr(42.0), parseUInt64AsFloat64Value(42, true))
	require.Equal(t, 0.0, parseInt64AsFloat64Value(nil, false))
	require.Nil(t, parseInt64AsFloat64Value(nil, true))
	require.Equal(t, -42.0, parseInt64AsFloat64Value(json.Number("-42"), false))
	require.Equal(t, 0.0, parseInt64AsFloat64Value("abc", false))
	require.Nil(t, parseInt64AsFloat64Value("abc", true))
	require.Equal(t, ptr(-1.0), parseInt64AsFloat64Value("-1", true))
}

func TestParseTimestampValue(t *testing.T) {
	ts := time.Unix(0, 1609459200000*int64(time.Millisecond))
	require.Equal(t, ts, parseTimestampValue(json.Number("1609459200000"), false))
	require.Equal(t, &ts, parseTimestampValue("1609459200000", true))
	require.Equal(t, time.Unix(0, 0), parseTimestampValue("abc", false))
	require.Nil(t, parseTimestampValue(nil, true))
}

func TestParseDateTimeValue(t *testing.T) {
	want := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	require.Equal(t, want, parseDateTimeValue("2024-01-15 10:00:00", dateTimeLayout, time.UTC, false))
	require.Equal(t, &want, parseDateTimeValue("2024-01-15 10:00:00", dateTimeLayout, time.UTC, true))
	require.Equal(t, time.Unix(0, 0), parseDateTimeValue("garbage", dateTimeLayout, time.UTC, false))
	require.Nil(t, parseDateTimeValue(nil, dateTimeLayout, time.UTC, true))
}

func TestParseFloatValue(t *testing.T) {
	require.Equal(t, 1.5, parseFloatValue(json.Number("1.5"), false))
	require.Equal(t, ptr(2.5), parseFloatValue(2.5, true))
	require.Equal(t, 0.0, parseFloatValue(json.Number("abc"), false))
	require.Nil(t, parseFloatValue(json.Number("abc"), true))
	require.Nil(t, parseFloatValue(nil, true))
	require.Equal(t, 0.0, parseFloatValue(nil, false))
}

func TestParseStringValue(t *testing.T) {
	require.Equal(t, "x", parseStringValue("x", false))
	require.Equal(t, ptr("x"), parseStringValue("x", true))
	require.Nil(t, parseStringValue(nil, true))
	require.Equal(t, "", parseStringValue(nil, false))
}

func TestParseMapValue(t *testing.T) {
	require.Equal(t, `{"a":1}`, parseMapValue(map[string]interface{}{"a": 1}, false))
	require.Nil(t, parseMapValue(map[string]interface{}{"c": make(chan int)}, false))
	require.Nil(t, parseMapValue("not a map", true))
	require.Equal(t, "", parseMapValue("not a map", false))
}
