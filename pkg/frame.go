package main

import (
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

type ClickHouseFrame struct {
	RefId  string
	Name   string
	Fields []*ClickHouseField
}

func NewFrame(refId string, name string, fieldsMeta []*FieldMeta, tz FetchTZ) *ClickHouseFrame {
	fields := make([]*ClickHouseField, len(fieldsMeta))

	for i, meta := range fieldsMeta {
		fields[i] = NewField(meta.Name, meta.Type, tz)
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
	fields := make([]*data.Field, len(f.Fields))

	for i, field := range f.Fields {
		fields[i] = field.FrameField
	}

	frame := &data.Frame{
		RefID:  f.RefId,
		Name:   f.Name,
		Fields: fields,
	}

	return frame
}
