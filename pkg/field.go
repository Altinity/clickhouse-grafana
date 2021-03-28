package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

var datePrefix = "Date"
var dateTimePrefix = "DateTime"
var timeZonePrefix = "('"
var dateTZPrefix = datePrefix + timeZonePrefix
var dateTimeTZPrefix = dateTimePrefix + timeZonePrefix

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

func NewSimpleField(name string, fieldType string, tz FetchTZ) ClickHouseField {
	return &ClickHouseSimpleField{
		Name:     name,
		Type:     fieldType,
		TimeZone: fetchTimeZone(fieldType, tz),
	}
}

type ClickHouseField interface {
	Flatten() []*data.Field
	Append(value interface{})
	Length() int
	FieldName() string
}

type ClickHouseSimpleField struct {
	FrameField *data.Field
	Name       string
	Type       string
	TimeZone   *time.Location
}

func (f *ClickHouseSimpleField) Append(value interface{}) {
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

func (f *ClickHouseSimpleField) Flatten() []*data.Field {
	return []*data.Field{f.FrameField}
}

func (f *ClickHouseSimpleField) Length() int {
	return 1
}

func (f *ClickHouseSimpleField) FieldName() string {
	return f.Name
}
