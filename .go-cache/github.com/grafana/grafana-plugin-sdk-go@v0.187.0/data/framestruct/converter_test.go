package framestruct_test

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/framestruct"
)

func TestStructs(t *testing.T) {
	t.Run("it flattens a struct", func(t *testing.T) {
		strct := simpleStruct{"foo", 36, "baz"}

		frame, err := framestruct.ToDataFrame("Results", strct)
		require.Nil(t, err)

		require.Equal(t, "Results", frame.Name)
		require.Len(t, frame.Fields, 3)

		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Equal(t, "baz", fromPointer(frame.Fields[2].At(0)))
	})

	t.Run("it treats times as a value", func(t *testing.T) {
		tme := time.Date(2009, 11, 17, 20, 34, 58, 651387237, time.UTC)
		strct := timeStruct{tme}

		frame, err := framestruct.ToDataFrame("Results", strct)
		require.Nil(t, err)

		require.Equal(t, "Results", frame.Name)
		require.Len(t, frame.Fields, 1)
		require.Equal(t, tme, fromPointer(frame.Fields[0].At(0)))
	})

	t.Run("it treats time pointers as a value", func(t *testing.T) {
		tme := time.Date(2009, 11, 17, 20, 34, 58, 651387237, time.UTC)
		strct := timePointerStruct{&tme}

		frame, err := framestruct.ToDataFrame("Results", strct)
		require.Nil(t, err)

		require.Equal(t, "Results", frame.Name)
		require.Len(t, frame.Fields, 1)
		require.Equal(t, &tme, frame.Fields[0].At(0))
	})

	t.Run("it flattens a pointer to a struct", func(t *testing.T) {
		strct := simpleStruct{"foo", 36, "baz"}

		frame, err := framestruct.ToDataFrame("Results", &strct)
		require.Nil(t, err)

		require.Equal(t, "Results", frame.Name)
		require.Len(t, frame.Fields, 3)

		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Equal(t, "baz", fromPointer(frame.Fields[2].At(0)))
	})

	t.Run("it flattens structs with maps", func(t *testing.T) {
		m := structWithMap{
			map[string]interface{}{
				"Thing1": "foo",
			},
		}

		frame, err := framestruct.ToDataFrame("results", m)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 1)
		require.Equal(t, "Foo.Thing1", frame.Fields[0].Name)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
	})

	t.Run("it properly handles pointers", func(t *testing.T) {
		foo := "foo"
		strct := pointerStruct{&foo}

		frame, err := framestruct.ToDataFrame("results", strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 1)

		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
	})

	t.Run("it ignores unexported fields", func(t *testing.T) {
		strct := noExportedFields{"no!"}

		frame, err := framestruct.ToDataFrame("results", strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 0)
	})

	t.Run("it flattens nested structs with dot-names", func(t *testing.T) {
		strct := []nested1{
			{"foo", 36, "baz",
				nested3{true, 100},
			},
			{"foo1", 37, "baz1",
				nested3{false, 101},
			},
		}

		frame, err := framestruct.ToDataFrame("results", strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 5)
		require.Equal(t, 2, frame.Fields[0].Len())
		require.Equal(t, 2, frame.Fields[1].Len())
		require.Equal(t, 2, frame.Fields[2].Len())
		require.Equal(t, 2, frame.Fields[3].Len())
		require.Equal(t, 2, frame.Fields[4].Len())

		require.Equal(t, "Thing1", frame.Fields[0].Name)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, "foo1", fromPointer(frame.Fields[0].At(1)))

		require.Equal(t, "Thing2", frame.Fields[1].Name)
		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Equal(t, int32(37), fromPointer(frame.Fields[1].At(1)))

		require.Equal(t, "Thing3", frame.Fields[2].Name)
		require.Equal(t, "baz", fromPointer(frame.Fields[2].At(0)))
		require.Equal(t, "baz1", fromPointer(frame.Fields[2].At(1)))

		require.Equal(t, "Thing4.Thing7", frame.Fields[3].Name)
		require.Equal(t, true, fromPointer(frame.Fields[3].At(0)))
		require.Equal(t, false, fromPointer(frame.Fields[3].At(1)))

		require.Equal(t, "Thing4.Thing8", frame.Fields[4].Name)
		require.Equal(t, int64(100), fromPointer(frame.Fields[4].At(0)))
		require.Equal(t, int64(101), fromPointer(frame.Fields[4].At(1)))
	})

	t.Run("it returns an error when the struct contains an unsupported type", func(t *testing.T) {
		strct := unsupportedType{32}

		_, err := framestruct.ToDataFrame("results", strct)
		require.Error(t, err)
		require.Equal(t, "unsupported type int", err.Error())
	})

	t.Run("it returns an error when any struct contains a map with an unsupported type", func(t *testing.T) {
		m := structWithMap{
			map[string]interface{}{
				"Thing2": 36,
			},
		}

		_, err := framestruct.ToDataFrame("results", m)
		require.Error(t, err)
		require.Equal(t, "unsupported type int", err.Error())

		_, err = framestruct.ToDataFrame("results", []structWithMap{m})
		require.Error(t, err)
		require.Equal(t, "unsupported type int", err.Error())
	})

	t.Run("it returns an error when a nested struct contains an unsupported type", func(t *testing.T) {
		strct := supportedWithUnsupported{
			"foo",
			unsupportedType{
				100,
			},
		}

		_, err := framestruct.ToDataFrame("results", strct)
		require.Error(t, err)
		require.Equal(t, "unsupported type int", err.Error())
	})

	t.Run("it returns an error when any struct contains an unsupported type", func(t *testing.T) {
		strct := unsupportedType{32}

		_, err := framestruct.ToDataFrame("results", []unsupportedType{strct})
		require.Error(t, err)
		require.Equal(t, "unsupported type int", err.Error())
	})

	t.Run("it can't convert a struct that contains a slice", func(t *testing.T) {
		strct := unsupportedTypeSlice{
			Foo: []string{"1", "2", "3"},
		}
		_, err := framestruct.ToDataFrame("???", strct)
		require.Error(t, err)
	})
}

