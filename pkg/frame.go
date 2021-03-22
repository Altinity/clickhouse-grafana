package main

import (
	"regexp"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

var compoundTypeRegEx = regexp.MustCompile(`(Array|Tuple)\(([A-Za-z0-9,() ]+)\)`)

type ClickHouseFrame struct {
	RefId  string
	Name   string
	Fields []*ClickHouseField
}

func NewFrame(refId string, name string, fieldsMeta []*FieldMeta, tz FetchTZ) *ClickHouseFrame {
	fields := make([]*ClickHouseField, len(fieldsMeta))

	for i, meta := range fieldsMeta {
		fields[i] = NewField(meta.Name, meta.Type, tz)

		field := fields[i]
		fieldType := meta.Type
		compoundName := meta.Name
		for compoundTypeRegEx.MatchString(fieldType) {
			compoundMeta := compoundTypeRegEx.FindStringSubmatch(fieldType)
			compoundType := compoundMeta[1]
			fieldType = compoundMeta[2]

			compoundName += "-" + compoundType

			if field.Fields != nil {
				field = field.Fields[0]
			}

			field.IsCompound = true
			field.Fields = make([]*ClickHouseField, 1)
			field.Fields[0] = NewField(compoundName, compoundType, tz)
		}

		// Parse the last compound item
		if field.IsCompound {
			compoundMeta := strings.Split(fieldType, ",")
			compoundParts := make([]*ClickHouseField, len(compoundMeta))
			for i := 0; i < len(compoundMeta); i++ {
				compoundType := strings.TrimSpace(compoundMeta[i])
				compoundParts[i] = NewField(compoundName+"-"+compoundType, compoundType, tz)
			}
			field.Fields[0].IsCompound = true
			field.Fields[0].Fields = compoundParts
		}
	}

	frame := &ClickHouseFrame{
		RefId:  refId,
		Name:   name,
		Fields: fields,
	}

	return frame
}

func (f *ClickHouseFrame) getField(name string) *ClickHouseField {
	for _, field := range f.Fields {
		if field != nil && field.Name == name {
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
	// Extract fields length with compound fields
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
