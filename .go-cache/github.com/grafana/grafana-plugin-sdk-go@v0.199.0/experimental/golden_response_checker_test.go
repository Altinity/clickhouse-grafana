package experimental

import (
	"encoding/json"
	"flag"
	"path/filepath"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/stretchr/testify/require"
)

// some sample custom meta
type SomeCustomMeta struct {
	SomeValue string `json:"someValue,omitempty"`
}

var update = flag.Bool("update", true, "update.golden.data files")

func TestGoldenResponseChecker(t *testing.T) {
	dr := &backend.DataResponse{}

	dr.Frames = data.Frames{
		data.NewFrame("Frame One",
			data.NewField("Single float64", nil, []float64{
				8.26, 8.7, 14.82, 10.07, 8.52,
			}).SetConfig(&data.FieldConfig{Unit: "Percent"}),
		),
		data.NewFrame("Frame Two",
			data.NewField("single string", data.Labels{"a": "b"}, []string{
				"a", "b", "c",
			}).SetConfig(&data.FieldConfig{DisplayName: "123"}),
		),
	}
	dr.Status = backend.StatusOK

	t.Run("create data frames with no meta", func(t *testing.T) {
		goldenFile := "frame-no-meta.golden"
		checkGoldenFiles(t, goldenFile, dr)
	})

	t.Run("create data frames with some non-custom meta", func(t *testing.T) {
		dr.Frames[0].Meta = &data.FrameMeta{
			ExecutedQueryString: "SELECT * FROM X",
			Notices: []data.Notice{
				{Severity: data.NoticeSeverityInfo, Text: "hello"},
			},
		}

		goldenFile := "frame-non-custom-meta.golden"
		checkGoldenFiles(t, goldenFile, dr)
	})

	t.Run("create data frames with some empty custom meta", func(t *testing.T) {
		dr.Frames[0].Meta = &data.FrameMeta{
			Custom: SomeCustomMeta{},
		}

		goldenFile := "frame-empty-custom-meta.golden"
		checkGoldenFiles(t, goldenFile, dr)
	})

	t.Run("create data frames with some custom meta", func(t *testing.T) {
		dr.Frames[0].Meta = &data.FrameMeta{
			Custom: SomeCustomMeta{
				SomeValue: "value",
			},
		}

		goldenFile := "frame-custom-meta.golden"
		checkGoldenFiles(t, goldenFile, dr)
	})

	t.Run("should render string for JSON fields", func(t *testing.T) {
		m := map[string]int{"a": 1, "b": 2}
		b, err := json.Marshal(m)
		require.NoError(t, err)
		r := json.RawMessage(b)
		res := &backend.DataResponse{
			Frames: data.Frames{
				data.NewFrame("JSON frame",
					data.NewField("json.RawMessage", nil, []json.RawMessage{r}),
					data.NewField("*json.RawMessage", nil, []*json.RawMessage{&r}),
				),
			}}
		goldenFile := "frame-json"
		checkGoldenFiles(t, goldenFile, res)
	})
}

func TestGoldenJSONFrame(t *testing.T) {
	f := data.NewFrame("Frame One",
		data.NewField("Single float64", nil, []float64{
			8.26, 8.7, 14.82, 10.07, 8.52,
		}).SetConfig(&data.FieldConfig{Unit: "Percent"}),
	)
	CheckGoldenJSONFrame(t, "testdata", "single-json-frame.golden", f, *update)
}

func TestGoldenJSONFramer(t *testing.T) {
	CheckGoldenJSONFramer(t, "testdata", "single-json-framer.golden", &fakeFramer{}, *update)
}

func TestReadGoldenFile(t *testing.T) {
	t.Run("read a large golden file", func(t *testing.T) {
		goldenFile := filepath.Join("testdata", "large.golden.txt")
		dr, err := readGoldenFile(goldenFile)
		require.NotEmpty(t, dr)
		require.NoError(t, err)
	})
}

func checkGoldenFiles(t *testing.T, name string, dr *backend.DataResponse) {
	t.Helper()
	goldenFile := filepath.Join("testdata", name)
	err := CheckGoldenDataResponse(goldenFile+".txt", dr, *update)
	require.NoError(t, err)

	CheckGoldenJSONResponse(t, "testdata", name, dr, *update)
}

type fakeFramer struct{}

func (f *fakeFramer) Frames() (data.Frames, error) {
	return data.Frames{
		data.NewFrame("Frame One", data.NewField("A", nil, []float64{1, 2, 3})),
		data.NewFrame("Frame Two", data.NewField("B", nil, []float64{4})),
	}, nil
}
