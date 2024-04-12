// Copyright 2022 PerimeterX. All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

package marshmallow

import (
	"github.com/go-test/deep"
	"reflect"
	"strings"
	"testing"
)

func TestUnmarshalFromJSONMapInputVariations(t *testing.T) {
	EnableCache()
	tests := []struct {
		name                string
		mode                Mode
		expectedErr         bool
		expectedResult      bool
		structModifier      func(*parentStruct)
		inputMapModifier    func(map[string]interface{})
		expectedMapModifier func(map[string]interface{})
	}{
		{
			name:                "ModeFailOnFirstError_happy_flow",
			mode:                ModeFailOnFirstError,
			expectedErr:         false,
			expectedResult:      true,
			structModifier:      nil,
			inputMapModifier:    nil,
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_zero_struct_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier:    nil,
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_null_on_struct",
			mode:           ModeFailOnFirstError,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = nil
			},
		},
		{
			name:           "ModeFailOnFirstError_null_on_string",
			mode:           ModeFailOnFirstError,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field1"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField1 = ""
			},
		},
		{
			name:           "ModeFailOnFirstError_null_on_slice",
			mode:           ModeFailOnFirstError,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field30"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField30 = nil
			},
		},
		{
			name:           "ModeFailOnFirstError_null_on_array",
			mode:           ModeFailOnFirstError,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field31"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField31 = [4]string{}
			},
		},
		{
			name:           "ModeFailOnFirstError_null_on_map",
			mode:           ModeFailOnFirstError,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField7 = nil
			},
			inputMapModifier: nil,
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = nil
			},
		},
		{
			name:           "ModeFailOnFirstError_invalid_struct_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = 12
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_struct_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field2"] = 12
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_slice_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field3"] = 12
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_array_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field4"] = 12
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_ptr_slice_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field5"] = 12
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_ptr_array_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field6"] = 12
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_primitive_map_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = 12
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_struct_map_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field8"] = 12
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_struct_ptr_map_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field9"] = 12
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_string_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field1"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_bool_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field2"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field3"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int8_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field4"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int16_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field5"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int32_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field6"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int64_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field7"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field8"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint8_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field9"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint16_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field10"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint32_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field11"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint64_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field12"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_float32_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field13"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_float64_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field14"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_string_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field15"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_bool_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field16"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field17"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int8_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field18"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int16_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field19"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int32_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field20"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_int64_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field21"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field22"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint8_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field23"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint16_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field24"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint32_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field25"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_uint64_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field26"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_float32_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field27"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_float64_ptr_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field28"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_string_slice_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field30"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_string_array_value",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field31"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_slice_element",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field3"] = []interface{}{nil, "foo", nil, nil}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_array_element",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field4"] = []interface{}{nil, "foo", nil, nil}
			},
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOnFirstError_invalid_map_entry",
			mode:           ModeFailOnFirstError,
			expectedErr:    true,
			expectedResult: false,
			structModifier: nil,
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = map[string]interface{}{"foo": "a", "goo": 12, "boo": "c"}
			},
			expectedMapModifier: nil,
		},
		{
			name:                "ModeAllowMultipleErrors_happy_flow",
			mode:                ModeAllowMultipleErrors,
			expectedErr:         false,
			expectedResult:      true,
			structModifier:      nil,
			inputMapModifier:    nil,
			expectedMapModifier: nil,
		},
		{
			name:           "ModeAllowMultipleErrors_zero_struct_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier:    nil,
			expectedMapModifier: nil,
		},
		{
			name:           "ModeAllowMultipleErrors_null_on_struct",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_null_on_string",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field1"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField1 = ""
			},
		},
		{
			name:           "ModeAllowMultipleErrors_null_on_slice",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field30"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField30 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_null_on_array",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field31"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField31 = [4]string{}
			},
		},
		{
			name:           "ModeAllowMultipleErrors_null_on_map",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField7 = nil
			},
			inputMapModifier: nil,
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_struct_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				delete(m, "parent_field1")
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_struct_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField2 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field2"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				delete(m, "parent_field2")
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_slice_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField3 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field3"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				delete(m, "parent_field3")
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_array_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField4 = [4]childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field4"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				delete(m, "parent_field4")
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_ptr_slice_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField5 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field5"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				delete(m, "parent_field5")
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_ptr_array_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField6 = [4]*childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field6"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				delete(m, "parent_field6")
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_primitive_map_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField7 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				delete(m, "parent_field7")
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_struct_map_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField8 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field8"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				delete(m, "parent_field8")
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_struct_ptr_map_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField9 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field9"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				delete(m, "parent_field9")
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_string_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField1 = ""
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field1"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField1 = ""
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_bool_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField2 = false
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field2"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField2 = false
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField3 = 0
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field3"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField3 = 0
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int8_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField4 = int8(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field4"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField4 = int8(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int16_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField5 = int16(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field5"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField5 = int16(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int32_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField6 = int32(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field6"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField6 = int32(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int64_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField7 = int64(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field7"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField7 = int64(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField8 = uint(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field8"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField8 = uint(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint8_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField9 = uint8(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field9"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField9 = uint8(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint16_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField10 = uint16(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field10"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField10 = uint16(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint32_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField11 = uint32(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field11"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField11 = uint32(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint64_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField12 = uint64(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field12"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField12 = uint64(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_float32_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField13 = float32(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field13"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField13 = float32(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_float64_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField14 = float64(0)
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field14"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField14 = float64(0)
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_string_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField15 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field15"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField15 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_bool_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField16 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field16"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField16 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField17 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field17"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField17 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int8_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField18 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field18"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField18 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int16_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField19 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field19"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField19 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int32_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField20 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field20"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField20 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_int64_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField21 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field21"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField21 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField22 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field22"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField22 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint8_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField23 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field23"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField23 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint16_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField24 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field24"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField24 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint32_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField25 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field25"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField25 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_uint64_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField26 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field26"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField26 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_float32_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField27 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field27"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField27 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_float64_ptr_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField28 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field28"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField28 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_string_slice_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField30 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field30"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField30 = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_string_array_value",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1.ChildField31 = [4]string{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field31"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField31 = [4]string{}
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_slice_element",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField3 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field3"] = []interface{}{nil, "foo", nil, nil}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field3"] = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_array_element",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField4 = [4]childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field4"] = []interface{}{nil, "foo", nil, nil}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field4"] = nil
			},
		},
		{
			name:           "ModeAllowMultipleErrors_invalid_map_entry",
			mode:           ModeAllowMultipleErrors,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField7 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = map[string]interface{}{"foo": "a", "goo": 12, "boo": "c"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = nil
			},
		},
		{
			name:                "ModeFailOverToOriginalValue_happy_flow",
			mode:                ModeFailOverToOriginalValue,
			expectedErr:         false,
			expectedResult:      true,
			structModifier:      nil,
			inputMapModifier:    nil,
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOverToOriginalValue_zero_struct_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier:    nil,
			expectedMapModifier: nil,
		},
		{
			name:           "ModeFailOverToOriginalValue_null_on_struct",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = nil
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_null_on_string",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field1"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField1 = ""
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_null_on_slice",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field30"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField30 = nil
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_null_on_array",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field31"] = nil
			},
			expectedMapModifier: func(m map[string]interface{}) {
				c := m["parent_field1"].(childStruct)
				c.ChildField31 = [4]string{}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_null_on_map",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField7 = nil
			},
			inputMapModifier: nil,
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = nil
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_struct_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = float64(12)
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_struct_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField2 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field2"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field2"] = float64(12)
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_slice_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField3 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field3"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field3"] = float64(12)
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_array_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField4 = [4]childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field4"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field4"] = float64(12)
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_ptr_slice_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField5 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field5"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field5"] = float64(12)
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_ptr_array_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField6 = [4]*childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field6"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field6"] = float64(12)
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_primitive_map_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField7 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = float64(12)
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_struct_map_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField8 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field8"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field8"] = float64(12)
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_struct_ptr_map_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField9 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field9"] = 12
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field9"] = float64(12)
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_string_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field1"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field1"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_bool_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field2"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field2"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field3"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field3"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int8_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field4"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field4"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int16_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field5"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field5"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int32_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field6"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field6"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int64_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field7"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field7"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field8"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field8"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint8_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field9"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field9"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint16_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field10"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field10"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint32_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field11"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field11"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint64_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field12"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field12"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_float32_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field13"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field13"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_float64_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field14"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field14"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_string_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field15"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field15"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_bool_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field16"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field16"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field17"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field17"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int8_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field18"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field18"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int16_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field19"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field19"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int32_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field20"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field20"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_int64_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field21"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field21"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field22"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field22"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint8_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field23"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field23"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint16_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field24"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field24"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint32_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field25"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field25"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_uint64_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field26"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field26"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_float32_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field27"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field27"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_float64_ptr_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field28"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field28"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_string_slice_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field30"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field30"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_string_array_value",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"].(map[string]interface{})["child_field31"] = map[string]interface{}{"foo": "boo"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = toMap(m["parent_field1"])
				m["parent_field1"].(map[string]interface{})["child_field31"] = map[string]interface{}{"foo": "boo"}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_slice_element",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField3 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field3"] = []interface{}{nil, "foo", nil, nil}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field3"] = []interface{}{nil, "foo", nil, nil}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_array_element",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField4 = [4]childStruct{}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field4"] = []interface{}{nil, "foo", nil, nil}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field4"] = []interface{}{nil, "foo", nil, nil}
			},
		},
		{
			name:           "ModeFailOverToOriginalValue_invalid_map_entry",
			mode:           ModeFailOverToOriginalValue,
			expectedErr:    true,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField7 = nil
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = map[string]interface{}{"foo": "a", "goo": 12, "boo": "c"}
			},
			expectedMapModifier: func(m map[string]interface{}) {
				m["parent_field7"] = map[string]interface{}{"foo": "a", "goo": float64(12), "boo": "c"}
			},
		},
		{
			name:           "nested_unknown_fields",
			mode:           ModeFailOnFirstError,
			expectedErr:    false,
			expectedResult: true,
			structModifier: func(p *parentStruct) {
				p.ParentField1 = childStruct{
					ChildField1: "a",
				}
			},
			inputMapModifier: func(m map[string]interface{}) {
				m["parent_field1"] = map[string]interface{}{"child_field1": "a", "foo": "f", "boo": "b"}
			},
			expectedMapModifier: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expectedStruct := buildParentStruct()
			if tt.structModifier != nil {
				tt.structModifier(expectedStruct)
			}
			input := toMap(expectedStruct)
			for k, v := range extraData {
				input[k] = v
			}
			if tt.inputMapModifier != nil {
				tt.inputMapModifier(input)
			}
			actualStruct := &parentStruct{}
			actualMap, err := UnmarshalFromJSONMap(input, actualStruct, WithMode(tt.mode))
			if (err != nil) != tt.expectedErr {
				t.Errorf("Unmarshal() error = %v, expectedErr %v", err, tt.expectedErr)
			}
			if tt.expectedResult {
				expectedStruct.ParentField10.CustomField = "UnmarshalJSON called"
				expectedStruct.ParentField11.CustomField = "UnmarshalJSON called"
				if diff := deep.Equal(actualStruct, expectedStruct); diff != nil {
					t.Errorf("Unmarshal() struct mismatch (actual, expected):\n%s", strings.Join(diff, "\n"))
				}
				expectedMap := make(map[string]interface{})
				for k, v := range extraData {
					expectedMap[k] = v
				}
				structValue := reflectStructValue(actualStruct)
				for name, refInfo := range mapStructFields(actualStruct) {
					field := refInfo.field(structValue)
					expectedMap[name] = field.Interface()
				}
				if tt.expectedMapModifier != nil {
					tt.expectedMapModifier(expectedMap)
				}
				if tt.mode == ModeFailOverToOriginalValue {
					normalizeMapTypes(actualMap)
				}
				if diff := deep.Equal(actualMap, expectedMap); diff != nil {
					t.Errorf("Unmarshal() map mismatch (actual, expected):\n%s", strings.Join(diff, "\n"))
				}
			} else {
				if reflect.DeepEqual(actualStruct, expectedStruct) {
					t.Error("Unmarshal() expected parsing to break before finished")
				}
				if actualMap != nil {
					t.Errorf("Unmarshal() expected actual map to not exist")
				}
			}
		})
	}
}

