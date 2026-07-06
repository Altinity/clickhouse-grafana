package main

import "testing"

// ParseValue's default branches call reflect.ValueOf(value).Float()/.String(),
// which panic when the underlying kind is not numeric/string (e.g. a bool
// arriving from an unexpected ClickHouse JSON payload).
func TestParseValueUnexpectedKindDoesNotPanic(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("ParseValue panicked: %v", r)
		}
	}()
	// Float64 column carrying a bool value
	_ = ParseValue("col", "Float64", nil, true, false)
	// String column carrying a map value
	_ = ParseValue("col", "String", nil, map[string]interface{}{"a": 1}, false)
}
