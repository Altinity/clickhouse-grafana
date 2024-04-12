package marshmallow_test

import (
	"fmt"
	"github.com/perimeterx/marshmallow"
	"sync"
)

// ExampleBasicUnmarshal shows a basic example usage of marshmallow's unmarshalling capabilities
func ExampleBasicUnmarshal() {
	// we have the following data
	data := []byte(`{"name":"some name", "values": [1, 2, 3], "more_data": "some stuff I am not interested in..."}`)
	// we want to read the "name" field, and modify the "values" field.
	// we're not directly interested in the other fields, but we do want to retain them.

	type exampleStruct struct {
		Name   string `json:"name"`
		Values []int  `json:"values"`
	}

	v := exampleStruct{}
	// we pass in a struct containing the fields we're interested in,
	// marshmallow will populate it and return a result map containing all data
	result, err := marshmallow.Unmarshal(data, &v)
	if err != nil {
		panic(err)
	}

	fmt.Printf("Struct data: %+v\n", v)
	fmt.Printf("Map data: %+v\n", result)

	// now we can work with the struct data in a safe and maintainable manner
	v.Values[0] = 42
	fmt.Printf("Name is %s\n", v.Name)

	// pointer value changes in the struct will also be visible from the map
	// more info at https://github.com/PerimeterX/marshmallow/issues/23#issuecomment-1403409592
	fmt.Printf("Map data after changes: %+v\n", result)

	// Output:
	// Struct data: {Name:some name Values:[1 2 3]}
	// Map data: map[more_data:some stuff I am not interested in... name:some name values:[1 2 3]]
	// Name is some name
	// Map data after changes: map[more_data:some stuff I am not interested in... name:some name values:[42 2 3]]
}

// ExampleExcludeKnownFields shows how to use the WithExcludeKnownFieldsFromMap option to exclude struct fields
// from the result map. more info at https://github.com/PerimeterX/marshmallow/issues/16
func ExampleExcludeKnownFields() {
	type exampleStruct struct {
		Foo string `json:"foo"`
		Boo []int  `json:"boo"`
	}

	// unmarshal with mode marshmallow.ModeExcludeKnownFieldsFromReturnedMap
	// this will return unmarshalled result without known fields
	v := exampleStruct{}
	result, err := marshmallow.Unmarshal(
		[]byte(`{"foo":"bar","boo":[1,2,3],"goo":"untyped"}`),
		&v,
		marshmallow.WithExcludeKnownFieldsFromMap(true),
	)
	fmt.Printf("v=%+v, result=%+v, err=%T\n", v, result, err)
	// Output:
	// v={Foo:bar Boo:[1 2 3]}, result=map[goo:untyped], err=<nil>
}

// ExampleJSONDataHandler shows how to capture nested unknown fields
// more info at https://github.com/PerimeterX/marshmallow/issues/15
func ExampleJSONDataHandler() {
	type parentStruct struct {
		Known  string      `json:"known"`
		Nested childStruct `json:"nested"`
	}

	data := []byte(`{"known": "foo","unknown": "boo","nested": {"known": "goo","unknown": "doo"}}`)
	p := &parentStruct{}
	_, err := marshmallow.Unmarshal(data, p)
	fmt.Printf("err: %v\n", err)
	fmt.Printf("nested data: %+v\n", p.Nested.Data)
	// Output:
	// err: <nil>
	// nested data: map[known:goo unknown:doo]
}

// ExampleCache shows how to enable marshmallow cache to boost up performance by reusing field type information.
// more info: https://github.com/PerimeterX/marshmallow/blob/22e3c7fe4423d7c5f317d95f84de524253e0aed3/cache.go#L35
func ExampleCache() {
	// enable default cache
	marshmallow.EnableCache()

	type exampleStruct struct {
		Foo string `json:"foo"`
		Boo []int  `json:"boo"`
	}
	v := exampleStruct{}
	_, _ = marshmallow.Unmarshal([]byte(`{"foo":"bar","boo":[1,2,3]}`), &v)

	// enable custom cache, you can pass any implementation of the marshmallow.Cache interface
	// this lets you control the size of the cache, eviction policy, or any other aspect of it.
	marshmallow.EnableCustomCache(&sync.Map{})
}