func TestSlices(t *testing.T) {
	t.Run("it flattens a slice of structs", func(t *testing.T) {
		strct := []simpleStruct{
			{"foo", 36, "baz"},
			{"foo1", 37, "baz1"},
		}

		frame, err := framestruct.ToDataFrame("results", strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 3)
		require.Equal(t, 2, frame.Fields[0].Len())
		require.Equal(t, 2, frame.Fields[1].Len())
		require.Equal(t, 2, frame.Fields[2].Len())

		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, "foo1", fromPointer(frame.Fields[0].At(1)))

		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Equal(t, int32(37), fromPointer(frame.Fields[1].At(1)))

		require.Equal(t, "baz", fromPointer(frame.Fields[2].At(0)))
		require.Equal(t, "baz1", fromPointer(frame.Fields[2].At(1)))
	})

	t.Run("it flattens a pointer to a slice of structs", func(t *testing.T) {
		strct := []simpleStruct{
			{"foo", 36, "baz"},
			{"foo1", 37, "baz1"},
		}

		frame, err := framestruct.ToDataFrame("results", &strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 3)
		require.Equal(t, 2, frame.Fields[0].Len())
		require.Equal(t, 2, frame.Fields[1].Len())
		require.Equal(t, 2, frame.Fields[2].Len())

		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, "foo1", fromPointer(frame.Fields[0].At(1)))

		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Equal(t, int32(37), fromPointer(frame.Fields[1].At(1)))

		require.Equal(t, "baz", fromPointer(frame.Fields[2].At(0)))
		require.Equal(t, "baz1", fromPointer(frame.Fields[2].At(1)))
	})

	t.Run("it flattens a slice of maps", func(t *testing.T) {
		maps := []map[string]interface{}{
			{
				"Thing1": "foo",
				"Thing2": int32(36),
				"Thing3": "baz",
			},
			{
				"Thing1": "foo1",
				"Thing2": int32(37),
				"Thing3": "baz1",
			},
		}

		frame, err := framestruct.ToDataFrame("results", maps)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 3)
		require.Equal(t, 2, frame.Fields[0].Len())
		require.Equal(t, 2, frame.Fields[1].Len())
		require.Equal(t, 2, frame.Fields[2].Len())

		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, "foo1", fromPointer(frame.Fields[0].At(1)))

		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Equal(t, int32(37), fromPointer(frame.Fields[1].At(1)))

		require.Equal(t, "baz", fromPointer(frame.Fields[2].At(0)))
		require.Equal(t, "baz1", fromPointer(frame.Fields[2].At(1)))
	})

	t.Run("it flattens a slice of maps that are different sizes", func(t *testing.T) {
		maps := []map[string]interface{}{
			{
				"Thing1": "foo",
				"Thing2": int32(36),
			},
			{
				"Thing1": "foo1",
				"Thing3": "baz1",
			},
		}

		// result
		// | Thing1 | Thing2 | Thing3 |
		// |--------+--------+--------|
		// | foo    | 36     | nil    |
		// | foo1   | nil    | baz1   |

		frame, err := framestruct.ToDataFrame("results", maps)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 3)
		require.Equal(t, 2, frame.Fields[0].Len())
		require.Equal(t, 2, frame.Fields[1].Len())
		require.Equal(t, 2, frame.Fields[2].Len())

		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, "foo1", fromPointer(frame.Fields[0].At(1)))

		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Nil(t, frame.Fields[1].At(1))

		require.Nil(t, frame.Fields[2].At(0))
		require.Equal(t, "baz1", fromPointer(frame.Fields[2].At(1)))
	})

	t.Run("it flattens a slice of maps that are different sizes even if col0 is not fully-defined", func(t *testing.T) {
		maps := []map[string]interface{}{
			{
				"Thing2": int32(36),
			},
			{
				"Thing1": "foo1",
				"Thing3": "baz1",
			},
		}

		// result
		// | Thing1 | Thing2 | Thing3 |
		// |--------+--------+--------|
		// | nil    | 36     | nil    |
		// | foo1   | nil    | baz1   |

		frame, err := framestruct.ToDataFrame("results", maps)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 3)
		require.Equal(t, 2, frame.Fields[0].Len())
		require.Equal(t, 2, frame.Fields[1].Len())
		require.Equal(t, 2, frame.Fields[2].Len())

		require.Nil(t, frame.Fields[0].At(0))
		require.Equal(t, "foo1", fromPointer(frame.Fields[0].At(1)))

		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Nil(t, frame.Fields[1].At(1))

		require.Nil(t, frame.Fields[2].At(0))
		require.Equal(t, "baz1", fromPointer(frame.Fields[2].At(1)))
	})

	t.Run("it flattens a slice of maps that are different sizes even if col0 is not fully-defined (minimal)s", func(t *testing.T) {
		maps := []map[string]interface{}{
			{
				"b": true,
			},
			{
				"a": true,
			},
		}

		// result
		// | a    | b    |
		// |------+------|
		// | nil  | true |
		// | true | nil  |

		frame, err := framestruct.ToDataFrame("results", maps)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 2)
		require.Equal(t, 2, frame.Fields[0].Len())
		require.Equal(t, 2, frame.Fields[1].Len())

		require.Nil(t, frame.Fields[0].At(0))
		require.Equal(t, true, fromPointer(frame.Fields[0].At(1)))

		require.Equal(t, true, fromPointer(frame.Fields[1].At(0)))
		require.Nil(t, frame.Fields[1].At(1))
	})

	t.Run("it flattens a slice of maps that contains nil values", func(t *testing.T) {
		// like the testcase above, just with "nil" instead of non-defined map keys.
		maps := []map[string]interface{}{
			{
				"Thing1": "foo",
				"Thing2": int32(36),
				"Thing3": nil,
			},
			{
				"Thing1": "foo1",
				"Thing2": nil,
				"Thing3": "baz1",
			},
		}

		// result
		// | Thing1 | Thing2 | Thing3 |
		// |--------+--------+--------|
		// | foo    | 36     | nil    |
		// | foo1   | nil    | baz1   |

		frame, err := framestruct.ToDataFrame("results", maps)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 3)
		require.Equal(t, 2, frame.Fields[0].Len())
		require.Equal(t, 2, frame.Fields[1].Len())
		require.Equal(t, 2, frame.Fields[2].Len())

		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, "foo1", fromPointer(frame.Fields[0].At(1)))

		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Nil(t, frame.Fields[1].At(1))

		require.Nil(t, frame.Fields[2].At(0))
		require.Equal(t, "baz1", fromPointer(frame.Fields[2].At(1)))
	})
}

