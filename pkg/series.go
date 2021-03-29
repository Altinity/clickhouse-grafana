package main

import (
	"fmt"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

type ClickHouseSeriesField struct {
	field *ClickHouseSimpleField

	Fields map[string]*ClickHouseSimpleField
	Order  []string
	Type   string
}

func NewSeriesField(name string, fieldType string, tz FetchTZ, seriesType string) ClickHouseField {
	return &ClickHouseSeriesField{
		field: &ClickHouseSimpleField{
			Name:     name,
			Type:     fieldType,
			TimeZone: fetchTimeZone(fieldType, tz),
		},
		Type:   seriesType,
		Fields: make(map[string]*ClickHouseSimpleField),
	}
}

func (f *ClickHouseSeriesField) Append(value interface{}) {
	// Parse series value [[name, value]]
	rawString := fmt.Sprintf("%v", value)
	parts := strings.Split(strings.TrimRight(strings.TrimLeft(rawString, "["), "]"), " ")
	name := strings.Join(parts[:len(parts)-1], " ")
	metric := parts[len(parts)-1]

	if _, exists := f.Fields[name]; !exists {
		f.Fields[name] = &ClickHouseSimpleField{
			Name:     name,
			Type:     f.Type,
			TimeZone: f.field.TimeZone,
		}
	}

	f.Fields[name].Append(metric)
}

func (f *ClickHouseSeriesField) Flatten() []*data.Field {
	ret := make([]*data.Field, f.Length())

	index := 0
	for _, field := range f.Fields {
		ret[index] = field.FrameField
		index++
	}

	return ret
}

func (f *ClickHouseSeriesField) Length() int {
	return len(f.Fields)
}

func (f *ClickHouseSeriesField) FieldName() string {
	return f.field.Name
}
