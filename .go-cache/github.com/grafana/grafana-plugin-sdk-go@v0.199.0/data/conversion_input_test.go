package data_test

import (
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	conv "github.com/grafana/grafana-plugin-sdk-go/data/converters"
)

func ExampleNewFrameInputConverter() {
	inputData := struct { // inputData is a pretend table-like structure response from an API.
		ColumnTypes []string
		ColumnNames []string
		Rows        [][]string
	}{
		[]string{
			"Stringz",
			"Floatz",
			"Timez",
		},
		[]string{
			"Animal",
			"Weight (lbs)",
			"Time",
		},
		[][]string{
			{"sloth", "3.5", "1586014367"},
			{"sloth", "5.5", "1586100767"},
			{"sloth", "7", "1586187167"},
		},
	}

	// Build field converters appropriate for converting out pretend data structure.
	stringzFieldConverter := data.FieldConverter{
		OutputFieldType: data.FieldTypeString,
		// No Converter, string = string
	}
	floatzFieldConverter := data.FieldConverter{ // a converter appropriate for our pretend API's Floatz type.
		OutputFieldType: data.FieldTypeFloat64,
		Converter: func(v interface{}) (interface{}, error) {
			val, ok := v.(string)
			if !ok { // or return some default value instead of erroring
				return nil, fmt.Errorf("expected string input but got type %T", v)
			}
			return strconv.ParseFloat(val, 64)
		},
	}
	timezFieldConverter := data.FieldConverter{ // a converter appropriate for our pretend API's Timez type.
		OutputFieldType: data.FieldTypeTime,
		Converter: func(v interface{}) (interface{}, error) {
			val, ok := v.(string)
			if !ok { // or return some default value instead of erroring
				return nil, fmt.Errorf("expected string input but got type %T", v)
			}
			iV, err := strconv.ParseInt(val, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("could not parse epoch time into an int64")
			}
			return time.Unix(iV, 0).UTC(), nil
		},
	}

	// a map of pretend API's types to converters
	converterMap := map[string]data.FieldConverter{
		"Stringz": stringzFieldConverter,
		"Floatz":  floatzFieldConverter,
		"Timez":   timezFieldConverter,
	}

	// build a slice of converters for Pretend API known types in the appropriate Field/Column order
	// for this specific response.
	converters := make([]data.FieldConverter, len(inputData.ColumnTypes))
	for i, cType := range inputData.ColumnTypes {
		fc, ok := converterMap[cType]
		if !ok {
			fc = conv.AnyToString
		}
		converters[i] = fc
	}

	// Get a new FrameInputConverter, which includes a Frame with appropriate Field types and length
	// for out input data.
	convBuilder, err := data.NewFrameInputConverter(converters, len(inputData.Rows))
	if err != nil {
		log.Fatal(err)
	}

	// Set field names
	err = convBuilder.Frame.SetFieldNames(inputData.ColumnNames...)
	if err != nil {
		log.Fatal(err)
	}

	// Insert data into the frame, passing data through the Converters before
	// writing to the frame.
	for rowIdx, row := range inputData.Rows {
		for fieldIdx, cell := range row {
			err = convBuilder.Set(fieldIdx, rowIdx, cell)
			if err != nil {
				log.Fatal(err)
			}
		}
	}
	convBuilder.Frame.Name = "Converted"

	st, _ := convBuilder.Frame.StringTable(-1, -1)
	fmt.Println(st)

	// Output:
	// Name: Converted
	// Dimensions: 3 Fields by 3 Rows
	// +----------------+--------------------+-------------------------------+
	// | Name: Animal   | Name: Weight (lbs) | Name: Time                    |
	// | Labels:        | Labels:            | Labels:                       |
	// | Type: []string | Type: []float64    | Type: []time.Time             |
	// +----------------+--------------------+-------------------------------+
	// | sloth          | 3.5                | 2020-04-04 15:32:47 +0000 UTC |
	// | sloth          | 5.5                | 2020-04-05 15:32:47 +0000 UTC |
	// | sloth          | 7                  | 2020-04-06 15:32:47 +0000 UTC |
	// +----------------+--------------------+-------------------------------+
}