// ExampleUnmarshalErrorHandling shows all error handling capabilities of marshmallow.Unmarshal
func ExampleUnmarshalErrorHandling() {
	type exampleStruct struct {
		Foo string `json:"foo"`
		Boo []int  `json:"boo"`
	}

	// unmarshal with mode marshmallow.ModeFailOnFirstError and valid value
	// this will finish unmarshalling and return a nil err
	v := exampleStruct{}
	result, err := marshmallow.Unmarshal([]byte(`{"foo":"bar","boo":[1,2,3]}`), &v)
	fmt.Printf("ModeFailOnFirstError and valid value: v=%+v, result=%+v, err=%T\n", v, result, err)

	// unmarshal with mode marshmallow.ModeFailOnFirstError and invalid value
	// this will return nil result and an error
	v = exampleStruct{}
	result, err = marshmallow.Unmarshal([]byte(`{"foo":2,"boo":[1,2,3]}`), &v)
	fmt.Printf("ModeFailOnFirstError and invalid value: result=%+v, err=%T\n", result, err)

	// unmarshal with mode marshmallow.ModeAllowMultipleErrors and valid value
	// this will finish unmarshalling and return a nil err
	v = exampleStruct{}
	result, err = marshmallow.Unmarshal(
		[]byte(`{"foo":"bar","boo":[1,2,3]}`),
		&v,
		marshmallow.WithMode(marshmallow.ModeAllowMultipleErrors),
	)
	fmt.Printf("ModeAllowMultipleErrors and valid value: v=%+v, result=%+v, err=%T\n", v, result, err)

	// unmarshal with mode marshmallow.ModeAllowMultipleErrors and invalid value
	// this will return a partially populated result and an error
	v = exampleStruct{}
	result, err = marshmallow.Unmarshal(
		[]byte(`{"foo":2,"boo":[1,2,3]}`),
		&v,
		marshmallow.WithMode(marshmallow.ModeAllowMultipleErrors),
	)
	fmt.Printf("ModeAllowMultipleErrors and invalid value: result=%+v, err=%T\n", result, err)

	// unmarshal with mode marshmallow.ModeFailOverToOriginalValue and valid value
	// this will finish unmarshalling and return a nil err
	v = exampleStruct{}
	result, err = marshmallow.Unmarshal(
		[]byte(`{"foo":"bar","boo":[1,2,3]}`),
		&v,
		marshmallow.WithMode(marshmallow.ModeFailOverToOriginalValue),
	)
	fmt.Printf("ModeFailOverToOriginalValue and valid value: v=%+v, result=%+v, err=%T\n", v, result, err)

	// unmarshal with mode marshmallow.ModeFailOverToOriginalValue and invalid value
	// this will return a fully unmarshalled result, failing to the original invalid values, and an error
	v = exampleStruct{}
	result, err = marshmallow.Unmarshal(
		[]byte(`{"foo":2,"boo":[1,2,3]}`),
		&v,
		marshmallow.WithMode(marshmallow.ModeFailOverToOriginalValue),
	)
	fmt.Printf("ModeFailOverToOriginalValue and invalid value: result=%+v, err=%T\n", result, err)

	// Output:
	// ModeFailOnFirstError and valid value: v={Foo:bar Boo:[1 2 3]}, result=map[boo:[1 2 3] foo:bar], err=<nil>
	// ModeFailOnFirstError and invalid value: result=map[], err=*jlexer.LexerError
	// ModeAllowMultipleErrors and valid value: v={Foo:bar Boo:[1 2 3]}, result=map[boo:[1 2 3] foo:bar], err=<nil>
	// ModeAllowMultipleErrors and invalid value: result=map[boo:[1 2 3]], err=*marshmallow.MultipleLexerError
	// ModeFailOverToOriginalValue and valid value: v={Foo:bar Boo:[1 2 3]}, result=map[boo:[1 2 3] foo:bar], err=<nil>
	// ModeFailOverToOriginalValue and invalid value: result=map[boo:[1 2 3] foo:2], err=*marshmallow.MultipleLexerError
}

