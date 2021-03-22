package main

import (
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"reflect"
	"regexp"
	"strings"
	"time"
)

var datePrefix = "Date"
var dateTimePrefix = "DateTime"
var timeZonePrefix = "('"
var dateTZPrefix = datePrefix + timeZonePrefix
var dateTimeTZPrefix = dateTimePrefix + timeZonePrefix
var compoundValueRegEx = regexp.MustCompile(`\[(.*)\]`)

type FetchTZ = func() *time.Location

func cutTimeZone(fieldType string) string {
	tz := ""

	if strings.HasPrefix(fieldType, dateTZPrefix) {
		tz = fieldType[len(dateTZPrefix)+1 : len(fieldType)-2]
	} else if strings.HasPrefix(fieldType, dateTimeTZPrefix) {
		tz = fieldType[len(dateTimeTZPrefix)+1 : len(fieldType)-2]
	}

	return strings.Trim(tz, " \t\v\n")
}

func fetchTimeZone(fieldType string, loadTZ FetchTZ) *time.Location {
	tz := cutTimeZone(fieldType)

	if tz != "" {
		return ParseTimeZone(tz)
	} else {
		return loadTZ()
	}
}

func NewField(name string, fieldType string, tz FetchTZ) *ClickHouseField {
	return &ClickHouseField{
		Name:     name,
		Type:     fieldType,
		TimeZone: fetchTimeZone(fieldType, tz),
	}
}

type ClickHouseField struct {
	FrameField *data.Field
	Name       string
	Type       string
	IsCompound bool
	Fields     []*ClickHouseField
	TimeZone   *time.Location
}

func (f *ClickHouseField) Value() {

}

func (f *ClickHouseField) Append(value interface{}) {
	// If compound type, pass the value through
	if f.IsCompound {
		// We assume compound types will be a slice (array/tuple)
		slice := reflect.ValueOf(value)

		// Safety check
		if f.Fields != nil && slice.Len() == len(f.Fields) {
			for i := 0; i < slice.Len(); i++ {
				switch f.Type {
				case "Array":
					fallthrough
				case "Tuple":
					f.Fields[i].Append(slice.Index(i).Interface())
				default:
					f.Fields[i].Append(value)
				}
			}
		}

		return
	}

	// Add value for simple type
	v := ParseValue(f.Type, value, f.Name, f.TimeZone)
	if v == nil {
		backend.Logger.Warn(fmt.Sprintf("Value [%v / %v] wouldn't be added to Field", value, f.Type))
	} else {
		if f.FrameField == nil {
			f.FrameField = v.Field
		}

		f.FrameField.Append(v.Val)
	}
}

func (f *ClickHouseField) Flatten() []*data.Field {
	ret := make([]*data.Field, 0)
	for _, field := range f.Fields {
		ret = append(ret, field.Flatten()...)
	}

	if f.Fields == nil {
		return []*data.Field{f.FrameField}
	}

	return ret
}

func (f *ClickHouseField) Length() int {
	ret := 0

	for _, field := range f.Fields {
		ret += field.Length()
	}

	if f.Fields == nil {
		return 1
	}

	return ret
}
