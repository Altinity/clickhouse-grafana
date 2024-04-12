package framestruct

import (
	"fmt"
	"reflect"
	"time"
)

func sliceFor(value interface{}) (interface{}, error) {
	switch v := value.(type) {
	case int8:
		return []*int8{}, nil
	case *int8:
		return []*int8{}, nil
	case int16:
		return []*int16{}, nil
	case *int16:
		return []*int16{}, nil
	case int32:
		return []*int32{}, nil
	case *int32:
		return []*int32{}, nil
	case int64:
		return []*int64{}, nil
	case *int64:
		return []*int64{}, nil
	case uint8:
		return []*uint8{}, nil
	case *uint8:
		return []*uint8{}, nil
	case uint16:
		return []*uint16{}, nil
	case *uint16:
		return []*uint16{}, nil
	case uint32:
		return []*uint32{}, nil
	case *uint32:
		return []*uint32{}, nil
	case uint64:
		return []*uint64{}, nil
	case *uint64:
		return []*uint64{}, nil
	case float32:
		return []*float32{}, nil
	case *float32:
		return []*float32{}, nil
	case float64:
		return []*float64{}, nil
	case *float64:
		return []*float64{}, nil
	case string:
		return []*string{}, nil
	case *string:
		return []*string{}, nil
	case bool:
		return []*bool{}, nil
	case *bool:
		return []*bool{}, nil
	case time.Time:
		return []*time.Time{}, nil
	case *time.Time:
		return []*time.Time{}, nil
	default:
		return nil, fmt.Errorf("unsupported type %T", v)
	}
}

func toPointer(value interface{}) interface{} {
	switch v := value.(type) {
	case int8:
		return &v
	case *int8:
		return value
	case int16:
		return &v
	case *int16:
		return value
	case int32:
		return &v
	case *int32:
		return value
	case int64:
		return &v
	case *int64:
		return value
	case uint8:
		return &v
	case *uint8:
		return value
	case uint16:
		return &v
	case *uint16:
		return value
	case uint32:
		return &v
	case *uint32:
		return value
	case uint64:
		return &v
	case *uint64:
		return value
	case float32:
		return &v
	case *float32:
		return value
	case float64:
		return &v
	case *float64:
		return value
	case string:
		return &v
	case *string:
		return value
	case bool:
		return &v
	case *bool:
		return value
	case time.Time:
		return &v
	case *time.Time:
		return value
	default:
		return nil
	}
}

func supportedToplevelType(v reflect.Value) bool {
	switch v.Kind() {
	case reflect.Slice:
		if v.Len() > 0 {
			return supportedToplevelType(v.Index(0))
		}
		return true
	case reflect.Struct:
		_, ok := v.Interface().(time.Time)
		if ok {
			return false // times are structs, but not toplevel ones
		}
		return true
	default:
		return v.Kind() == reflect.Map
	}
}