// ExampleUnmarshalFromJSONMap shows all error handling capabilities of marshmallow.UnmarshalFromJSONMap
func ExampleUnmarshalFromJSONMapErrorHandling() {
	type exampleStruct struct {
		Foo string `json:"foo"`
		Boo []int  `json:"boo"`
	}

	// unmarshal with mode marshmallow.ModeFailOnFirstError and valid value
	// this will finish unmarshalling and return a nil err
	v := exampleStruct{}
	data := map[string]interface{}{"foo": "bar", "boo": []interface{}{float64(1), float64(2), float64(3)}}
	result, err := marshmallow.UnmarshalFromJSONMap(data, &v)
	fmt.Printf("ModeFailOnFirstError and valid value: v=%+v, result=%+v, err=%T\n", v, result, err)

	// unmarshal with mode marshmallow.ModeFailOnFirstError and invalid value
	// this will return nil result and an error
	v = exampleStruct{}
	data = map[string]interface{}{"foo": float64(2), "boo": []interface{}{float64(1), float64(2), float64(3)}}
	result, err = marshmallow.UnmarshalFromJSONMap(data, &v)
	fmt.Printf("ModeFailOnFirstError and invalid value: result=%+v, err=%T\n", result, err)

	// unmarshal with mode marshmallow.ModeAllowMultipleErrors and valid value
	// this will finish unmarshalling and return a nil err
	v = exampleStruct{}
	data = map[string]interface{}{"foo": "bar", "boo": []interface{}{float64(1), float64(2), float64(3)}}
	result, err = marshmallow.UnmarshalFromJSONMap(
		data,
		&v,
		marshmallow.WithMode(marshmallow.ModeAllowMultipleErrors),
	)
	fmt.Printf("ModeAllowMultipleErrors and valid value: v=%+v, result=%+v, err=%T\n", v, result, err)

	// unmarshal with mode marshmallow.ModeAllowMultipleErrors and invalid value
	// this will return a partially populated result and an error
	v = exampleStruct{}
	data = map[string]interface{}{"foo": float64(2), "boo": []interface{}{float64(1), float64(2), float64(3)}}
	result, err = marshmallow.UnmarshalFromJSONMap(
		data,
		&v,
		marshmallow.WithMode(marshmallow.ModeAllowMultipleErrors),
	)
	fmt.Printf("ModeAllowMultipleErrors and invalid value: result=%+v, err=%T\n", result, err)

	// unmarshal with mode marshmallow.ModeFailOverToOriginalValue and valid value
	// this will finish unmarshalling and return a nil err
	v = exampleStruct{}
	data = map[string]interface{}{"foo": "bar", "boo": []interface{}{float64(1), float64(2), float64(3)}}
	result, err = marshmallow.UnmarshalFromJSONMap(
		data,
		&v,
		marshmallow.WithMode(marshmallow.ModeFailOverToOriginalValue),
	)
	fmt.Printf("ModeFailOverToOriginalValue and valid value: v=%+v, result=%+v, err=%T\n", v, result, err)

	// unmarshal with mode marshmallow.ModeFailOverToOriginalValue and invalid value
	// this will return a fully unmarshalled result, failing to the original invalid values, and an error
	v = exampleStruct{}
	data = map[string]interface{}{"foo": float64(2), "boo": []interface{}{float64(1), float64(2), float64(3)}}
	result, err = marshmallow.UnmarshalFromJSONMap(
		data,
		&v,
		marshmallow.WithMode(marshmallow.ModeFailOverToOriginalValue),
	)
	fmt.Printf("ModeFailOverToOriginalValue and invalid value: result=%+v, err=%T\n", result, err)
	// Output:
	// ModeFailOnFirstError and valid value: v={Foo:bar Boo:[1 2 3]}, result=map[boo:[1 2 3] foo:bar], err=<nil>
	// ModeFailOnFirstError and invalid value: result=map[], err=*marshmallow.ParseError
	// ModeAllowMultipleErrors and valid value: v={Foo:bar Boo:[1 2 3]}, result=map[boo:[1 2 3] foo:bar], err=<nil>
	// ModeAllowMultipleErrors and invalid value: result=map[boo:[1 2 3]], err=*marshmallow.MultipleError
	// ModeFailOverToOriginalValue and valid value: v={Foo:bar Boo:[1 2 3]}, result=map[boo:[1 2 3] foo:bar], err=<nil>
	// ModeFailOverToOriginalValue and invalid value: result=map[boo:[1 2 3] foo:2], err=*marshmallow.MultipleError
}

type childStruct struct {
	Known string `json:"known"`

	Data map[string]interface{} `json:"-"`
}

func (c *childStruct) HandleJSONData(data map[string]interface{}) error {
	c.Data = data
	return nil
}
