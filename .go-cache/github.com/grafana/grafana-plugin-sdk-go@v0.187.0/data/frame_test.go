package data_test

import (
	"encoding/json"
	"fmt"
	"math"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

func TestFrame(t *testing.T) {
	df := data.NewFrame("http_requests_total",
		data.NewField("timestamp", nil, []time.Time{time.Now(), time.Now(), time.Now()}).SetConfig(&data.FieldConfig{
			DisplayName: "A time Column.",
		}),
		data.NewField("value", data.Labels{"service": "auth"}, []float64{1.0, 2.0, 3.0}),
		data.NewField("category", data.Labels{"service": "auth"}, []string{"foo", "bar", "test"}),
		data.NewField("valid", data.Labels{"service": "auth"}, []bool{true, false, true}),
	)

	if df.Rows() != 3 {
		t.Fatal("unexpected length")
	}
}

func assertPanic(t *testing.T, f func()) {
	t.Helper()

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("The code did not panic")
		}
	}()
	f()
}

func TestDeleteRow(t *testing.T) {
	tests := []struct {
		name      string
		idx       int
		input     *data.Frame
		output    *data.Frame
		wantPanic bool
	}{
		{
			name: "idx is less than the row length",
			input: data.NewFrame("http_requests_total",
				data.NewField("timestamp", nil, []time.Time{
					time.Date(2020, 1, 2, 3, 4, 18, 0, time.UTC),
					time.Date(2020, 1, 2, 3, 4, 19, 0, time.UTC),
					time.Date(2020, 1, 2, 3, 4, 20, 0, time.UTC),
				}),
				data.NewField("value", data.Labels{"service": "auth"}, []float64{
					1.0,
					2.0,
					3.0,
				}),
				data.NewField("category", data.Labels{"service": "auth"}, []string{
					"foo",
					"bar",
					"test",
				}),
				data.NewField("valid", data.Labels{"service": "auth"}, []bool{true, false, true}),
			),
			idx: 1,
			output: data.NewFrame("http_requests_total",
				data.NewField("timestamp", nil, []time.Time{
					time.Date(2020, 1, 2, 3, 4, 18, 0, time.UTC),
					time.Date(2020, 1, 2, 3, 4, 20, 0, time.UTC),
				}),
				data.NewField("value", data.Labels{"service": "auth"}, []float64{
					1.0,
					3.0,
				}),
				data.NewField("category", data.Labels{"service": "auth"}, []string{
					"foo",
					"test",
				}),
				data.NewField("valid", data.Labels{"service": "auth"}, []bool{true, true}),
			),
		},
		{
			name: "idx equals the row length",
			input: data.NewFrame("http_requests_total",
				data.NewField("timestamp", nil, []time.Time{
					time.Date(2020, 1, 2, 3, 4, 18, 0, time.UTC),
					time.Date(2020, 1, 2, 3, 4, 19, 0, time.UTC),
					time.Date(2020, 1, 2, 3, 4, 20, 0, time.UTC),
				}),
				data.NewField("value", data.Labels{"service": "auth"}, []float64{
					1.0,
					2.0,
					3.0,
				}),
				data.NewField("category", data.Labels{"service": "auth"}, []string{
					"foo",
					"bar",
					"test",
				}),
				data.NewField("valid", data.Labels{"service": "auth"}, []bool{
					true,
					false,
					true,
				}),
			),
			idx:       3,
			wantPanic: true,
		},
		{
			name: "idx is negative",
			input: data.NewFrame("http_requests_total",
				data.NewField("timestamp", nil, []time.Time{
					time.Date(2020, 1, 2, 3, 4, 18, 0, time.UTC),
					time.Date(2020, 1, 2, 3, 4, 19, 0, time.UTC),
					time.Date(2020, 1, 2, 3, 4, 20, 0, time.UTC),
				}),
				data.NewField("value", data.Labels{"service": "auth"}, []float64{
					1.0,
					2.0,
					3.0,
				}),
				data.NewField("category", data.Labels{"service": "auth"}, []string{
					"foo",
					"bar",
					"test",
				}),
				data.NewField("valid", data.Labels{"service": "auth"}, []bool{
					true,
					false,
					true,
				}),
			),
			idx:       -1,
			wantPanic: true,
		},
	}
	for i := range tests {
		tt := tests[i]
		t.Run(tt.name, func(t *testing.T) {
			if tt.wantPanic {
				assertPanic(t, func() { tt.input.DeleteRow(tt.idx) })
			} else {
				tt.input.DeleteRow(tt.idx)
				if diff := cmp.Diff(tt.output, tt.input, data.FrameTestCompareOptions()...); diff != "" {
					t.Errorf("Result mismatch (-want +got):\n%s", diff)
				}
			}
		})
	}
}

