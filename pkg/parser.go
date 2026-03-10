package main

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

var datePrefix = "Date"
var dateTimePrefix = "DateTime"
var dateTime64Prefix = "DateTime64"
var timeZonePrefix = "('"
var timeZone64Separator = ","
var dateTZPrefix = datePrefix + timeZonePrefix
var dateTimeTZPrefix = dateTimePrefix + timeZonePrefix
var dateTime64TZPrefix = dateTime64Prefix + timeZonePrefix

var dateLayout = "2006-01-02"
var dateTimeLayout = dateLayout + " 15:04:05"
var dateTime64Layout3 = dateTimeLayout + ".000"
var dateTime64Layout6 = dateTimeLayout + ".000000"

type FetchTZFunc = func(ctx context.Context) *time.Location
type Value interface{}

func ParseTimeZone(tz string) *time.Location {
	location, err := time.LoadLocation(tz)

	if err == nil {
		return location
	} else {
		return time.UTC
	}
}

var dateTimeTypeRE = regexp.MustCompile(`(Date\([^)]+\)|DateTime\([^)]+\)|DateTime64\([^)]+\))`)

func extractTimeZoneNameFromFieldType(fieldType string) string {
	tz := ""
	if strings.HasPrefix(fieldType, dateTZPrefix) {
		tz = fieldType[len(dateTZPrefix)+1 : len(fieldType)-2]
	} else if strings.HasPrefix(fieldType, dateTimeTZPrefix) {
		tz = fieldType[len(dateTimeTZPrefix)+1 : len(fieldType)-2]
	} else if strings.HasPrefix(fieldType, dateTime64TZPrefix) && strings.Contains(fieldType, timeZone64Separator) {
		tz = fieldType[strings.Index(fieldType, timeZone64Separator)+3 : len(fieldType)-2]
	} else if complexTypeRE.MatchString(fieldType) {
		if matches := dateTimeTypeRE.FindAllStringSubmatch(fieldType, 1); len(matches) > 0 {
			return extractTimeZoneNameFromFieldType(matches[0][1])
		}
	}
	return strings.Trim(tz, " \t\v\n\r")
}

func fetchTimeZoneFromFieldType(fieldType string, tzFromServer *time.Location) *time.Location {
	tz := extractTimeZoneNameFromFieldType(fieldType)

	if tz != "" {
		return ParseTimeZone(tz)
	} else {
		return tzFromServer
	}
}

// maxSafeInteger is JavaScript's Number.MAX_SAFE_INTEGER (2^53 - 1)
const maxSafeInteger uint64 = 9007199254740991

// minSafeIntegerAbs is the absolute value of JavaScript's Number.MIN_SAFE_INTEGER
const minSafeIntegerAbs uint64 = 9007199254740991

// IsValueSafeForFloat64 checks if a value can be safely represented as float64 without precision loss.
// Returns true if the value is within JavaScript's safe integer range.
func IsValueSafeForFloat64(value interface{}, fieldType string) bool {
	if value == nil {
		return true
	}

	// Get the string representation
	var strVal string
	switch v := value.(type) {
	case json.Number:
		strVal = string(v)
	case string:
		strVal = v
	default:
		strVal = fmt.Sprintf("%v", value)
	}

	// Normalize the type
	normalizedType := fieldType
	if strings.HasPrefix(normalizedType, "LowCardinality(") {
		normalizedType = strings.TrimSuffix(strings.TrimPrefix(normalizedType, "LowCardinality("), ")")
	}
	if strings.HasPrefix(normalizedType, "Nullable(") {
		normalizedType = strings.TrimSuffix(strings.TrimPrefix(normalizedType, "Nullable("), ")")
	}

	switch normalizedType {
	case "UInt64":
		ui64, err := strconv.ParseUint(strVal, 10, 64)
		if err != nil {
			return true // Can't parse, assume safe
		}
		return ui64 <= maxSafeInteger
	case "Int64":
		i64, err := strconv.ParseInt(strVal, 10, 64)
		if err != nil {
			return true // Can't parse, assume safe
		}
		if i64 < 0 {
			return uint64(-i64) <= minSafeIntegerAbs
		}
		return uint64(i64) <= maxSafeInteger
	default:
		return true
	}
}

// NewDataFieldByType creates a data field with appropriate type.
// For UInt64/Int64, defaults to string to preserve precision.
// Use NewDataFieldByTypeOptimized for dynamic type selection based on actual values.
func NewDataFieldByType(fieldName, fieldType string) *data.Field {
	return NewDataFieldByTypeOptimized(fieldName, fieldType, true)
}

