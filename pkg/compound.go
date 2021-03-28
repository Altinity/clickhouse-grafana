package main

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

type ClickHouseCompoundField struct {
	field *ClickHouseSimpleField

	Fields []*ClickHouseCompoundField
}

func NewCompoundField(name string, fieldType string, tz FetchTZ) ClickHouseField {
	root := &ClickHouseCompoundField{
		field: &ClickHouseSimpleField{
			Name:     name,
			Type:     fieldType,
			TimeZone: fetchTimeZone(fieldType, tz),
		},
	}

	field := root
	// Parser for compound types
	for compoundTypeRegEx.MatchString(fieldType) {
		compoundMeta := compoundTypeRegEx.FindStringSubmatch(fieldType)
		compoundType := compoundMeta[1]
		fieldType = compoundMeta[2]

		name += "-" + compoundType

		if field.Fields != nil {
			field = field.Fields[0]
		}

		field.Fields = make([]*ClickHouseCompoundField, 1)
		field.Fields[0] = &ClickHouseCompoundField{
			field: &ClickHouseSimpleField{
				Name:     name,
				Type:     compoundType,
				TimeZone: fetchTimeZone(compoundType, tz),
			},
		}
	}

	// Parse the last compound item
	compoundMeta := strings.Split(fieldType, ",")
	compoundParts := make([]*ClickHouseCompoundField, len(compoundMeta))
	for i := 0; i < len(compoundMeta); i++ {
		compoundType := strings.TrimSpace(compoundMeta[i])
		compoundParts[i] = &ClickHouseCompoundField{
			field: &ClickHouseSimpleField{
				Name:     name + "-" + compoundType,
				Type:     compoundType,
				TimeZone: fetchTimeZone(compoundType, tz),
			},
		}
	}

	field.Fields[0].Fields = compoundParts

	return root
}

func (f *ClickHouseCompoundField) Append(value interface{}) {
	// If it has sub fields, read value and pass through
	if len(f.Fields) > 0 {
		// We assume compound types will be a slice (array/tuple)
		slice := reflect.ValueOf(value)

		// Safety check
		if f.Fields != nil && slice.Len() == len(f.Fields) {
			for i := 0; i < slice.Len(); i++ {
				switch f.field.Type {
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
	v := ParseValue(f.field.Type, value, f.field.Name, f.field.TimeZone)
	if v == nil {
		backend.Logger.Warn(fmt.Sprintf("Value [%v / %v] wouldn't be added to Field", value, f.field.Type))
	} else {
		if f.field.FrameField == nil {
			f.field.FrameField = v.Field
		}

		f.field.FrameField.Append(v.Val)
	}
}

func (f *ClickHouseCompoundField) Flatten() []*data.Field {
	ret := make([]*data.Field, 0)
	for _, field := range f.Fields {
		ret = append(ret, field.Flatten()...)
	}

	if f.Fields == nil {
		return []*data.Field{f.field.FrameField}
	}

	return ret
}

func (f *ClickHouseCompoundField) Length() int {
	ret := 0

	for _, field := range f.Fields {
		ret += field.Length()
	}

	if f.Fields == nil {
		return 1
	}

	return ret
}

func (f *ClickHouseCompoundField) FieldName() string {
	return f.field.Name
}
