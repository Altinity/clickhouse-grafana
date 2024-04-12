package data_test

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"text/template"
	"time"

	jsoniter "github.com/json-iterator/go"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// TestGoldenFrameJSON makes sure that the JSON produced from arrow and dataframes match
func TestGoldenFrameJSON(t *testing.T) {
	f := goldenDF()
	a, err := f.MarshalArrow()
	require.NoError(t, err)

	b, err := data.FrameToJSON(f, data.IncludeAll) // json.Marshal(f2)
	require.NoError(t, err)
	strF := string(b)

	b, err = data.ArrowBufferToJSON(a, data.IncludeAll)
	require.NoError(t, err)
	strA := string(b)

	fmt.Println(`{ "arrow": `)
	fmt.Println(strA)
	fmt.Println(`, "slice": `)
	fmt.Println(strF)
	fmt.Println(`}`)

	require.JSONEq(t, strF, strA, "arrow and frames should produce the same json")

	goldenFile := filepath.Join("testdata", "all_types.golden.json")
	if _, err := os.Stat(goldenFile); os.IsNotExist(err) {
		_ = os.WriteFile(goldenFile, b, 0600)
		assert.FailNow(t, "wrote golden file")
	}

	b, err = os.ReadFile(goldenFile)
	require.NoError(t, err)

	strG := string(b)
	require.JSONEq(t, strF, strG, "saved json must match produced json")

	// Read the frame from json
	out := &data.Frame{}
	err = json.Unmarshal(b, out)
	require.NoError(t, err)

	if diff := cmp.Diff(f, out, data.FrameTestCompareOptions()...); diff != "" {
		t.Errorf("Result mismatch (-want +got):\n%s", diff)
	}
}

type simpleTestObj struct {
	Name   string          `json:"name,omitempty"`
	FType  data.FieldType  `json:"type,omitempty"`
	FType2 *data.FieldType `json:"typePtr,omitempty"`
}

func TestJSONNanoTime(t *testing.T) {
	t.Run("time no nano", func(t *testing.T) {
		noNanoFrame := data.NewFrame("frame_no_nano",
			// 1 second and 1 MS
			data.NewField("t", nil, []time.Time{time.Unix(1, 1000000)}),
		)

		noNanoJSONBytes, err := json.Marshal(noNanoFrame)
		require.NoError(t, err)

		noNanoFrameFromJSON := &data.Frame{}
		err = json.Unmarshal(noNanoJSONBytes, noNanoFrameFromJSON)
		require.NoError(t, err)

		if diff := cmp.Diff(noNanoFrame, noNanoFrameFromJSON, data.FrameTestCompareOptions()...); diff != "" {
			t.Errorf("Result mismatch (-want +got):\n%s", diff)
		}
	})

	t.Run("time with nano", func(t *testing.T) {
		nanoFrame := data.NewFrame("frame_nano",
			// 1 second and 10 ns
			data.NewField("i", nil, []int64{1}),
			data.NewField("t", nil, []time.Time{time.Unix(1, 10)}),
		)

		nanoJSONBytes, err := json.Marshal(nanoFrame)
		require.NoError(t, err)

		nanoFrameFromJSON := &data.Frame{}
		err = json.Unmarshal(nanoJSONBytes, nanoFrameFromJSON)
		require.NoError(t, err)

		if diff := cmp.Diff(nanoFrame, nanoFrameFromJSON, data.FrameTestCompareOptions()...); diff != "" {
			t.Errorf("Result mismatch (-want +got):\n%s", diff)
		}
	})

	t.Run("nullable with nano", func(t *testing.T) {
		nanoFrame := data.NewFrame("frame_nano",
			// 1 second and 10 ns
			data.NewField("i", nil, []int64{1, 2}),
			data.NewField("t", nil, []*time.Time{nil, timePtr(time.Unix(1, 10))}),
		)

		nanoJSONBytes, err := json.Marshal(nanoFrame)
		require.NoError(t, err)

		nanoFrameFromJSON := &data.Frame{}
		err = json.Unmarshal(nanoJSONBytes, nanoFrameFromJSON)
		require.NoError(t, err)

		if diff := cmp.Diff(nanoFrame, nanoFrameFromJSON, data.FrameTestCompareOptions()...); diff != "" {
			t.Errorf("Result mismatch (-want +got):\n%s", diff)
		}
	})

	t.Run("nanos before values property in data", func(t *testing.T) {
		jsString := `{
			"schema": {
			  "name": "frame_nano",
			  "fields": [
				{ "name": "i", "type": "number", "typeInfo": { "frame": "int64" } },
				{ "name": "t", "type": "time", "typeInfo": { "frame": "time.Time" } }
			  ]
			},
			"data": { "nanos": [null, [10]], "values": [[1], [1000]] }
		  }`

		nanoFrame := data.NewFrame("frame_nano",
			// 1 second and 10 ns
			data.NewField("i", nil, []int64{1}),
			data.NewField("t", nil, []time.Time{time.Unix(1, 10)}),
		)

		nanoFrameFromJSON := &data.Frame{}
		err := json.Unmarshal([]byte(jsString), nanoFrameFromJSON)
		require.NoError(t, err)

		if diff := cmp.Diff(nanoFrame, nanoFrameFromJSON, data.FrameTestCompareOptions()...); diff != "" {
			require.Fail(t, "Result mismatch (-want +got):\n%s", diff)
		}
	})
}

