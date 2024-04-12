package data_test

import (
	"reflect"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

func TestField(t *testing.T) {
	t.Run("should create new field with expected values", func(t *testing.T) {
		f := data.NewField("value", nil, []float64{1.0, 2.0, 3.0})

		if f.Len() != 3 {
			t.Fatal("unexpected length")
		}

		require.Equal(t, 1.0, f.At(0))
		require.Equal(t, 2.0, f.At(1))
		require.Equal(t, 3.0, f.At(2))
	})

	t.Run("field values should not change if source slice is modified", func(t *testing.T) {
		values := []float64{1.0, 2.0, 3.0}
		f := data.NewField("value", nil, values)
		values[1] = 3.0
		require.Equal(t, 2.0, f.At(1))
	})
}

func TestField_NullableFloat64(t *testing.T) {
	t.Run("should create new nullable float64 field with expected values", func(t *testing.T) {
		val := 2.0
		f := data.NewField("value", nil, []*float64{nil, &val, nil})

		if f.Len() != 3 {
			t.Fatal("unexpected length")
		}

		require.Nil(t, f.At(0))
		require.Equal(t, &val, f.At(1).(*float64))
		require.Nil(t, f.At(2))
	})

	t.Run("field values should not change if source slice is modified", func(t *testing.T) {
		val := 2.0
		values := []*float64{nil, &val, nil}
		f := data.NewField("value", nil, values)
		newVal := 4.0
		values[1] = &newVal
		require.Equal(t, &val, f.At(1))
	})

	t.Run("should set a value", func(t *testing.T) {
		field := data.NewField("value", nil, make([]*float64, 3))

		want := 2.0
		field.Set(1, &want)

		if field.Len() != 3 {
			t.Fatal("unexpected length")
		}

		got := field.At(1).(*float64)

		if *got != want {
			t.Errorf("%+v", *got)
		}
	})
}

func TestFieldLen(t *testing.T) {
	var fp *data.Field
	var f data.Field
	require.Equal(t, 0, fp.Len())
	require.Equal(t, 0, f.Len())
}

func TestField_String(t *testing.T) {
	field := data.NewField("value", nil, make([]*string, 3))

	want := "foo"
	field.Set(1, &want)

	if field.Len() != 3 {
		t.Fatal("unexpected length")
	}

	got := field.At(1).(*string)

	if *got != want {
		t.Errorf("%+v", *got)
	}
}

func TestTimeField(t *testing.T) {
	tests := []struct {
		Values []*time.Time
	}{
		{
			Values: []*time.Time{timePtr(time.Unix(111, 0))},
		},
		{
			Values: []*time.Time{nil, timePtr(time.Unix(111, 0))},
		},
		{
			Values: []*time.Time{nil, timePtr(time.Unix(111, 0)), nil},
		},
		{
			Values: make([]*time.Time, 10),
		},
	}

	for i := range tests {
		tt := tests[i]
		t.Run("", func(t *testing.T) {
			f := data.NewField(t.Name(), nil, tt.Values)

			if f.Len() != len(tt.Values) {
				t.Error(f.Len())
			}

			for i := 0; i < f.Len(); i++ {
				got := reflect.ValueOf(f.At(i))
				want := reflect.ValueOf(tt.Values[i])

				if got != want {
					t.Error(got, want)
				}
			}
		})
	}
}