// NewDataFieldByTypeOptimized creates a data field with appropriate type.
// For UInt64/Int64, uses needsStringPrecision to decide between string (true) or float64 (false).
// This allows for optimal type selection: use float64 when all values are safe (for alerts),
// or string when precision must be preserved (for large integers).
func NewDataFieldByTypeOptimized(fieldName, fieldType string, needsStringPrecision bool) *data.Field {

	if strings.HasPrefix(fieldType, "LowCardinality") {
		fieldType = strings.TrimSuffix(strings.TrimPrefix(fieldType, "LowCardinality("), ")")
	}

	isNullable := strings.Contains(fieldType, "Nullable")
	fieldType = strings.TrimSuffix(strings.TrimPrefix(fieldType, "Nullable("), ")")

	switch fieldType {
	case "String", "UUID", "IPv6", "IPv4":
		return newStringField(fieldName, isNullable)
	case "UInt8", "UInt16", "UInt32", "Int8", "Int16", "Int32", "Float32", "Float64":
		return newFloat64Field(fieldName, isNullable)
	case "UInt64":
		// This can be a time or uint64 value
		// Assume that t is the field name used for timestamp
		if fieldName == "t" && !isNullable {
			return data.NewField(fieldName, nil, []time.Time{})
		}

		// Use string for precision preservation, or float64 for Grafana alert compatibility
		// See: https://github.com/Altinity/clickhouse-grafana/issues/832
		if needsStringPrecision {
			return newStringField(fieldName, isNullable)
		}
		return newFloat64Field(fieldName, isNullable)
	case "Int64":
		// Use string for precision preservation, or float64 for Grafana alert compatibility
		// See: https://github.com/Altinity/clickhouse-grafana/issues/832
		if needsStringPrecision {
			return newStringField(fieldName, isNullable)
		}
		return newFloat64Field(fieldName, isNullable)
	default:
		if strings.HasPrefix(fieldType, "Decimal") {
			return newFloat64Field(fieldName, isNullable)
		} else if strings.HasPrefix(fieldType, "FixedString") || strings.HasPrefix(fieldType, "Enum") {
			return newStringField(fieldName, isNullable)
		} else if strings.HasPrefix(fieldType, dateTime64Prefix) || strings.HasPrefix(fieldType, dateTimePrefix) || strings.HasPrefix(fieldType, datePrefix) {
			return newTimeField(fieldName, isNullable)
		} else {
			return newStringField(fieldName, isNullable)
		}
	}
}

func newTimeField(fieldName string, isNullable bool) *data.Field {
	if isNullable {
		return data.NewField(fieldName, nil, []*time.Time{})
	} else {
		return data.NewField(fieldName, nil, []time.Time{})
	}
}

func newFloat64Field(fieldName string, isNullable bool) *data.Field {
	if isNullable {
		return data.NewField(fieldName, nil, []*float64{})
	} else {
		return data.NewField(fieldName, nil, []float64{})
	}
}

func newStringField(fieldName string, isNullable bool) *data.Field {
	if isNullable {
		return data.NewField(fieldName, nil, []*string{})
	} else {
		return data.NewField(fieldName, nil, []string{})
	}
}

func parseFloatValue(value interface{}, isNullable bool) Value {
	if value != nil {
		var fv float64
		switch v := value.(type) {
		case json.Number:
			var err error
			fv, err = v.Float64()
			if err != nil {
				if isNullable {
					return nil
				}
				return 0.0
			}
		default:
			fv = reflect.ValueOf(value).Float()
		}
		if isNullable {
			return &fv
		} else {
			return fv
		}
	}

	if isNullable {
		return nil
	} else {
		return 0.0
	}
}

func parseStringValue(value interface{}, isNullable bool) Value {
	if value != nil {
		str := reflect.ValueOf(value).String()
		if isNullable {
			return &str
		} else {
			return str
		}
	}

	if isNullable {
		return nil
	} else {
		return ""
	}
}

// parseMapValue parses a map value to JSON.
func parseMapValue(value interface{}, isNullable bool) Value {
	// Check if the value is a map
	switch m := value.(type) {
	case map[string]interface{}: // Check if it's a map with string keys and any type of value
		jsonValue, err := json.Marshal(m)
		if err != nil {
			return nil
		}
		// Return the JSON bytes
		return string(jsonValue)
	default:
		if isNullable {
			return nil
		} else {
			return ""
		}
	}
}