// TestFieldTypeToJSON makes sure field type will read/write to json
func TestFieldTypeToJSON(t *testing.T) {
	v := simpleTestObj{
		Name: "hello",
	}

	b, err := json.Marshal(v)
	require.NoError(t, err)
	assert.Equal(t, data.FieldTypeUnknown, v.FType)

	assert.Equal(t, `{"name":"hello"}`, string(b))

	ft := data.FieldTypeInt8

	v.FType = data.FieldTypeFloat64
	v.FType2 = &ft
	v.Name = ""
	b, err = json.Marshal(v)
	require.NoError(t, err)
	assert.Equal(t, `{"type":"float64","typePtr":"int8"}`, string(b))

	err = json.Unmarshal([]byte(`{"type":"int8","typePtr":"time"}`), &v)
	require.NoError(t, err)
	assert.Equal(t, data.FieldTypeInt8, v.FType)
	assert.Equal(t, data.FieldTypeTime, *v.FType2)

	field := newField("enum", data.FieldTypeEnum, []data.EnumItemIndex{
		1, 2, 2, 1, 1,
	})

	// Read/write enum field
	frame := data.NewFrame("test", field)

	orig, err := data.FrameToJSON(frame, data.IncludeAll)
	require.NoError(t, err)

	out := &data.Frame{}
	err = json.Unmarshal(orig, out)
	require.NoError(t, err)

	second, err := data.FrameToJSON(frame, data.IncludeAll)
	require.NoError(t, err)
	require.JSONEq(t, string(orig), string(second))
}

func TestJSONFrames(t *testing.T) {
	frames := data.Frames{goldenDF()}
	b, err := json.Marshal(frames)
	require.NoError(t, err)

	var rFrames data.Frames

	err = json.Unmarshal(b, &rFrames)
	require.NoError(t, err)

	if diff := cmp.Diff(frames, rFrames, data.FrameTestCompareOptions()...); diff != "" {
		t.Errorf("Result mismatch (-want +got):\n%s", diff)
	}
}

func BenchmarkFrameToJSON(b *testing.B) {
	f := goldenDF()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := data.FrameToJSONCache(f)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkFrameMarshalJSONStd(b *testing.B) {
	f := goldenDF()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := json.Marshal(f)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkFrameMarshalJSONIter(b *testing.B) {
	f := goldenDF()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := jsoniter.Marshal(f)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func TestFrameMarshalJSONConcurrent(t *testing.T) {
	f := goldenDF()
	initialJSON, err := json.Marshal(f)
	require.NoError(t, err)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				jsonData, err := json.Marshal(f)
				require.NoError(t, err)
				require.JSONEq(t, string(initialJSON), string(jsonData))
			}
		}()
	}
	wg.Wait()
}