func TestUnmarshalFromJSONMapSpecialInput(t *testing.T) {
	tests := []struct {
		name         string
		input        map[string]interface{}
		v            interface{}
		mode         Mode
		result       bool
		errValidator func(error) bool
	}{
		{
			name:   "invalid_value",
			input:  map[string]interface{}{},
			v:      "",
			mode:   ModeFailOnFirstError,
			result: false,
			errValidator: func(err error) bool {
				return err == ErrInvalidValue
			},
		},
		{
			name:   "null_input",
			input:  nil,
			v:      &parentStruct{},
			mode:   ModeFailOnFirstError,
			result: true,
			errValidator: func(err error) bool {
				return err == nil
			},
		},
		{
			name:   "ModeFailOnFirstError_custom_unmarshal_failing",
			input:  map[string]interface{}{"field": ""},
			v:      &failingCustomUnmarshalerParent{},
			mode:   ModeFailOnFirstError,
			result: false,
			errValidator: func(err error) bool {
				return err.Error() == "failing"
			},
		},
		{
			name:   "ModeAllowMultipleErrors_custom_unmarshal_failing",
			input:  map[string]interface{}{"field": ""},
			v:      &failingCustomUnmarshalerParent{},
			mode:   ModeAllowMultipleErrors,
			result: true,
			errValidator: func(err error) bool {
				e, ok := err.(*MultipleError)
				if !ok {
					return false
				}
				if len(e.Errors) != 1 {
					return false
				}
				return e.Errors[0].Error() == "failing"
			},
		},
		{
			name:   "ModeFailOverToOriginalValue_custom_unmarshal_failing",
			input:  map[string]interface{}{"field": ""},
			v:      &failingCustomUnmarshalerParent{},
			mode:   ModeFailOverToOriginalValue,
			result: true,
			errValidator: func(err error) bool {
				e, ok := err.(*MultipleError)
				if !ok {
					return false
				}
				if len(e.Errors) != 1 {
					return false
				}
				return e.Errors[0].Error() == "failing"
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := UnmarshalFromJSONMap(tt.input, tt.v, WithMode(tt.mode))
			if !tt.errValidator(err) {
				t.Errorf("Unmarshal() unexpected error = %v", err)
				return
			}
			if tt.result {
				if got == nil {
					t.Error("Unmarshal() expected result exists")
					return
				}
			} else {
				if got != nil {
					t.Error("Unmarshal() expected result not exists")
					return
				}
			}
		})
	}
}