func TestMaps(t *testing.T) {
	t.Run("it flattens a map", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "foo",
			"Thing2": int32(36),
			"Thing3": "baz",
		}

		frame, err := framestruct.ToDataFrame("results", m)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 3)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))
		require.Equal(t, "baz", fromPointer(frame.Fields[2].At(0)))
	})

	t.Run("it flattens other than map[string]interface", func(t *testing.T) {
		stringMap := map[string]string{
			"Thing1": "foo",
			"Thing2": "bar",
			"Thing3": "baz",
		}

		frame, err := framestruct.ToDataFrame("results", stringMap)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 3)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, "bar", fromPointer(frame.Fields[1].At(0)))
		require.Equal(t, "baz", fromPointer(frame.Fields[2].At(0)))

		floatMap := map[string]float64{
			"Thing1": 1.0,
			"Thing2": 2.0,
			"Thing3": 3.0,
		}

		frame, err = framestruct.ToDataFrame("results", floatMap)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 3)
		require.Equal(t, 1.0, fromPointer(frame.Fields[0].At(0)))
		require.Equal(t, 2.0, fromPointer(frame.Fields[1].At(0)))
		require.Equal(t, 3.0, fromPointer(frame.Fields[2].At(0)))
	})

	t.Run("it flattens nested maps with dot-names", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "foo",
			"Thing2": int32(36),
			"Thing3": map[string]interface{}{
				"Thing4": true,
				"Thing5": int32(100),
			},
		}

		frame, err := framestruct.ToDataFrame("results", m)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 4)
		require.Equal(t, "Thing1", frame.Fields[0].Name)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))

		require.Equal(t, "Thing2", frame.Fields[1].Name)
		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))

		require.Equal(t, "Thing3.Thing4", frame.Fields[2].Name)
		require.Equal(t, true, fromPointer(frame.Fields[2].At(0)))

		require.Equal(t, "Thing3.Thing5", frame.Fields[3].Name)
		require.Equal(t, int32(100), fromPointer(frame.Fields[3].At(0)))
	})

	t.Run("it flattens maps with structs", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "foo",
			"Thing2": int32(36),
			"Thing3": nested3{
				Thing7: false,
				Thing8: 100,
			},
		}

		frame, err := framestruct.ToDataFrame("results", m)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 4)
		require.Equal(t, "Thing1", frame.Fields[0].Name)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))

		require.Equal(t, "Thing2", frame.Fields[1].Name)
		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))

		require.Equal(t, "Thing3.Thing7", frame.Fields[2].Name)
		require.Equal(t, false, fromPointer(frame.Fields[2].At(0)))

		require.Equal(t, "Thing3.Thing8", frame.Fields[3].Name)
		require.Equal(t, int64(100), fromPointer(frame.Fields[3].At(0)))
	})

	t.Run("it flattens maps with slices of structs", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "foo",
			"Thing2": int32(36),
			"Thing3": []nested3{{
				Thing7: false,
				Thing8: 100,
			}},
		}

		frame, err := framestruct.ToDataFrame("results", m)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 4)
		require.Equal(t, "Thing1", frame.Fields[0].Name)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))

		require.Equal(t, "Thing2", frame.Fields[1].Name)
		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))

		require.Equal(t, "Thing3.Thing7", frame.Fields[2].Name)
		require.Equal(t, false, fromPointer(frame.Fields[2].At(0)))

		require.Equal(t, "Thing3.Thing8", frame.Fields[3].Name)
		require.Equal(t, int64(100), fromPointer(frame.Fields[3].At(0)))
	})

	t.Run("it returns an error when any map contains an unsupported type", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "foo",
			"Thing2": int(36),
			"Thing3": "baz",
			"Thing4": map[string]interface{}{
				"Thing5": 37,
			},
		}

		_, err := framestruct.ToDataFrame("results", m)
		require.Error(t, err)
		require.Equal(t, "unsupported type int", err.Error())

		_, err = framestruct.ToDataFrame("results", []map[string]interface{}{m})
		require.Error(t, err)
		require.Equal(t, "unsupported type int", err.Error())
	})

	t.Run("it returns an error when a map key is not a string", func(t *testing.T) {
		m := map[float64]interface{}{
			1.0: "foo",
		}

		_, err := framestruct.ToDataFrame("results", m)
		require.Error(t, err)
		require.Equal(t, "maps must have string keys", err.Error())
	})

	t.Run("it returns an error when any map contains a struct with an unsupported type", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "foo",
			"Thing2": int(36),
			"Thing3": "baz",
			"Thing4": unsupportedType{36},
		}

		_, err := framestruct.ToDataFrame("results", m)
		require.Error(t, err)
		require.Equal(t, "unsupported type int", err.Error())

		_, err = framestruct.ToDataFrame("results", []map[string]interface{}{m})
		require.Error(t, err)
		require.Equal(t, "unsupported type int", err.Error())
	})

	t.Run("it can't convert a map that contains a slice", func(t *testing.T) {
		m := map[string]interface{}{
			"Foo": []string{"1", "2", "3"},
		}

		_, err := framestruct.ToDataFrame("???", m)
		require.Error(t, err)
	})
}