type testWrapper struct {
	Data []byte
}

func TestFrame_UnmarshalJSON_SchemaOnly(t *testing.T) {
	f := data.NewFrame("test", data.NewField("test", nil, []int64{1}))
	d, err := data.FrameToJSON(f, data.IncludeSchemaOnly)
	require.NoError(t, err)
	_, err = json.Marshal(testWrapper{Data: d})
	require.NoError(t, err)
	var newFrame data.Frame
	err = json.Unmarshal(d, &newFrame)
	require.NoError(t, err)
	require.Equal(t, 0, newFrame.Fields[0].Len())
}

func TestFrameMarshalJSON_DataOnly(t *testing.T) {
	f := goldenDF()
	d, err := data.FrameToJSON(f, data.IncludeDataOnly)
	require.NoError(t, err)
	_, err = json.Marshal(testWrapper{Data: d})
	require.NoError(t, err)
	var newFrame data.Frame
	err = json.Unmarshal(d, &newFrame)
	require.Error(t, err)
}

func TestFrame_UnmarshalJSON_SchemaAndData_WrongOrder(t *testing.T) {
	// At this moment we can only unmarshal frames with "schema" key first.
	d := []byte(`{"data":{"values":[[]]}, "schema":{"name":"test","fields":[{"name":"test","type":"number","typeInfo":{"frame":"int64"}}]}}`)
	var newFrame data.Frame
	err := json.Unmarshal(d, &newFrame)
	require.Error(t, err)
}

func TestFrame_UnmarshalJSON_DataOnly(t *testing.T) {
	f := data.NewFrame("test", data.NewField("test", nil, []int64{}))
	d, err := data.FrameToJSON(f, data.IncludeDataOnly)

	require.NoError(t, err)
	var newFrame data.Frame
	err = json.Unmarshal(d, &newFrame)
	require.Error(t, err)
}

func TestFrame_UnmarshallUint64(t *testing.T) {
	expected := `
	{"schema":{"name":"test","fields":[{"name":"test-field","type":"number","typeInfo":{"frame":"uint64"}}]},"data":{"values":[[18446744073709551615,"18446744073709551615",0,1,2,3,4,5]]}}
	`

	var actual data.Frame
	require.NoError(t, json.Unmarshal([]byte(expected), &actual))
	require.Len(t, actual.Fields, 1)
	require.Equal(t, data.FieldTypeUint64, actual.Fields[0].Type())
	var values []uint64
	for i := 0; i < actual.Fields[0].Len(); i++ {
		v, ok := actual.Fields[0].ConcreteAt(i)
		require.True(t, ok)
		require.IsType(t, v, uint64(1))
		values = append(values, v.(uint64))
	}
	require.EqualValues(t, []uint64{math.MaxUint64, math.MaxUint64, 0, 1, 2, 3, 4, 5}, values)
}

