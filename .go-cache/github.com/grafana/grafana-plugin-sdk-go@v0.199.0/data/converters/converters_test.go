package converters_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/data/converters"
)

func TestStringConversions(t *testing.T) {
	val, err := converters.AnyToNullableString.Converter(12.3)
	require.NoError(t, err)
	require.Equal(t, "12.3", *(val.(*string)))

	ptr := &val
	val, err = converters.AnyToNullableString.Converter(ptr)
	require.NoError(t, err)
	require.Equal(t, fmt.Sprintf("%p", ptr), *(val.(*string))) // pointer printed as a pointer?

	val, err = converters.AnyToNullableString.Converter(nil)
	require.NoError(t, err)
	require.Nil(t, val)
}

func TestNumericConversions(t *testing.T) {
	val, err := converters.Float64ToNullableFloat64.Converter(12.34)
	require.NoError(t, err)
	require.Equal(t, 12.34, *(val.(*float64)))
}

func TestJSONConversions(t *testing.T) {
	val, err := converters.JSONValueToFloat64.Converter(12.34)
	require.NoError(t, err)
	require.Equal(t, 12.34, val)

	val, err = converters.JSONValueToFloat64.Converter(12)
	require.NoError(t, err)
	require.Equal(t, float64(12), val)

	val, err = converters.JSONValueToFloat64.Converter(int64(12))
	require.NoError(t, err)
	require.Equal(t, float64(12), val)

	val, err = converters.JSONValueToFloat64.Converter("12.34")
	require.NoError(t, err)
	require.Equal(t, 12.34, val)
}