func TestStructTags(t *testing.T) {
	t.Run("it ignores fields when the struct tag is a '-'", func(t *testing.T) {
		strct := structWithIgnoredTag{"foo", "bar", "baz"}

		frame, err := framestruct.ToDataFrame("results", strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 2)
		require.Equal(t, "first-thing", frame.Fields[0].Name)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))

		require.Equal(t, "third-thing", frame.Fields[1].Name)
		require.Equal(t, "baz", fromPointer(frame.Fields[1].At(0)))
	})

	t.Run("it uses struct tags if they're present", func(t *testing.T) {
		strct := structWithTags{
			"foo",
			"bar",
			nested3{
				true,
				100,
			},
		}

		frame, err := framestruct.ToDataFrame("results", strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 4)
		require.Equal(t, "first-thing", frame.Fields[0].Name)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))

		require.Equal(t, "second-thing", frame.Fields[1].Name)
		require.Equal(t, "bar", fromPointer(frame.Fields[1].At(0)))

		require.Equal(t, "third-thing.Thing7", frame.Fields[2].Name)
		require.Equal(t, true, fromPointer(frame.Fields[2].At(0)))

		require.Equal(t, "third-thing.Thing8", frame.Fields[3].Name)
		require.Equal(t, int64(100), fromPointer(frame.Fields[3].At(0)))
	})

	t.Run("omits the parent struct name if omitparent is present", func(t *testing.T) {
		strct := omitParentStruct{
			"foo",
			"bar",
			nested2{
				true,
				100,
			},
			nested3{
				false,
				200,
			},
		}

		frame, err := framestruct.ToDataFrame("results", strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 6)
		require.Equal(t, "first-thing", frame.Fields[0].Name)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))

		require.Equal(t, "second-thing", frame.Fields[1].Name)
		require.Equal(t, "bar", fromPointer(frame.Fields[1].At(0)))

		require.Equal(t, "Thing5", frame.Fields[2].Name)
		require.Equal(t, true, fromPointer(frame.Fields[2].At(0)))

		require.Equal(t, "Thing6", frame.Fields[3].Name)
		require.Equal(t, int64(100), fromPointer(frame.Fields[3].At(0)))

		require.Equal(t, "omitparent.Thing7", frame.Fields[4].Name)
		require.Equal(t, false, fromPointer(frame.Fields[4].At(0)))

		require.Equal(t, "omitparent.Thing8", frame.Fields[5].Name)
		require.Equal(t, int64(200), fromPointer(frame.Fields[5].At(0)))
	})

	t.Run("sets the column with col0 to be the 0th column", func(t *testing.T) {
		m := structWithCol0{
			Zed: "this would be last without tag",
			Foo: map[string]interface{}{
				"aaa": "foo",
				"bbb": "foo",
				"ccc": "foo",
			},
		}

		frame, err := framestruct.ToDataFrame("results", m)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 4)
		require.Equal(t, "zzz", frame.Fields[0].Name)
		require.Equal(t, "aaa", frame.Fields[1].Name)
		require.Equal(t, "bbb", frame.Fields[2].Name)
		require.Equal(t, "ccc", frame.Fields[3].Name)
	})

	t.Run("it should be able to use all the struct tags", func(t *testing.T) {
		strct := allStructTags{
			Foo: barBaz{
				Bar: "should be first",
				Baz: map[string]interface{}{
					"aaa": "foo",
					"bbb": "foo",
					"ccc": "foo",
				},
			},
		}

		frame, err := framestruct.ToDataFrame("results", strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 4)
		require.Equal(t, "zzz", frame.Fields[0].Name)
		require.Equal(t, "aaa", frame.Fields[1].Name)
		require.Equal(t, "bbb", frame.Fields[2].Name)
		require.Equal(t, "ccc", frame.Fields[3].Name)
	})

	t.Run("it should ignore whitespace in struct tags", func(t *testing.T) {
		strct := allStructTagsWhitespace{
			Foo: barBazWhitespace{
				Bar: "should be first",
				Baz: map[string]interface{}{
					"aaa": "foo",
					"bbb": "foo",
					"ccc": "foo",
				},
			},
		}

		frame, err := framestruct.ToDataFrame("results", strct)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 4)
		require.Equal(t, "zzz", frame.Fields[0].Name)
		require.Equal(t, "aaa", frame.Fields[1].Name)
		require.Equal(t, "bbb", frame.Fields[2].Name)
		require.Equal(t, "ccc", frame.Fields[3].Name)
	})

	t.Run("it omits parents with slices of structs", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "foo",
			"Thing2": int32(36),
			"Thing3": []nested2{{
				Thing5: false,
				Thing6: 100,
			}},
		}

		frame, err := framestruct.ToDataFrame("results", m)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 4)
		require.Equal(t, "Thing1", frame.Fields[0].Name)
		require.Equal(t, "foo", fromPointer(frame.Fields[0].At(0)))

		require.Equal(t, "Thing2", frame.Fields[1].Name)
		require.Equal(t, int32(36), fromPointer(frame.Fields[1].At(0)))

		require.Equal(t, "Thing5", frame.Fields[2].Name)
		require.Equal(t, false, fromPointer(frame.Fields[2].At(0)))

		require.Equal(t, "Thing6", frame.Fields[3].Name)
		require.Equal(t, int64(100), fromPointer(frame.Fields[3].At(0)))
	})
}
func TestToDataframe(t *testing.T) {
	t.Run("it returns an error when invalid types are passed in", func(t *testing.T) {
		_, err := framestruct.ToDataFrame("???", []string{"1", "2"})
		require.Error(t, err)

		_, err = framestruct.ToDataFrame("???", "can't do a string either")
		require.Error(t, err)

		_, err = framestruct.ToDataFrame("???", time.Now())
		require.Error(t, err)

		_, err = framestruct.ToDataFrame("???", []time.Time{time.Now()})
		require.Error(t, err)
	})

	// This test fails when run with -race when it's not threadsafe
	t.Run("it is threadsafe", func(t *testing.T) {
		start := make(chan struct{})
		end := make(chan struct{})

		go convertStruct(start, end)
		go convertStruct(start, end)

		close(start)
		time.Sleep(20 * time.Millisecond)
		close(end)
	})
}