func parseUInt64Value(value interface{}, isNullable bool) Value {
	if value != nil {
		var ui64v uint64
		var err error

		// Handle json.Number type which preserves precision for large integers
		// See: https://github.com/Altinity/clickhouse-grafana/issues/832
		switch v := value.(type) {
		case json.Number:
			ui64v, err = strconv.ParseUint(string(v), 10, 64)
		default:
			ui64v, err = strconv.ParseUint(fmt.Sprintf("%v", value), 10, 64)
		}

		if err == nil {
			if isNullable {
				return &ui64v
			} else {
				return ui64v
			}
		}
	}
	if isNullable {
		return nil
	} else {
		return uint64(0)
	}
}

func parseInt64Value(value interface{}, isNullable bool) Value {
	if value != nil {
		var i64v int64
		var err error

		// Handle json.Number type which preserves precision for large integers
		// See: https://github.com/Altinity/clickhouse-grafana/issues/832
		switch v := value.(type) {
		case json.Number:
			i64v, err = strconv.ParseInt(string(v), 10, 64)
		default:
			i64v, err = strconv.ParseInt(fmt.Sprintf("%v", value), 10, 64)
		}

		if err == nil {
			if isNullable {
				return &i64v
			} else {
				return i64v
			}
		}
	}

	if isNullable {
		return nil
	} else {
		return int64(0)
	}
}

// parseUInt64AsStringValue returns UInt64 values as strings to preserve precision for values > 2^53-1
// See: https://github.com/Altinity/clickhouse-grafana/issues/832
func parseUInt64AsStringValue(value interface{}, isNullable bool) Value {
	if value == nil {
		if isNullable {
			return nil
		}
		return "0"
	}

	// Handle json.Number type which preserves precision for large integers
	switch v := value.(type) {
	case json.Number:
		return parseStringValue(string(v), isNullable)
	default:
		return parseStringValue(fmt.Sprintf("%v", value), isNullable)
	}
}

// parseInt64AsStringValue returns Int64 values as strings to preserve precision for values outside ±2^53-1
// See: https://github.com/Altinity/clickhouse-grafana/issues/832
func parseInt64AsStringValue(value interface{}, isNullable bool) Value {
	if value == nil {
		if isNullable {
			return nil
		}
		return "0"
	}

	// Handle json.Number type which preserves precision for large integers
	switch v := value.(type) {
	case json.Number:
		return parseStringValue(string(v), isNullable)
	default:
		return parseStringValue(fmt.Sprintf("%v", value), isNullable)
	}
}

// parseUInt64AsFloat64Value returns UInt64 values as float64 for Grafana alert compatibility.
// Note: precision may be lost for values > 2^53-1.
func parseUInt64AsFloat64Value(value interface{}, isNullable bool) Value {
	if value == nil {
		if isNullable {
			return nil
		}
		return 0.0
	}

	var strVal string
	switch v := value.(type) {
	case json.Number:
		strVal = string(v)
	default:
		strVal = fmt.Sprintf("%v", value)
	}

	ui64, err := strconv.ParseUint(strVal, 10, 64)
	if err != nil {
		if isNullable {
			return nil
		}
		return 0.0
	}

	fv := float64(ui64)
	if isNullable {
		return &fv
	}
	return fv
}

// parseInt64AsFloat64Value returns Int64 values as float64 for Grafana alert compatibility.
// Note: precision may be lost for values outside ±2^53-1.
func parseInt64AsFloat64Value(value interface{}, isNullable bool) Value {
	if value == nil {
		if isNullable {
			return nil
		}
		return 0.0
	}

	var strVal string
	switch v := value.(type) {
	case json.Number:
		strVal = string(v)
	default:
		strVal = fmt.Sprintf("%v", value)
	}

	i64, err := strconv.ParseInt(strVal, 10, 64)
	if err != nil {
		if isNullable {
			return nil
		}
		return 0.0
	}

	fv := float64(i64)
	if isNullable {
		return &fv
	}
	return fv
}

func parseTimestampValue(value interface{}, isNullable bool) Value {
	if value != nil {
		strValue := fmt.Sprintf("%v", value)
		i64v, err := strconv.ParseInt(strValue, 10, 64)

		if err == nil {
			// Convert millisecond timestamp to nanosecond timestamp for parsing
			timeValue := time.Unix(0, i64v*int64(time.Millisecond))
			if isNullable {
				return &timeValue
			} else {
				return timeValue
			}
		}
	}

	if isNullable {
		return nil
	} else {
		return time.Unix(0, 0)
	}
}

