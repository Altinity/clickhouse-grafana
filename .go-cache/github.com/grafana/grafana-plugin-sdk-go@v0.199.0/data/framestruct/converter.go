package framestruct

import (
	"errors"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

const frameTag = "frame"

type converter struct {
	fieldNames []string
	fields     map[string]*data.Field
	tags       []string
	anyMap     bool
	col0       string
	maxLen     int
	converters map[string]FieldConverter
}

// ToDataFrame flattens an arbitrary struct or slice of structs into a *data.Frame
func ToDataFrame(name string, toConvert interface{}, opts ...FramestructOption) (*data.Frame, error) {
	cr := &converter{
		fields:     make(map[string]*data.Field),
		tags:       make([]string, 3),
		converters: make(map[string]FieldConverter),
	}

	for _, o := range opts {
		o(cr)
	}

	return cr.toDataframe(name, toConvert)
}

// ToDataFrames is a convenience wrapper around ToDataFrame. It will wrap the
// converted DataFrame in a data.Frames. Additionally, if the passed type
// satisfies the data.Framer interface, the function will delegate to that
// for the type conversion. If this function delegates to a data.Framer, it
// will use the data.Frame name defined by the type rather than passed to this
// function
func ToDataFrames(name string, toConvert interface{}, opts ...FramestructOption) (data.Frames, error) {
	framer, ok := toConvert.(data.Framer)
	if ok {
		return framer.Frames()
	}

	frame, err := ToDataFrame(name, toConvert, opts...)
	if err != nil {
		return nil, err
	}

	return []*data.Frame{frame}, nil
}

// FieldConverter is a function that takes the value of a field, converts it,
// and returns the new value as an interface
type FieldConverter func(interface{}) (interface{}, error)

// FramestructOption takes a converter and applies some configuration to it
//
//nolint:revive
type FramestructOption func(cr *converter)

// WithConverterFor configures a FieldConverter for a field with the name
// fieldname. This converter will be applied to fields _after_ the name structag
// is applied.
func WithConverterFor(fieldname string, c FieldConverter) FramestructOption {
	return func(cr *converter) {
		cr.converters[fieldname] = c
	}
}

// WithColumn0 specifies the 0th column of the returned Data Frame. Using this
// option will override any `col0` framestruct tags that have been set. This is
// most useful when marshalling maps
func WithColumn0(fieldname string) FramestructOption {
	return func(cr *converter) {
		cr.col0 = fieldname
	}
}

func (c *converter) toDataframe(name string, toConvert interface{}) (*data.Frame, error) {
	v := c.ensureValue(reflect.ValueOf(toConvert))
	if !supportedToplevelType(v) {
		return nil, errors.New("unsupported type: can only convert structs, slices, and maps")
	}

	if err := c.handleValue(v, "", ""); err != nil {
		return nil, err
	}

	return c.createFrame(name), nil
}

func (c *converter) ensureValue(v reflect.Value) reflect.Value {
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	return v
}

func (c *converter) handleValue(field reflect.Value, tags, fieldName string) error {
	switch field.Kind() {
	case reflect.Slice:
		return c.convertSlice(field, fieldName)
	case reflect.Struct:
		return c.convertStruct(field, fieldName)
	case reflect.Map:
		return c.convertMap(field.Interface(), tags, fieldName)
	default:
		return c.upsertField(field, fieldName)
	}
}

func (c *converter) convertStruct(field reflect.Value, fieldName string) error {
	_, ok := field.Interface().(time.Time)
	if ok {
		return c.upsertField(field, fieldName)
	}

	return c.convertStructFields(field, fieldName)
}

func (c *converter) convertSlice(s reflect.Value, prefix string) error {
	for i := 0; i < s.Len(); i++ {
		c.maxLen++
		v := s.Index(i)
		switch v.Kind() {
		case reflect.Map:
			if err := c.convertMap(v.Interface(), "", prefix); err != nil {
				return err
			}
		default:
			if err := c.convertStruct(v, prefix); err != nil {
				return err
			}
		}
	}
	return nil
}

func (c *converter) convertStructFields(v reflect.Value, prefix string) error {
	if v.Kind() != reflect.Struct {
		return errors.New("unsupported type: converted types may not contain slices")
	}

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		if !exported(field) {
			continue
		}

		structField := v.Type().Field(i)
		tags := structField.Tag.Get(frameTag)

		if tags == "-" {
			continue
		}

		fieldName := c.fieldName(structField.Name, tags, prefix)
		if err := c.handleValue(field, tags, fieldName); err != nil {
			return err
		}

		c.parseTags(tags)
		if c.tags[2] != "" {
			c.col0 = fieldName
		}
	}
	return nil
}