func TestToDataFrames(t *testing.T) {
	t.Run("it defers to the marhaller if the struct is a Framer", func(t *testing.T) {
		strct := &mockFramer{}
		frames, err := framestruct.ToDataFrames("Some Frame", strct)
		require.Nil(t, err)

		require.True(t, strct.called)
		require.Len(t, frames, 1)
		require.Equal(t, "New Frame", frames[0].Name) // Prefer the defined name
	})

	t.Run("it wraps the converted data frame in the Frames type", func(t *testing.T) {
		strct := allStructTags{
			Foo: barBaz{
				Bar: "should be first",
				Baz: map[string]interface{}{
					"aaa": "foo",
					"bbb": "foo",
					"ccc": "foo",
				},
			},
		}

		frames, err := framestruct.ToDataFrames("results", strct)
		require.Nil(t, err)

		require.Len(t, frames, 1)

		frame := frames[0]
		require.Len(t, frame.Fields, 4)
		require.Equal(t, "zzz", frame.Fields[0].Name)
		require.Equal(t, "aaa", frame.Fields[1].Name)
		require.Equal(t, "bbb", frame.Fields[2].Name)
		require.Equal(t, "ccc", frame.Fields[3].Name)
	})
}

func TestOptions(t *testing.T) {
	t.Run("it can designate the 0th column", func(t *testing.T) {
		m := map[string]interface{}{
			"aaa": "foo",
			"bbb": "foo",
			"ccc": "foo",
			"zzz": "foo",
		}

		frame, err := framestruct.ToDataFrame(
			"results",
			m,
			framestruct.WithColumn0("zzz"),
		)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 4)
		require.Equal(t, "zzz", frame.Fields[0].Name)
		require.Equal(t, "aaa", frame.Fields[1].Name)
		require.Equal(t, "bbb", frame.Fields[2].Name)
		require.Equal(t, "ccc", frame.Fields[3].Name)
	})

	t.Run("it can accept converters to convert values", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "1",
		}

		stringToInt := func(i interface{}) (interface{}, error) {
			s, _ := i.(string)
			num, _ := strconv.Atoi(s)
			return int64(num), nil
		}

		frame, err := framestruct.ToDataFrame(
			"results",
			m,
			framestruct.WithConverterFor("Thing1", stringToInt),
		)
		require.Nil(t, err)

		require.Len(t, frame.Fields, 1)
		require.Equal(t, "Thing1", frame.Fields[0].Name)
		require.Equal(t, int64(1), fromPointer(frame.Fields[0].At(0)))
	})

	t.Run("it returns an error when the converter returns an error", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "1",
		}

		toError := func(i interface{}) (interface{}, error) {
			return nil, errors.New("something bad")
		}

		_, err := framestruct.ToDataFrame(
			"results",
			m,
			framestruct.WithConverterFor("Thing1", toError),
		)
		require.EqualError(t, err, "field conversion error Thing1: something bad")
	})

	t.Run("it works with ToDataFrames", func(t *testing.T) {
		m := map[string]interface{}{
			"Thing1": "1",
		}

		stringToInt := func(i interface{}) (interface{}, error) {
			s, _ := i.(string)
			num, _ := strconv.Atoi(s)
			return int64(num), nil
		}

		frames, err := framestruct.ToDataFrames(
			"results",
			m,
			framestruct.WithConverterFor("Thing1", stringToInt),
		)
		require.Nil(t, err)

		require.Len(t, frames[0].Fields, 1)
		require.Equal(t, "Thing1", frames[0].Fields[0].Name)
		require.Equal(t, int64(1), fromPointer(frames[0].Fields[0].At(0)))
	})
}