func ExampleNewFrame() {
	aTime := time.Date(2020, 1, 2, 3, 4, 5, 0, time.UTC)
	var anInt64 int64 = 12
	frame := data.NewFrame("Frame Name",
		data.NewField("Time", nil, []time.Time{aTime, aTime.Add(time.Minute)}),
		data.NewField("Temp", data.Labels{"place": "Ecuador"}, []float64{1, math.NaN()}),
		data.NewField("Count", data.Labels{"place": "Ecuador"}, []*int64{&anInt64, nil}),
	)
	st, _ := frame.StringTable(-1, -1)
	fmt.Println(st)
	// Output:
	// Name: Frame Name
	// Dimensions: 3 Fields by 2 Rows
	// +-------------------------------+-----------------------+-----------------------+
	// | Name: Time                    | Name: Temp            | Name: Count           |
	// | Labels:                       | Labels: place=Ecuador | Labels: place=Ecuador |
	// | Type: []time.Time             | Type: []float64       | Type: []*int64        |
	// +-------------------------------+-----------------------+-----------------------+
	// | 2020-01-02 03:04:05 +0000 UTC | 1                     | 12                    |
	// | 2020-01-02 03:05:05 +0000 UTC | NaN                   | null                  |
	// +-------------------------------+-----------------------+-----------------------+
}

type mockPoint struct {
	Time  time.Time
	Value float64
}

type mockSeries struct {
	Name   string
	Labels map[string]string
	Points []mockPoint
}

type mockResponse struct {
	Series []mockSeries
}

func ExampleFrame_timeSeriesMulti() {
	// A common tsdb response pattern is to return a collection
	// of time series where each time series is uniquely identified
	// by a Name and a set of key value pairs (Labels (a.k.a Tags)).

	// In the case where the responses does not share identical time values and length (a single time index),
	// then the proper representation is Frames ([]*Frame). Where each Frame has a Time type field and one or more
	// Number fields.

	// Each Frame should have its value sorted by time in ascending order.

	// See https://grafana.github.io/dataplane/contract/timeseries for more information.

	res := mockResponse{
		[]mockSeries{
			{
				Name:   "cpu",
				Labels: map[string]string{"host": "a"},
				Points: []mockPoint{
					{
						time.Date(2020, 1, 2, 3, 4, 0, 0, time.UTC), 3,
					},
					{
						time.Date(2020, 1, 2, 3, 5, 0, 0, time.UTC), 6,
					},
				},
			},
			{
				Name:   "cpu",
				Labels: map[string]string{"host": "b"},
				Points: []mockPoint{
					{
						time.Date(2020, 1, 2, 3, 4, 1, 0, time.UTC), 4,
					},
					{
						time.Date(2020, 1, 2, 3, 5, 1, 0, time.UTC), 7,
					},
				},
			},
		},
	}

	frames := make([]*data.Frame, len(res.Series))
	for i, series := range res.Series {
		frames[i] = data.NewFrame("multiExample",
			data.NewField("time", nil, make([]time.Time, len(series.Points))),
			data.NewField(series.Name, series.Labels, make([]float64, len(series.Points))),
		).SetMeta(&data.FrameMeta{
			Type:        data.FrameTypeTimeSeriesMulti,
			TypeVersion: data.FrameTypeVersion{0, 1},
		})

		for pIdx, point := range series.Points {
			frames[i].Set(0, pIdx, point.Time)
			frames[i].Set(1, pIdx, point.Value)
		}
	}

	for _, frame := range frames {
		st, _ := frame.StringTable(-1, -1)
		fmt.Println(st)
	}
	// Output:
	// Name: multiExample
	// Dimensions: 2 Fields by 2 Rows
	// +-------------------------------+-----------------+
	// | Name: time                    | Name: cpu       |
	// | Labels:                       | Labels: host=a  |
	// | Type: []time.Time             | Type: []float64 |
	// +-------------------------------+-----------------+
	// | 2020-01-02 03:04:00 +0000 UTC | 3               |
	// | 2020-01-02 03:05:00 +0000 UTC | 6               |
	// +-------------------------------+-----------------+
	//
	// Name: multiExample
	// Dimensions: 2 Fields by 2 Rows
	// +-------------------------------+-----------------+
	// | Name: time                    | Name: cpu       |
	// | Labels:                       | Labels: host=b  |
	// | Type: []time.Time             | Type: []float64 |
	// +-------------------------------+-----------------+
	// | 2020-01-02 03:04:01 +0000 UTC | 4               |
	// | 2020-01-02 03:05:01 +0000 UTC | 7               |
	// +-------------------------------+-----------------+
}

