package data_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// The slice data in the Field is a not exported, so methods on the Field are used to to manipulate its data.
type simpleFieldInfo struct {
	Name      string
	FieldType data.FieldType
}

func TestFieldTypeConversion(t *testing.T) {
	type scenario struct {
		ftype data.FieldType
		value string
	}

	info := []scenario{
		{ftype: data.FieldTypeBool, value: "bool"},
		{ftype: data.FieldTypeEnum, value: "enum"},
		{ftype: data.FieldTypeNullableEnum, value: "*enum"},
		{ftype: data.FieldTypeJSON, value: "json.RawMessage"},
	}
	for idx, check := range info {
		s := check.ftype.ItemTypeString()
		require.Equal(t, check.value, s, "index: %d", idx)
		c, ok := data.FieldTypeFromItemTypeString(s)
		require.True(t, ok, "must parse ok")
		require.Equal(t, check.ftype, c)
	}

	_, ok := data.FieldTypeFromItemTypeString("????")
	require.False(t, ok, "unknown type")

	c, ok := data.FieldTypeFromItemTypeString("float")
	require.True(t, ok, "must parse ok")
	require.Equal(t, data.FieldTypeFloat64, c)

	obj := &simpleFieldInfo{
		Name:      "hello",
		FieldType: data.FieldTypeFloat64,
	}
	body, err := json.Marshal(obj)
	require.NoError(t, err)

	objCopy := &simpleFieldInfo{}
	err = json.Unmarshal(body, objCopy)
	require.NoError(t, err)

	require.Equal(t, obj.FieldType, objCopy.FieldType)
}

func TestFieldTypeFor(t *testing.T) {
	tests := []struct {
		item interface{}
		want data.FieldType
	}{
		// non null values
		{item: int8(123), want: data.FieldTypeInt8},
		{item: int16(123), want: data.FieldTypeInt16},
		{item: int32(123), want: data.FieldTypeInt32},
		{item: int64(123), want: data.FieldTypeInt64},
		{item: uint8(123), want: data.FieldTypeUint8},
		{item: uint16(123), want: data.FieldTypeUint16},
		{item: uint32(123), want: data.FieldTypeUint32},
		{item: uint64(123), want: data.FieldTypeUint64},
		{item: float32(123), want: data.FieldTypeFloat32},
		{item: float64(123), want: data.FieldTypeFloat64},
		{item: true, want: data.FieldTypeBool},
		{item: "foo", want: data.FieldTypeString},
		{item: time.Unix(1, 1), want: data.FieldTypeTime},
		{item: json.RawMessage(`{ "foo" : "bar" }`), want: data.FieldTypeJSON},
		{item: data.EnumItemIndex(123), want: data.FieldTypeEnum},
		// nullable values
		{item: pointer(int8(123)), want: data.FieldTypeNullableInt8},
		{item: pointer(int16(123)), want: data.FieldTypeNullableInt16},
		{item: pointer(int32(123)), want: data.FieldTypeNullableInt32},
		{item: pointer(int64(123)), want: data.FieldTypeNullableInt64},
		{item: pointer(uint8(123)), want: data.FieldTypeNullableUint8},
		{item: pointer(uint16(123)), want: data.FieldTypeNullableUint16},
		{item: pointer(uint32(123)), want: data.FieldTypeNullableUint32},
		{item: pointer(uint64(123)), want: data.FieldTypeNullableUint64},
		{item: pointer(float32(123)), want: data.FieldTypeNullableFloat32},
		{item: pointer(float64(123)), want: data.FieldTypeNullableFloat64},
		{item: pointer(true), want: data.FieldTypeNullableBool},
		{item: pointer("foo"), want: data.FieldTypeNullableString},
		{item: pointer(time.Unix(1, 1)), want: data.FieldTypeNullableTime},
		{item: pointer(json.RawMessage(`{ "foo" : "bar" }`)), want: data.FieldTypeNullableJSON},
		{item: pointer(data.EnumItemIndex(123)), want: data.FieldTypeNullableEnum},
		// untyped values
		{item: nil, want: data.FieldTypeUnknown},
		{item: 123, want: data.FieldTypeUnknown},
		{item: pointer(123), want: data.FieldTypeUnknown},
		{item: 123.456, want: data.FieldTypeFloat64},
		{item: pointer(123.456), want: data.FieldTypeNullableFloat64},
	}
	for _, tt := range tests {
		t.Run(tt.want.ItemTypeString(), func(t *testing.T) {
			require.Equal(t, tt.want, data.FieldTypeFor(tt.item))
		})
	}
}

func pointer[T any](input T) *T {
	return &input
}