func convertStruct(start, end chan struct{}) {
	strct := structWithTags{
		"foo",
		"bar",
		nested3{
			true,
			100,
		},
	}

	<-start
	for {
		select {
		case <-end:
			return
		default:
			_, err := framestruct.ToDataFrame("frame", strct)
			if err != nil {
				panic(err)
			}
		}
	}
}

type noExportedFields struct {
	unexported string
}

type simpleStruct struct {
	Thing1 string
	Thing2 int32
	Thing3 string
}

type nested1 struct {
	Thing1 string
	Thing2 int32
	Thing3 string
	Thing4 nested3
}

type nested2 struct {
	Thing5 bool  `frame:",omitparent"`
	Thing6 int64 `frame:",omitparent"`
}

type nested3 struct {
	Thing7 bool
	Thing8 int64
}

type structWithTags struct {
	Thing1 string  `frame:"first-thing"`
	Thing2 string  `frame:"second-thing"`
	Thing3 nested3 `frame:"third-thing"`
}

type omitParentStruct struct {
	Thing1 string `frame:"first-thing"`
	Thing2 string `frame:"second-thing"`
	Thing3 nested2
	Thing4 nested3 `frame:"omitparent"`
}

type structWithIgnoredTag struct {
	Thing1 string `frame:"first-thing"`
	Thing2 string `frame:"-"`
	Thing3 string `frame:"third-thing"`
}