func ExampleFrame_timeSeriesWide() {
	// In the case where you do know all the response will share the same time index, then
	// a "wide" dataframe can be created that holds all the responses. So your response is
	// all in a Single Frame.

	// See https://grafana.github.io/dataplane/contract/timeseries for more information.

	singleTimeIndexRes := mockResponse{
		[]mockSeries{
			{
				Name:   "cpu",
				Labels: map[string]string{"host": "a"},
				Points: []mockPoint{
					{
						time.Date(2020, 1, 2, 3, 4, 0, 0, time.UTC), 3,
					},
					{
						time.Date(2020, 1, 2, 3, 5, 0, 0, time.UTC), 6,
					},
				},
			},
			{
				Name:   "cpu",
				Labels: map[string]string{"host": "b"},
				Points: []mockPoint{
					{
						time.Date(2020, 1, 2, 3, 4, 0, 0, time.UTC), 4,
					},
					{
						time.Date(2020, 1, 2, 3, 5, 0, 0, time.UTC), 7,
					},
				},
			},
		},
	}

	frame := &data.Frame{Name: "wideExample"}
	frame = frame.SetMeta(&data.FrameMeta{
		Type:        data.FrameTypeTimeSeriesWide,
		TypeVersion: data.FrameTypeVersion{0, 1},
	})

	for i, series := range singleTimeIndexRes.Series {
		if i == 0 {
			frame.Fields = append(frame.Fields,
				data.NewField("time", nil, make([]time.Time, len(series.Points))),
			)
		}
		frame.Fields = append(frame.Fields,
			data.NewField(series.Name, series.Labels, make([]float64, len(series.Points))),
		)
		for pIdx, point := range series.Points {
			if i == 0 {
				frame.Set(i, pIdx, point.Time)
			}
			frame.Set(i+1, pIdx, point.Value)
		}
	}

	st, _ := frame.StringTable(-1, -1)
	fmt.Println(st)
	// Output:
	// Name: wideExample
	// Dimensions: 3 Fields by 2 Rows
	// +-------------------------------+-----------------+-----------------+
	// | Name: time                    | Name: cpu       | Name: cpu       |
	// | Labels:                       | Labels: host=a  | Labels: host=b  |
	// | Type: []time.Time             | Type: []float64 | Type: []float64 |
	// +-------------------------------+-----------------+-----------------+
	// | 2020-01-02 03:04:00 +0000 UTC | 3               | 4               |
	// | 2020-01-02 03:05:00 +0000 UTC | 6               | 7               |
	// +-------------------------------+-----------------+-----------------+
}