func TestUnmarshalFromJSONMapEmbedding(t *testing.T) {
	t.Run("test_embedded_values", func(t *testing.T) {
		p := embeddingParent{}
		result, err := UnmarshalFromJSONMap(map[string]interface{}{"field": "value"}, &p)
		if err != nil {
			t.Errorf("unexpected error %v", err)
		}
		if p.Field != "value" {
			t.Errorf("missing embedded value in struct %+v", p)
		}
		if len(result) != 1 || result["field"] != "value" {
			t.Errorf("missing embedded value in map %+v", result)
		}
	})
}

func TestUnmarshalFromJSONMapJSONDataHandler(t *testing.T) {
	t.Run("test_JSONDataHandler", func(t *testing.T) {
		data := map[string]interface{}{
			"known":   "foo",
			"unknown": "boo",
			"nested1": map[string]interface{}{
				"known":   "goo",
				"unknown": "doo",
			},
			"nested2": map[string]interface{}{
				"known":   "goo",
				"unknown": "doo",
			},
		}
		p := &handleJSONDataParent{}
		result, err := UnmarshalFromJSONMap(data, p)
		if err != nil {
			t.Errorf("unexpected error %v", err)
		}
		_, ok := result["nested1"].(handleJSONDataChild)
		if !ok {
			t.Error("invalid map value")
		}
		if p.Nested1.Data == nil {
			t.Error("HandleJSONData not called")
		}
		if len(p.Nested1.Data) != 2 || p.Nested1.Data["known"] != "goo" || p.Nested1.Data["unknown"] != "doo" {
			t.Error("invalid JSON data")
		}
		_, ok = result["nested2"].(handleJSONDataChild)
		if !ok {
			t.Error("invalid map value")
		}
		if p.Nested2.Data == nil {
			t.Error("HandleJSONData not called")
		}
		if len(p.Nested2.Data) != 2 || p.Nested2.Data["known"] != "goo" || p.Nested2.Data["unknown"] != "doo" {
			t.Error("invalid JSON data")
		}
	})
	t.Run("test_JSONDataHandler_single_error", func(t *testing.T) {
		data := map[string]interface{}{
			"known":   "foo",
			"unknown": "boo",
			"nested1": map[string]interface{}{"known": "goo", "unknown": "doo", "fail": true},
			"nested2": map[string]interface{}{"known": "goo", "unknown": "doo", "fail": true},
		}
		p := &handleJSONDataParent{}
		_, err := UnmarshalFromJSONMap(data, p)
		if err == nil {
			t.Errorf("expected JSONDataHandler error %v", err)
		}
		if err.Error() != "HandleJSONData failure" {
			t.Errorf("unexpected JSONDataHandler error type %v", err)
		}
	})
	t.Run("test_JSONDataHandler_multiple_error", func(t *testing.T) {
		data := map[string]interface{}{
			"known":   "foo",
			"unknown": "boo",
			"nested1": map[string]interface{}{"known": "goo", "unknown": "doo", "fail": true},
			"nested2": map[string]interface{}{"known": "goo", "unknown": "doo", "fail": true},
		}
		p := &handleJSONDataParent{}
		_, err := UnmarshalFromJSONMap(data, p, WithMode(ModeAllowMultipleErrors))
		if err == nil {
			t.Errorf("expected JSONDataHandler error %v", err)
		}
		e, ok := err.(*MultipleError)
		if !ok {
			t.Errorf("unexpected JSONDataHandler error type %v", err)
		}
		for _, currentError := range e.Errors {
			if currentError.Error() != "HandleJSONData failure" {
				t.Errorf("unexpected JSONDataHandler error type %v", err)
			}
		}
	})
	t.Run("test_JSONDataHandler_deprecated", func(t *testing.T) {
		data := map[string]interface{}{
			"known":   "foo",
			"unknown": "boo",
			"nested": map[string]interface{}{
				"known":   "goo",
				"unknown": "doo",
			},
		}
		p := &handleJSONDataDeprecatedParent{}
		result, err := UnmarshalFromJSONMap(data, p)
		if err != nil {
			t.Errorf("unexpected error %v", err)
		}
		_, ok := result["nested"].(handleJSONDataDeprecatedChild)
		if !ok {
			t.Error("invalid map value")
		}
		if p.Nested.Data == nil {
			t.Error("HandleJSONData not called")
		}
		if len(p.Nested.Data) != 2 || p.Nested.Data["known"] != "goo" || p.Nested.Data["unknown"] != "doo" {
			t.Error("invalid JSON data")
		}
	})
}