// This function will write code to the console that should be copy/pasted into frame_json.gen.go
// when changes are required. Typically this function will always be skipped.
func TestGenerateGenericArrowCode(t *testing.T) {
	t.Skip()

	types := []string{
		"uint8", "uint16", "uint32", "uint64",
		"int8", "int16", "int32", "int64",
		"float32", "float64", "string", "bool",
		"enum", // Maps to uint16
	}

	code := `
func writeArrowData{{.Type}}(stream *jsoniter.Stream, col array.Interface) *fieldEntityLookup {
	var entities *fieldEntityLookup
	count := col.Len()

	v := array.New{{.Typex}}Data(col.Data())
	stream.WriteArrayStart()
	for i := 0; i < count; i++ {
		if i > 0 {
			stream.WriteRaw(",")
		}
		if col.IsNull(i) {
			stream.WriteNil()
			continue
		}
{{- if .HasSpecialEntities }}
		val := v.Value(i)
		f64 := float64(val)
		if entityType, found := isSpecialEntity(f64); found {
			if entities == nil {
				entities = &fieldEntityLookup{}
			}
			entities.add(entityType, i)
			stream.WriteNil()
		} else {
			stream.Write{{.IterType}}(val)
		}
{{ else }}
		stream.Write{{.IterType}}(v.Value(i)){{ end }}
	}
	stream.WriteArrayEnd()
	return entities
}

func read{{.Type}}VectorJSON(iter *jsoniter.Iterator, size int) (*{{.Typen}}Vector, error) {
	arr := new{{.Type}}Vector(size)
	for i := 0; i < size; i++ {
		if !iter.ReadArray() {
			iter.ReportError("read{{.Type}}VectorJSON", "expected array")
			return nil, iter.Error
		}

		t := iter.WhatIsNext()
		if t == jsoniter.NilValue {
			iter.ReadNil()
		} else {
			v := iter.Read{{.IterType}}()
			arr.Set(i, v)
		}
	}

	if iter.ReadArray() {
		iter.ReportError("read", "expected close array")
		return nil, iter.Error
	}
	return arr, nil
}


func readNullable{{.Type}}VectorJSON(iter *jsoniter.Iterator, size int) (*nullable{{.Type}}Vector, error) {
	arr := newNullable{{.Type}}Vector(size)
	for i := 0; i < size; i++ {
		if !iter.ReadArray() {
			iter.ReportError("readNullable{{.Type}}VectorJSON", "expected array")
			return nil, iter.Error
		}
		t := iter.WhatIsNext()
		if t == jsoniter.NilValue {
			iter.ReadNil()
		} else {
			v := iter.Read{{.IterType}}()
			arr.Set(i, &v)
		}
	}

	if iter.ReadArray() {
		iter.ReportError("readNullable{{.Type}}VectorJSON", "expected close array")
		return nil, iter.Error
	}
	return arr, nil
}

`
	caser := cases.Title(language.English, cases.NoLower)

	// switch col.DataType().ID() {
	// 	// case arrow.STRING:
	// 	// 	ent := writeArrowSTRING(stream, col)
	for _, tstr := range types {
		tname := caser.String(tstr)
		tuppr := strings.ToUpper(tstr)

		fmt.Printf("    case arrow." + tuppr + ":\n\t\tent = writeArrowData" + tname + "(stream, col)\n")
	}

	for _, tstr := range types {
		itertype := caser.String(tstr)
		typex := tstr
		switch tstr {
		case "bool":
			typex = "Boolean"
		case "enum":
			typex = "uint16"
			itertype = caser.String(typex)
		case "timeOffset":
			typex = "int64"
			itertype = caser.String(typex)
		}
		hasSpecialEntities := tstr == "float32" || tstr == "float64"
		tmplData := struct {
			Type               string
			Typex              string
			Typen              string
			IterType           string
			HasSpecialEntities bool
		}{
			Type:               caser.String(tstr),
			Typex:              caser.String(typex),
			Typen:              tstr,
			IterType:           itertype,
			HasSpecialEntities: hasSpecialEntities,
		}
		tmpl, err := template.New("").Parse(code)
		require.NoError(t, err)
		err = tmpl.Execute(os.Stdout, tmplData)
		require.NoError(t, err)
		fmt.Printf("\n")
	}

	for _, tstr := range types {
		tname := caser.String(tstr)
		fmt.Printf("    case FieldType" + tname + ": return read" + tname + "VectorJSON(iter, size)\n")
		fmt.Printf("    case FieldTypeNullable" + tname + ": return readNullable" + tname + "VectorJSON(iter, size)\n")
	}

	assert.FailNow(t, "fail so we see the output")
}
