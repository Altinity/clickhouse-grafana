package sqlutil_test

import (
	"database/sql"
	"fmt"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
)

func TestDefaultConverter(t *testing.T) {
	type Suite struct {
		Name     string
		Type     reflect.Type
		Nullable bool
		Expected sqlutil.Converter
	}

	suite := []Suite{
		{
			Name:     "non-nullable type",
			Type:     reflect.TypeOf(int64(0)),
			Nullable: false,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(int64(0)),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeInt64,
				},
			},
		},
		{
			Name:     "nullable int64",
			Type:     reflect.TypeOf(int64(0)),
			Nullable: true,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(sql.NullInt64{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeInt64.NullableType(),
				},
			},
		},
		{
			Name:     "string",
			Type:     reflect.TypeOf(""),
			Nullable: false,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(""),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeString,
				},
			},
		},
		{
			Name:     "nullable string",
			Type:     reflect.TypeOf(""),
			Nullable: true,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(sql.NullString{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeString.NullableType(),
				},
			},
		},
		{
			Name:     "string",
			Type:     reflect.TypeOf(time.Time{}),
			Nullable: false,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(time.Time{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeTime,
				},
			},
		},
		{
			Name:     "nullable time",
			Type:     reflect.TypeOf(time.Time{}),
			Nullable: true,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(sql.NullTime{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeTime.NullableType(),
				},
			},
		},
		{
			Name:     "nullable bool",
			Type:     reflect.TypeOf(false),
			Nullable: true,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(sql.NullBool{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeBool.NullableType(),
				},
			},
		},
		{
			Name:     "nullable sql bool",
			Type:     reflect.TypeOf(sql.NullBool{}),
			Nullable: true,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(sql.NullBool{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeBool.NullableType(),
				},
			},
		},
		{
			Name:     "nullable sql float",
			Type:     reflect.TypeOf(sql.NullFloat64{}),
			Nullable: true,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(sql.NullFloat64{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeFloat64.NullableType(),
				},
			},
		},
		{
			Name:     "nullable sql string",
			Type:     reflect.TypeOf(sql.NullString{}),
			Nullable: true,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(sql.NullString{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeString.NullableType(),
				},
			},
		},
		{
			Name:     "nullable sql time",
			Type:     reflect.TypeOf(sql.NullTime{}),
			Nullable: true,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(sql.NullTime{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeTime.NullableType(),
				},
			},
		},
		{
			Name:     "nullable sql time",
			Type:     reflect.TypeOf(sql.NullInt64{}),
			Nullable: true,
			Expected: sqlutil.Converter{
				InputScanType: reflect.TypeOf(sql.NullInt64{}),
				FrameConverter: sqlutil.FrameConverter{
					FieldType: data.FieldTypeInt64.NullableType(),
				},
			},
		},
	}

	for i, v := range suite {
		t.Run(fmt.Sprintf("[%d/%d] %s", i+1, len(suite), v.Name), func(t *testing.T) {
			c := sqlutil.NewDefaultConverter(v.Name, v.Nullable, v.Type)
			assert.Equal(t, c.FrameConverter.FieldType, v.Expected.FrameConverter.FieldType)
			assert.Equal(t, c.InputScanType.String(), v.Expected.InputScanType.String())

			t.Run("When the converter is called, the expected type should be returned", func(t *testing.T) {
				n := reflect.New(v.Expected.InputScanType).Interface()
				value, err := c.FrameConverter.ConverterFunc(n)
				assert.NoError(t, err)

				if !v.Nullable {
					// non-nullable fields should exactly match
					assert.Equal(t, reflect.TypeOf(value).String(), v.Type.String())
				} else {
					// nullable fields should not exactly match
					kind := reflect.PtrTo(v.Type).String()
					valueKind := reflect.TypeOf(value).String()
					if !strings.HasPrefix(kind, "*sql.Null") {
						assert.Equal(t, valueKind, kind)
					} else {
						valueType := strings.Replace(valueKind, "*", "", 1)
						valueType = strings.Split(valueType, ".")[0]
						assert.Contains(t, strings.ToLower(kind), valueType)
					}
				}
			})
		})
	}
}
