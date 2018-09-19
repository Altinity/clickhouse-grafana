package main

import (
	"io/ioutil"
	"testing"

	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/pkg/errors"
)

func TestParseResponse(t *testing.T) {
	testCases := []struct {
		name   string
		file   string
		err    error
		result *datasource.QueryResult
	}{
		{
			"corrupted response",
			"testdata/bad.corrupted.json",
			errors.New("unexpected end of JSON input"),
			nil,
		},
		{
			"bad type",
			"testdata/bad.type.json",
			errors.New("strconv.ParseInt: parsing \"foobar\": invalid syntax"),
			nil,
		},
		{
			"bad one column",
			"testdata/bad.one.column.json",
			errors.New("response can't contain less than 2 columns"),
			nil,
		},
		{
			"bad time column",
			"testdata/bad.time.column.json",
			errors.New("timeColumn must be UInt64; got \"Int64\" instead"),
			nil,
		},
		{
			"bad time column2",
			"testdata/bad.time.column2.json",
			errors.New("unable to find timeCol \"t\" in response.data"),
			nil,
		},
		{
			"empty result",
			"testdata/good.empty.json",
			nil,
			&datasource.QueryResult{},
		},
		{
			"simple result",
			"testdata/good.simple.json",
			nil,
			&datasource.QueryResult{
				Series: []*datasource.TimeSeries{
					{
						Name:   "count()",
						Points: newPoints(10, 12, 14, 16, 18),
					},
				},
			},
		},
		{
			"multiple result",
			"testdata/good.multiple.json",
			nil,
			&datasource.QueryResult{
				Series: []*datasource.TimeSeries{
					{
						Name:   "a",
						Points: newPoints(10, 12, 14, 16, 18),
					},
					{
						Name:   "b",
						Points: newPoints(10, 12, 14, 16, 18),
					},
				},
			},
		},
		{
			"groupArr result",
			"testdata/good.group.json",
			nil,
			&datasource.QueryResult{
				Series: []*datasource.TimeSeries{
					{
						Name:   "VIEWS",
						Points: newPoints(0, 8, 10, 0, 2),
					},
					{
						Name:   "CLICKS",
						Points: newPoints(0, 8.22, 6, 2, 0),
					},
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			response, err := ioutil.ReadFile(tc.file)
			if err != nil {
				t.Fatalf("%s", err)
			}
			result, err := parseResponse(response)
			if tc.err != nil {
				if err == nil {
					t.Fatalf("error expected; got nil")
				}
				expErr := tc.err.Error()
				if expErr != err.Error() {
					t.Fatalf("expected error %q; got %q", expErr, err)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}

			for _, exp := range tc.result.Series {
				var got *datasource.TimeSeries
				for _, serie := range result.Series {
					if serie.Name == exp.Name {
						got = serie
					}
				}
				if got == nil {
					t.Fatalf("expected to have serie %q; got nil instead", exp.Name)
				}
				for i := 0; i < len(exp.Points); i++ {
					if exp.Points[i].Timestamp != got.Points[i].Timestamp ||
						exp.Points[i].Value != got.Points[i].Value {
						t.Fatalf("points missvalue; \nexpected %v; \ngot %v", exp.Points, got.GetPoints())
					}
				}
			}

		})
	}
}

const (
	pointTimestamp     = 1519405140000
	pointTimestampStep = 1000
)

func newPoints(values ...float64) []*datasource.Point {
	points := make([]*datasource.Point, len(values))
	for i, v := range values {
		points[i] = &datasource.Point{
			Timestamp: int64(pointTimestamp + pointTimestampStep*i),
			Value:     v,
		}
	}
	return points
}
