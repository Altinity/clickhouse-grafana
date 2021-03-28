package main

import (
	"regexp"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

var compoundTypeRegEx = regexp.MustCompile(`(Array|Tuple)\(([A-Za-z0-9,() ]+)\)`)
var seriesTypeRegEx = regexp.MustCompile(`Array\(Tuple\(String, ([A-Za-z0-9]+)\)\)`)

type ClickHouseFrame struct {
	RefId  string
	Name   string
	Fields []ClickHouseField
}

func NewFrame(refId string, name string, fieldsMeta []*FieldMeta, tz FetchTZ) *ClickHouseFrame {
	fields := make([]ClickHouseField, len(fieldsMeta))

	for i, meta := range fieldsMeta {
		// If this is a series tuple, where the meta looks like
		// Array(Tuple(String, UInt64))
		// Then instantiate a series type
		if strings.HasPrefix(meta.Type, "Array(Tuple(String,") {
			seriesMeta := seriesTypeRegEx.FindStringSubmatch(meta.Type)
			seriesType := seriesMeta[1]
			fields[i] = NewSeriesField(meta.Name, meta.Type, tz, seriesType)
			continue
		}

		// If this is a non-series compound type, where the meta looks like
		// Array(Int64)
		// or Array(Tuple(Int64, Int64))
		// Then instantiate a compound type
		if compoundTypeRegEx.MatchString(meta.Type) {
			fields[i] = NewCompoundField(meta.Name, meta.Type, tz)
			continue
		}

		// Default to a simple field
		fields[i] = NewSimpleField(meta.Name, meta.Type, tz)
	}

	frame := &ClickHouseFrame{
		RefId:  refId,
		Name:   name,
		Fields: fields,
	}

	return frame
}

func (f *ClickHouseFrame) getField(name string) ClickHouseField {
	for _, field := range f.Fields {
		if field != nil && field.FieldName() == name {
			return field
		}
	}

	return nil
}

func (f *ClickHouseFrame) AddRow(row map[string]interface{}) {
	for key, value := range row {
		field := f.getField(key)
		if field != nil {
			field.Append(value)
		}
	}
}

func (f *ClickHouseFrame) ToDataFrame() *data.Frame {
	// Get total number of frame fields
	numFields := 0
	for _, field := range f.Fields {
		numFields += field.Length()
	}

	fields := make([]*data.Field, numFields)

	// Loop through and flatten sub fields
	fieldIndex := 0
	for _, field := range f.Fields {
		flattened := field.Flatten()
		for _, f := range flattened {
			fields[fieldIndex] = f
			fieldIndex++
		}
	}

	frame := &data.Frame{
		RefID:  f.RefId,
		Name:   f.Name,
		Fields: fields,
	}

	return frame
}
