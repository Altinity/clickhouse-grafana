package experimental

import (
	"sort"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFrameSorter(t *testing.T) {
	field := data.NewField("Single float64", nil, []float64{
		8.6, 8.7, 14.82, 10.07, 8.52,
	}).SetConfig(&data.FieldConfig{Unit: "Percent"})

	frame := data.NewFrame("Frame One",
		field,
	)

	sorter := NewFrameSorter(frame, field)

	sort.Sort(sorter)

	val, err := frame.Fields[0].FloatAt(0)
	require.NoError(t, err)

	want := float64(8.52)
	assert.Equal(t, want, val)
}

func TestFrameSorterLastNil(t *testing.T) {
	foo := "foo"
	field := data.NewField("Foo", nil, []*string{
		&foo, nil,
	})

	frame := data.NewFrame("Frame One",
		field,
	)

	sorter := NewFrameSorter(frame, field)

	sort.Sort(sorter)

	val, ok := frame.Fields[0].ConcreteAt(0)

	assert.True(t, ok)
	assert.Equal(t, foo, val)
}

func TestFrameSorterFirstNil(t *testing.T) {
	value := "test"
	field := data.NewField("Foo", nil, []*string{
		nil, &value,
	})

	frame := data.NewFrame("Frame One",
		field,
	)

	sorter := NewFrameSorter(frame, field)

	sort.Sort(sorter)

	val, ok := frame.Fields[0].ConcreteAt(0)

	assert.True(t, ok)
	assert.Equal(t, value, val)
}