func parseDateTimeValue(value interface{}, layout string, timezone *time.Location, isNullable bool) Value {
	if value != nil {
		strValue := fmt.Sprintf("%v", value)
		t, err := time.ParseInLocation(layout, strValue, timezone)

		if err == nil {
			if isNullable {
				return &t
			} else {
				return t
			}
		}
	}
	if isNullable {
		return nil
	} else {
		return time.Unix(0, 0)
	}
}

// ParseValue parses a value with default behavior (string for UInt64/Int64 to preserve precision).
func ParseValue(fieldName string, fieldType string, tz *time.Location, value interface{}, isNullable bool) Value {
	return ParseValueOptimized(fieldName, fieldType, tz, value, isNullable, true)
}

// ParseValueOptimized parses a value with configurable precision handling for UInt64/Int64.
// When needsStringPrecision is true, UInt64/Int64 values are returned as strings.
// When needsStringPrecision is false, UInt64/Int64 values are returned as float64 (for alert compatibility).
func ParseValueOptimized(fieldName string, fieldType string, tz *time.Location, value interface{}, isNullable bool, needsStringPrecision bool) Value {
	if strings.HasPrefix(fieldType, "Nullable") {
		return ParseValueOptimized(fieldName, strings.TrimSuffix(strings.TrimPrefix(fieldType, "Nullable("), ")"), tz, value, true, needsStringPrecision)
	} else if strings.HasPrefix(fieldType, "LowCardinality") {
		return ParseValueOptimized(fieldName, strings.TrimSuffix(strings.TrimPrefix(fieldType, "LowCardinality("), ")"), tz, value, isNullable, needsStringPrecision)
	} else if strings.HasPrefix(fieldType, "Map(") && strings.HasSuffix(fieldType, ")") {
		return parseMapValue(value, isNullable)
	} else {
		switch fieldType {
		case "String", "UUID", "IPv4", "IPv6":
			return parseStringValue(value, isNullable)
		case "UInt8", "UInt16", "UInt32", "Int8", "Int16", "Int32", "Float32", "Float64":
			return parseFloatValue(value, isNullable)
		case "UInt64":
			// Plugin specific corner case
			// This can be a time or uint64 value Assume that t is the field name used for timestamp in milliseconds
			if fieldName == "t" {
				return parseTimestampValue(value, isNullable)
			}

			// Return as string to preserve precision, or float64 for alert compatibility
			// See: https://github.com/Altinity/clickhouse-grafana/issues/832
			if needsStringPrecision {
				return parseUInt64AsStringValue(value, isNullable)
			}
			return parseUInt64AsFloat64Value(value, isNullable)
		case "Int64":
			if fieldName == "t" {
				return parseTimestampValue(value, isNullable)
			}
			// Return as string to preserve precision, or float64 for alert compatibility
			// See: https://github.com/Altinity/clickhouse-grafana/issues/832
			if needsStringPrecision {
				return parseInt64AsStringValue(value, isNullable)
			}
			return parseInt64AsFloat64Value(value, isNullable)
		default:
			if strings.HasPrefix(fieldType, "Decimal") {
				return parseFloatValue(value, isNullable)
			} else if strings.HasPrefix(fieldType, "FixedString") || strings.HasPrefix(fieldType, "Enum") {
				return parseStringValue(value, isNullable)
			} else if strings.HasPrefix(fieldType, dateTime64Prefix) && strings.Contains(fieldType, "3") {
				return parseDateTimeValue(value, dateTime64Layout3, tz, isNullable)
			} else if strings.HasPrefix(fieldType, dateTime64Prefix) && strings.Contains(fieldType, "6") {
				return parseDateTimeValue(value, dateTime64Layout6, tz, isNullable)
			} else if strings.HasPrefix(fieldType, dateTimePrefix) {
				return parseDateTimeValue(value, dateTimeLayout, tz, isNullable)
			} else if strings.HasPrefix(fieldType, datePrefix) {
				return parseDateTimeValue(value, dateLayout, tz, isNullable)
			} else {
				backend.Logger.Warn(fmt.Sprintf(
					"Value [%v] has compound type [%v] and will be returned as string", value, fieldType,
				))

				byteValue, err := json.Marshal(value)
				if err != nil {
					backend.Logger.Warn(fmt.Sprintf(
						"Unable to append value of unknown type %v because of json encoding problem: %s",
						reflect.TypeOf(value), err,
					))
					return nil
				}

				return parseStringValue(string(byteValue), isNullable)
			}
		}
	}
}
