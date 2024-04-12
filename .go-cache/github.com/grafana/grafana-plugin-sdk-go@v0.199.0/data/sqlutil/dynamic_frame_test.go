package sqlutil

import (
	"database/sql"
	"reflect"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDynamicFrame(t *testing.T) {
	kind := &sql.ColumnType{}
	types := []*sql.ColumnType{}
	types = append(types, kind)
	converters := []Converter{}
	data := [][]interface{}{}
	mockRow := []interface{}{}
	val := string("foo")
	mockRow = append(mockRow, val)
	mockRow2 := []interface{}{}
	mockRow2 = append(mockRow2, "bar")
	data = append(data, mockRow)
	data = append(data, mockRow2)
	mock := &MockRows{
		data:  data,
		index: -1,
	}
	rows := Rows{
		itr: mock,
	}

	frame, err := frameDynamic(rows, 100, types, converters)
	assert.Nil(t, err)
	assert.NotNil(t, frame)

	assert.Equal(t, 2, frame.Rows())

	actual := frame.Fields[0].At(0).(*string)
	assert.Equal(t, val, *actual)

	actual = frame.Fields[0].At(1).(*string)
	assert.Equal(t, "bar", *actual)
}

type MockRows struct {
	data  [][]interface{}
	index int
}

func (rs *MockRows) Next() bool {
	rs.index++
	return rs.index < len(rs.data)
}

func (rs *MockRows) Scan(dest ...interface{}) error {
	data := rs.data[rs.index]
	for i, d := range dest {
		foo := d.(*interface{})
		val := reflect.ValueOf(foo)
		if val.Kind() != reflect.Ptr {
			panic("val must be a pointer")
		}
		val.Elem().Set(reflect.ValueOf(data[i]))
	}
	return nil
}