func ExampleFrame_timeSeriesLong() {
	// a common SQL or CSV like pattern is to have repeated times, multiple numbered value
	// columns, and string columns to identify a factors. This is a "Long" time series.

	// Presently the backend supports converting Long formatted series to "Wide" format
	// which the frontend understands. Goal is frontend support eventually
	// (https://github.com/grafana/grafana/issues/22219).

	// See https://grafana.github.io/dataplane/contract/timeseries for more information.

	type aTable struct {
		Headers []string
		Rows    [][]interface{}
	}

	iSlice := func(is ...interface{}) []interface{} {
		s := make([]interface{}, len(is))
		copy(s, is)
		return s
	}

	myLongTable := aTable{
		Headers: []string{"time", "aMetric", "bMetric", "SomeFactor"},
	}
	myLongTable.Rows = append(myLongTable.Rows,
		iSlice(time.Date(2020, 1, 2, 3, 4, 0, 0, time.UTC), 2.0, 10.0, "foo"),
		iSlice(time.Date(2020, 1, 2, 3, 4, 0, 0, time.UTC), 5.0, 15.0, "bar"),

		iSlice(time.Date(2020, 1, 2, 3, 5, 0, 0, time.UTC), 3.0, 11.0, "foo"),
		iSlice(time.Date(2020, 1, 2, 3, 5, 0, 0, time.UTC), 6.0, 16.0, "bar"),
	)

	frame := data.NewFrameOfFieldTypes("Long", 0,
		data.FieldTypeTime,
		data.FieldTypeFloat64, data.FieldTypeFloat64,
		data.FieldTypeString,
	).SetMeta(&data.FrameMeta{
		Type:        data.FrameTypeTimeSeriesLong,
		TypeVersion: data.FrameTypeVersion{0, 1},
	})
	_ = frame.SetFieldNames(myLongTable.Headers...)
	for _, row := range myLongTable.Rows {
		frame.AppendRow(row...)
	}
	st, _ := frame.StringTable(-1, -1)
	fmt.Println(st)
	// Output:
	// Name: Long
	// Dimensions: 4 Fields by 4 Rows
	// +-------------------------------+-----------------+-----------------+------------------+
	// | Name: time                    | Name: aMetric   | Name: bMetric   | Name: SomeFactor |
	// | Labels:                       | Labels:         | Labels:         | Labels:          |
	// | Type: []time.Time             | Type: []float64 | Type: []float64 | Type: []string   |
	// +-------------------------------+-----------------+-----------------+------------------+
	// | 2020-01-02 03:04:00 +0000 UTC | 2               | 10              | foo              |
	// | 2020-01-02 03:04:00 +0000 UTC | 5               | 15              | bar              |
	// | 2020-01-02 03:05:00 +0000 UTC | 3               | 11              | foo              |
	// | 2020-01-02 03:05:00 +0000 UTC | 6               | 16              | bar              |
	// +-------------------------------+-----------------+-----------------+------------------+
}

func TestStringTable(t *testing.T) {
	frame := data.NewFrame("sTest",
		data.NewField("", nil, make([]bool, 3)),
		data.NewField("", nil, make([]bool, 3)),
		data.NewField("", nil, make([]bool, 3)),
	)
	tests := []struct {
		name      string
		maxWidth  int
		maxLength int
		output    string
	}{
		{
			name:      "at max width and length",
			maxWidth:  3,
			maxLength: 3,
			output: `Name: sTest
Dimensions: 3 Fields by 3 Rows
+--------------+--------------+--------------+
| Name:        | Name:        | Name:        |
| Labels:      | Labels:      | Labels:      |
| Type: []bool | Type: []bool | Type: []bool |
+--------------+--------------+--------------+
| false        | false        | false        |
| false        | false        | false        |
| false        | false        | false        |
+--------------+--------------+--------------+
`,
		},
		{
			name:      "above max width and length",
			maxWidth:  2,
			maxLength: 2,
			output: `Name: sTest
Dimensions: 3 Fields by 3 Rows
+--------------+----------------+
| Name:        | ...+2 field... |
| Labels:      |                |
| Type: []bool |                |
+--------------+----------------+
| false        | ...            |
| ...          | ...            |
+--------------+----------------+
`,
		},
		{
			name:      "no length",
			maxWidth:  10,
			maxLength: 0,
			output: `Name: sTest
Dimensions: 3 Fields by 3 Rows
+--------------+--------------+--------------+
| Name:        | Name:        | Name:        |
| Labels:      | Labels:      | Labels:      |
| Type: []bool | Type: []bool | Type: []bool |
+--------------+--------------+--------------+
+--------------+--------------+--------------+
`,
		},
	}
	for i := range tests {
		tt := tests[i]
		t.Run(tt.name, func(t *testing.T) {
			s, err := frame.StringTable(tt.maxWidth, tt.maxLength)
			require.NoError(t, err)
			require.Equal(t, tt.output, s)
		})
	}
}