func TestUnmarshalFromJSONMapExcludeKnownFieldsFromMap(t *testing.T) {
	t.Run("test_exclude_known_fields_from_map_with_empty_map", func(t *testing.T) {
		p := Person{}
		result, err := UnmarshalFromJSONMap(
			map[string]interface{}{
				"firstName": "string_firstName",
				"lastName":  "string_LastName",
			},
			&p,
			WithExcludeKnownFieldsFromMap(true),
		)
		if err != nil {
			t.Errorf("unexpected error %v", err)
		}
		if len(result) != 0 {
			t.Errorf("failure in excluding untyped fields")
		}
	})

	t.Run("test_exclude_known_fields_from_map", func(t *testing.T) {
		p := Person{}
		result, err := UnmarshalFromJSONMap(
			map[string]interface{}{
				"firstName": "string_firstName",
				"lastName":  "string_LastName",
				"unknown":   "string_unknown",
			},
			&p,
			WithExcludeKnownFieldsFromMap(true),
		)
		if err != nil {
			t.Errorf("unexpected error %v", err)
		}
		if len(result) != 1 {
			t.Errorf("failure in excluding fields")
		}

		_, exists := result["unknown"]
		if !exists {
			t.Errorf("unknown field is missing in the result")
		}
	})
}

func TestUnmarshalFromJSONMapNestedSkipPopulate(t *testing.T) {
	t.Run("TestUnmarshalFromJSONMapNestedSkipPopulate", func(t *testing.T) {
		p := &nestedSkipPopulateParent{}
		result, err := UnmarshalFromJSONMap(
			map[string]interface{}{"child": map[string]interface{}{"foo": "value"}},
			p,
			WithSkipPopulateStruct(true),
		)
		if err != nil {
			t.Errorf("unexpected error %v", err)
		}
		value, exists := result["child"]
		if !exists {
			t.Error("missing child element in result map")
		}
		child, ok := value.(nestedSkipPopulateChild)
		if !ok {
			t.Errorf("invalid child type %T in result map", child)
		}
		if child.Foo != "value" {
			t.Errorf("invalid value '%s' in child", child.Foo)
		}
	})
	t.Run("TestUnmarshalFromJSONMapNestedSkipPopulate_with_ModeFailOverToOriginalValue", func(t *testing.T) {
		p := &nestedSkipPopulateParent{}
		result, err := UnmarshalFromJSONMap(
			map[string]interface{}{"child": map[string]interface{}{"foo": float64(12)}},
			p,
			WithMode(ModeFailOverToOriginalValue),
			WithSkipPopulateStruct(true),
		)
		if err == nil {
			t.Error("expected error")
		}
		value, exists := result["child"]
		if !exists {
			t.Error("missing child element in result map")
		}
		child, ok := value.(map[string]interface{})
		if !ok {
			t.Errorf("invalid child type %T in result map", child)
		}
		if child["foo"] != float64(12) {
			t.Errorf("invalid value '%v' in child", child["foo"])
		}
	})
	t.Run("TestUnmarshalFromJSONMapNestedSkipPopulate_all_fields_exist_in_root_struct", func(t *testing.T) {
		s := &failOverStruct{}
		result, err := UnmarshalFromJSONMap(
			map[string]interface{}{"a": "a_val", "b": float64(12), "c": "c_val"},
			s,
			WithMode(ModeFailOverToOriginalValue),
			WithSkipPopulateStruct(true),
		)
		if err == nil {
			t.Error("expected error")
		}
		if result["a"] != "a_val" {
			t.Errorf("invalid value '%v' in a", result["a"])
		}
		if result["b"] != float64(12) {
			t.Errorf("invalid value '%v' in a", result["b"])
		}
		if result["c"] != "c_val" {
			t.Errorf("invalid value '%v' in a", result["c"])
		}
	})
	t.Run("TestUnmarshalFromJSONMapNestedSkipPopulate_all_fields_exist_in_nested_struct", func(t *testing.T) {
		s := &failOverParent{}
		result, err := UnmarshalFromJSONMap(
			map[string]interface{}{"child": map[string]interface{}{"a": "a_val", "b": float64(12), "c": "c_val"}},
			s,
			WithMode(ModeFailOverToOriginalValue),
			WithSkipPopulateStruct(true),
		)
		if err == nil {
			t.Error("expected error")
		}
		val, ok := result["child"]
		if !ok {
			t.Error("missing child in result value")
		}
		child, ok := val.(map[string]interface{})
		if !ok {
			t.Error("invalid child type in result value")
		}
		if child["a"] != "a_val" {
			t.Errorf("invalid value '%v' in a", child["a"])
		}
		if child["b"] != float64(12) {
			t.Errorf("invalid value '%v' in a", child["b"])
		}
		if child["c"] != "c_val" {
			t.Errorf("invalid value '%v' in a", child["c"])
		}
	})
}