type supportedWithUnsupported struct {
	Foo string
	Bar unsupportedType
}

type unsupportedType struct {
	Foo int
}

type unsupportedTypeSlice struct {
	Foo []string
}

type pointerStruct struct {
	Foo *string
}

type structWithMap struct {
	Foo map[string]interface{}
}

type structWithCol0 struct {
	Zed string                 `frame:"zzz,,col0"`
	Foo map[string]interface{} `frame:",omitparent"`
}

type allStructTags struct {
	Foo barBaz
}

type barBaz struct {
	Bar string                 `frame:"zzz,omitparent,col0"`
	Baz map[string]interface{} `frame:",omitparent"`
}

type timeStruct struct {
	Time time.Time `frame:"time"`
}

type timePointerStruct struct {
	Time *time.Time `frame:"time"`
}

type allStructTagsWhitespace struct {
	Foo barBazWhitespace
}

type barBazWhitespace struct {
	Bar string                 `frame:"zzz  ,  omitparent  ,  col0   "`
	Baz map[string]interface{} `frame:"   ,omitparent"`
}

type mockFramer struct {
	called bool
}

func (f *mockFramer) Frames() (data.Frames, error) {
	f.called = true
	frame := data.NewFrame("New Frame")
	return []*data.Frame{frame}, nil
}

func fromPointer(value interface{}) interface{} {
	switch v := value.(type) {
	case *int8:
		return *v
	case *int16:
		return *v
	case *int32:
		return *v
	case *int64:
		return *v
	case *uint8:
		return *v
	case *uint16:
		return *v
	case *uint32:
		return *v
	case *uint64:
		return *v
	case *float32:
		return *v
	case *float64:
		return *v
	case *string:
		return *v
	case *bool:
		return *v
	case *time.Time:
		return *v
	default:
		return nil
	}
}