func TestDataFrameFilterRowsByField(t *testing.T) {
	tests := []struct {
		name          string
		frame         *data.Frame
		filteredFrame *data.Frame
		fieldIdx      int
		filterFunc    func(i interface{}) (bool, error)
		shouldErr     require.ErrorAssertionFunc
	}{
		{
			name: "time filter test",
			frame: data.NewFrame("time_filter_test", data.NewField("time", nil, []time.Time{
				time.Date(2020, 1, 2, 3, 4, 0, 0, time.UTC),
				time.Date(2020, 1, 2, 3, 4, 15, 0, time.UTC),
				time.Date(2020, 1, 2, 3, 4, 30, 0, time.UTC),
				time.Date(2020, 1, 2, 3, 4, 45, 0, time.UTC),
			}),
				data.NewField("floats", nil, []float64{
					1.0, 2.0, 3.0, 4.0,
				})),
			filteredFrame: data.NewFrame("time_filter_test", data.NewField("time", nil, []time.Time{
				time.Date(2020, 1, 2, 3, 4, 15, 0, time.UTC),
				time.Date(2020, 1, 2, 3, 4, 30, 0, time.UTC),
			}),
				data.NewField("floats", nil, []float64{
					2.0, 3.0,
				})),
			fieldIdx: 0,
			filterFunc: func(i interface{}) (bool, error) {
				val, ok := i.(time.Time)
				if !ok {
					return false, fmt.Errorf("wrong type dumbface. Oh ya, stupid error even-dumber-face")
				}
				if val.After(time.Date(2020, 1, 2, 3, 4, 0, 0, time.UTC)) && val.Before(time.Date(2020, 1, 2, 3, 4, 45, 0, time.UTC)) {
					return true, nil
				}
				return false, nil
			},
			shouldErr: require.NoError,
		},
	}
	for i := range tests {
		tt := tests[i]
		t.Run(tt.name, func(t *testing.T) {
			filteredFrame, err := tt.frame.FilterRowsByField(tt.fieldIdx, tt.filterFunc)
			tt.shouldErr(t, err)
			if diff := cmp.Diff(tt.filteredFrame, filteredFrame, data.FrameTestCompareOptions()...); diff != "" {
				t.Errorf("Result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func TestJSON(t *testing.T) {
	frames := data.Frames{
		data.NewFrame("http_requests_total",
			data.NewField("timestamp", nil, []time.Time{time.Now(), time.Now(), time.Now()}).SetConfig(&data.FieldConfig{
				DisplayName: "A time Column.",
			}),
			data.NewField("valid", data.Labels{"service": "auth"}, []bool{true, false, true}),
		),
		data.NewFrame("other",
			data.NewField("value", data.Labels{"service": "auth"}, []float64{1.0, 2.0, 3.0}),
			data.NewField("category", data.Labels{"service": "auth"}, []string{"foo", "bar", "test"}),
		),
	}

	t.Run("json.Unmarshal and json.Marshal", func(t *testing.T) {
		t.Run("Should run without error", func(t *testing.T) {
			b, err := json.Marshal(frames)
			if err != nil {
				t.Fatal(err)
			}
			f := data.Frames{}
			if err := json.Unmarshal(b, &f); err != nil {
				t.Fatal(err)
			}
		})
		t.Run("Should create equal data", func(t *testing.T) {
			b, err := json.Marshal(frames)
			if err != nil {
				t.Fatal(err)
			}

			f := data.Frames{}

			if err := json.Unmarshal(b, &f); err != nil {
				t.Fatal(err)
			}

			for i, v := range f {
				if diff := cmp.Diff(frames[i], v, data.FrameTestCompareOptions()...); diff != "" {
					t.Fatal(diff)
				}
			}
		})
	})
}

func timePtr(t time.Time) *time.Time {
	return &t
}

func float32Ptr(f float32) *float32 {
	return &f
}

func float64Ptr(f float64) *float64 {
	return &f
}

func int8Ptr(i int8) *int8 {
	return &i
}

func int16Ptr(i int16) *int16 {
	return &i
}

func int32Ptr(i int32) *int32 {
	return &i
}

func int64Ptr(i int64) *int64 {
	return &i
}

func uint8Ptr(ui uint8) *uint8 {
	return &ui
}

func uint16Ptr(ui uint16) *uint16 {
	return &ui
}

func uint32Ptr(ui uint32) *uint32 {
	return &ui
}

func uint64Ptr(ui uint64) *uint64 {
	return &ui
}

func stringPtr(s string) *string {
	return &s
}

func boolPtr(b bool) *bool {
	return &b
}

func jsonRawMessagePtr(j json.RawMessage) *json.RawMessage {
	return &j
}

func TestFrameFieldIndexByName(t *testing.T) {
	frame := data.NewFrame("Frame Name",
		data.NewField("Time", nil, []time.Time{}),
		data.NewField("Temp", nil, []float64{}),
		data.NewField("Count", nil, []*int64{}),
	)
	f, i := frame.FieldByName("Time")
	require.NotNil(t, f)
	require.Equal(t, 0, i)
	f, i = frame.FieldByName("time")
	require.Nil(t, f)
	require.Equal(t, -1, i)
	f, i = frame.FieldByName("no-such-field")
	require.Nil(t, f)
	require.Equal(t, -1, i)
}