func exported(v reflect.Value) bool {
	return v.CanInterface()
}

func (c *converter) convertMap(toConvert interface{}, tags, prefix string) error {
	c.anyMap = true
	m, ok := toConvert.(map[string]interface{})
	if !ok {
		m = make(map[string]interface{})
		vals := reflect.ValueOf(toConvert).MapRange()
		for vals.Next() {
			k := vals.Key()
			if _, ok := k.Interface().(string); !ok {
				return errors.New("maps must have string keys")
			}
			m[k.String()] = vals.Value().Interface()
		}
	}

	for _, name := range sortedKeys(m) {
		value := m[name]
		if value == nil {
			// skip nil values (as they will lead to "nil" values later on anyways);
			// and the reflection code below crashes on nil.
			continue
		}
		fieldName := c.fieldName(name, tags, prefix)
		v := c.ensureValue(reflect.ValueOf(value))
		if err := c.handleValue(v, "", fieldName); err != nil {
			return err
		}
	}

	return nil
}

func sortedKeys(m map[string]interface{}) []string {
	keys := make([]string, len(m))

	var idx int
	for key := range m {
		keys[idx] = key
		idx++
	}
	sort.Strings(keys)

	return keys
}

func (c *converter) upsertField(v reflect.Value, fieldName string) error {
	valueOf, err := c.convertField(v, fieldName)
	if err != nil {
		return err
	}

	if _, exists := c.fields[fieldName]; !exists {
		// keep track of unique fields in the order they appear
		c.fieldNames = append(c.fieldNames, fieldName)
		v, err := sliceFor(valueOf)
		if err != nil {
			return err
		}

		c.fields[fieldName] = data.NewField(fieldName, nil, v)
	}

	c.padField(c.fields[fieldName], c.maxLen-1)
	c.appendToField(fieldName, toPointer(valueOf))
	return nil
}

func (c *converter) convertField(v reflect.Value, fieldName string) (interface{}, error) {
	if converter, exists := c.converters[fieldName]; exists {
		valueOf, err := converter(v.Interface())
		if err != nil {
			return nil, fmt.Errorf("field conversion error %s: %s", fieldName, err)
		}
		return valueOf, nil
	}
	return v.Interface(), nil
}

func (c *converter) appendToField(name string, value interface{}) {
	c.fields[name].Append(value)
}

func (c *converter) createFrame(name string) *data.Frame {
	for _, f := range c.fields {
		c.padField(f, c.maxLen)
	}

	frame := data.NewFrame(name)
	for _, f := range c.getFieldnames() {
		frame.Fields = append(frame.Fields, c.fields[f])
	}
	return frame
}

func (c *converter) padField(f *data.Field, maxLen int) {
	for f.Len() < maxLen {
		f.Append(nil)
	}
}

func (c *converter) getFieldnames() []string {
	if c.anyMap {
		// Ensure stable order of fields across
		// runs, because maps
		sort.Strings(c.fieldNames)
	}

	fieldnames := []string{}
	if c.col0 != "" {
		fieldnames = append(fieldnames, c.col0)
	}
	for _, f := range c.fieldNames {
		if f != c.col0 {
			fieldnames = append(fieldnames, f)
		}
	}

	return fieldnames
}

func (c *converter) fieldName(fieldName, tags, prefix string) string {
	c.parseTags(tags)
	if c.tags[1] == "omitparent" {
		prefix = ""
	}

	if c.tags[0] != "" {
		fieldName = c.tags[0]
	}

	if prefix == "" {
		return fieldName
	}

	return prefix + "." + fieldName
}

func (c *converter) parseTags(s string) {
	// if we do it this way, we avoid all the allocs
	// of strings.Split
	c.tags[0] = ""
	c.tags[1] = ""
	c.tags[2] = ""

	sep := ","

	i := 0
	for i < 2 {
		m := strings.Index(s, sep)
		if m < 0 {
			break
		}
		c.tags[i] = strings.TrimSpace(s[:m])
		s = s[m+len(sep):]
		i++
	}

	if i < len(c.tags) {
		c.tags[i] = s
	}
}
