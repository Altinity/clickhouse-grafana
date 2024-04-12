package data

import (
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/require"
)

func TestSortWideFrameFields(t *testing.T) {
	aTime := time.Date(2020, 1, 1, 12, 30, 0, 0, time.UTC)
	tests := []struct {
		name          string
		sortLabelKeys []string
		frameToSort   *Frame
		afterSort     *Frame
	}{
		{
			name: "wide frame with names pass through",
			frameToSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", nil, []float64{1}),
				NewField("bValue", nil, []float64{5}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", nil, []float64{1}),
				NewField("bValue", nil, []float64{5}),
			),
		},
		{
			name: "wide frame with names only",
			frameToSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("bValue", nil, []float64{5}),
				NewField("aValue", nil, []float64{1}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", nil, []float64{1}),
				NewField("bValue", nil, []float64{5}),
			),
		},
		{
			name: "wide frame with empty names and labels",
			frameToSort: NewFrame("",
				NewField("", nil, []time.Time{aTime}),
				NewField("", Labels{"host": "b"}, []float64{5}),
				NewField("", Labels{"host": "a"}, []float64{1}),
			),
			afterSort: NewFrame("",
				NewField("", nil, []time.Time{aTime}),
				NewField("", Labels{"host": "a"}, []float64{1}),
				NewField("", Labels{"host": "b"}, []float64{5}),
			),
		},
		{
			name: "wide frame with names only and time not first",
			frameToSort: NewFrame("",
				NewField("bValue", nil, []float64{5}),
				NewField("aValue", nil, []float64{1}),
				NewField("time", nil, []time.Time{aTime}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", nil, []float64{1}),
				NewField("bValue", nil, []float64{5}),
			),
		},
		{
			name: "wide frame with names only, valued time column and time not first",
			frameToSort: NewFrame("",
				NewField("aValue", nil, []float64{1}),
				NewField("time", nil, []time.Time{aTime}),
				NewField("valueTime", nil, []time.Time{aTime.Add(time.Hour)}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", nil, []float64{1}),
				NewField("valueTime", nil, []time.Time{aTime.Add(time.Hour)}),
			),
		},
		{
			name: "wide frame with labels and one metric name",
			frameToSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"host": "b", "int": "eth0"}, []float64{5}),
				NewField("aValue", Labels{"host": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"host": "a", "int": "eth0"}, []float64{1}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"host": "a", "int": "eth0"}, []float64{1}),
				NewField("aValue", Labels{"host": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"host": "b", "int": "eth0"}, []float64{5}),
			),
		},
		{
			name:          "wide frame with labels and one metric name - specifying sort keys",
			sortLabelKeys: []string{"node", "int"},
			frameToSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"node": "b", "int": "eth0"}, []float64{5}),
				NewField("aValue", Labels{"node": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"node": "a", "int": "eth0"}, []float64{1}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"node": "a", "int": "eth0"}, []float64{1}),
				NewField("aValue", Labels{"node": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"node": "b", "int": "eth0"}, []float64{5}),
			),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := SortWideFrameFields(tt.frameToSort, tt.sortLabelKeys...)
			require.NoError(t, err)
			if diff := cmp.Diff(tt.frameToSort, tt.afterSort, FrameTestCompareOptions()...); diff != "" {
				t.Errorf("Result mismatch (-want +got):\n%s", diff)
				t.Logf(tt.frameToSort.StringTable(-1, -1))
			}
		})
	}
}

func TestSortWideFrameFields_MixedLabels(t *testing.T) {
	aTime := time.Date(2020, 1, 1, 12, 30, 0, 0, time.UTC)
	tests := []struct {
		name          string
		sortLabelKeys []string
		frameToSort   *Frame
		afterSort     *Frame
	}{
		{
			name:          "wide frame with and one metric name - specifying sort keys",
			sortLabelKeys: []string{"node", "int"},
			frameToSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"node": "b", "int": "eth0"}, []float64{5}),
				NewField("aValue", Labels{"node": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"node": "c"}, []float64{7}),
				NewField("aValue", Labels{"node": "a"}, []float64{1}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"node": "a"}, []float64{1}),
				NewField("aValue", Labels{"node": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"node": "b", "int": "eth0"}, []float64{5}),
				NewField("aValue", Labels{"node": "c"}, []float64{7}),
			),
		},
		{
			name:          "specifying sort keys when some labels are nil",
			sortLabelKeys: []string{"node", "int"},
			frameToSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"node": "b", "int": "eth0"}, []float64{5}),
				NewField("aValue", Labels{"node": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"node": "c"}, []float64{7}),
				NewField("aValue", nil, []float64{1}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", nil, []float64{1}),
				NewField("aValue", Labels{"node": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"node": "b", "int": "eth0"}, []float64{5}),
				NewField("aValue", Labels{"node": "c"}, []float64{7}),
			),
		},
		{
			name:          "wide frame with mixed labels and one metric name - specifying some sort keys",
			sortLabelKeys: []string{"node"},
			frameToSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"node": "b", "int": "eth0"}, []float64{5}),
				NewField("aValue", Labels{"node": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"node": "a"}, []float64{1}),
				NewField("aValue", Labels{"node": "c"}, []float64{7}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"node": "a", "int": "eth1"}, []float64{3}),
				NewField("aValue", Labels{"node": "a"}, []float64{1}),
				NewField("aValue", Labels{"node": "b", "int": "eth0"}, []float64{5}),
				NewField("aValue", Labels{"node": "c"}, []float64{7}),
			),
		},
		{
			name:          "wide frame with mixed labels and one metric name - specifying some sort keys (other from above)",
			sortLabelKeys: []string{"int"},
			frameToSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"int": "eth0", "node": "b"}, []float64{5}),
				NewField("aValue", Labels{"int": "eth1", "node": "a"}, []float64{3}),
				NewField("aValue", Labels{"node": "b"}, []float64{1}),
			),
			afterSort: NewFrame("",
				NewField("time", nil, []time.Time{aTime}),
				NewField("aValue", Labels{"node": "b"}, []float64{1}),
				NewField("aValue", Labels{"int": "eth0", "node": "b"}, []float64{5}),
				NewField("aValue", Labels{"int": "eth1", "node": "a"}, []float64{3}),
			),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := SortWideFrameFields(tt.frameToSort, tt.sortLabelKeys...)
			require.NoError(t, err)
			if diff := cmp.Diff(tt.frameToSort, tt.afterSort, FrameTestCompareOptions()...); diff != "" {
				t.Errorf("Result mismatch (-want +got):\n%s", diff)
				t.Logf(tt.frameToSort.StringTable(-1, -1))
			}
		})
	}
}
