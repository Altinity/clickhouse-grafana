// Copyright 2021 The Prometheus Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package config

import (
	"bytes"
	"encoding/json"
	"net/http"
	"reflect"
	"testing"

	"gopkg.in/yaml.v2"
)

func TestJSONMarshalSecret(t *testing.T) {
	type tmp struct {
		S Secret
	}
	for _, tc := range []struct {
		desc     string
		data     tmp
		expected string
	}{
		{
			desc: "inhabited",
			// u003c -> "<"
			// u003e -> ">"
			data:     tmp{"test"},
			expected: "{\"S\":\"\\u003csecret\\u003e\"}",
		},
		{
			desc:     "empty",
			data:     tmp{},
			expected: "{\"S\":\"\"}",
		},
	} {
		t.Run(tc.desc, func(t *testing.T) {
			c, err := json.Marshal(tc.data)
			if err != nil {
				t.Fatal(err)
			}
			if tc.expected != string(c) {
				t.Fatalf("Secret not marshaled correctly, got '%s'", string(c))
			}
		})
	}
}

func TestHeaderHTTPHeader(t *testing.T) {
	testcases := map[string]struct {
		header   Header
		expected http.Header
	}{
		"basic": {
			header: Header{
				"single": []Secret{"v1"},
				"multi":  []Secret{"v1", "v2"},
				"empty":  []Secret{},
				"nil":    nil,
			},
			expected: http.Header{
				"single": []string{"v1"},
				"multi":  []string{"v1", "v2"},
				"empty":  []string{},
				"nil":    nil,
			},
		},
		"nil": {
			header:   nil,
			expected: nil,
		},
	}

	for name, tc := range testcases {
		t.Run(name, func(t *testing.T) {
			actual := tc.header.HTTPHeader()
			if !reflect.DeepEqual(actual, tc.expected) {
				t.Fatalf("expecting: %#v, actual: %#v", tc.expected, actual)
			}
		})
	}
}

func TestHeaderYamlUnmarshal(t *testing.T) {
	testcases := map[string]struct {
		input    string
		expected Header
	}{
		"void": {
			input: ``,
		},
		"simple": {
			input:    "single:\n- a\n",
			expected: Header{"single": []Secret{"a"}},
		},
		"multi": {
			input:    "multi:\n- a\n- b\n",
			expected: Header{"multi": []Secret{"a", "b"}},
		},
		"empty": {
			input:    "{}",
			expected: Header{},
		},
		"empty value": {
			input:    "empty:\n",
			expected: Header{"empty": nil},
		},
	}

	for name, tc := range testcases {
		t.Run(name, func(t *testing.T) {
			var actual Header
			err := yaml.Unmarshal([]byte(tc.input), &actual)
			if err != nil {
				t.Fatalf("error unmarshaling %s: %s", tc.input, err)
			}
			if !reflect.DeepEqual(actual, tc.expected) {
				t.Fatalf("expecting: %#v, actual: %#v", tc.expected, actual)
			}
		})
	}
}

func TestHeaderYamlMarshal(t *testing.T) {
	testcases := map[string]struct {
		input    Header
		expected []byte
	}{
		"void": {
			input:    nil,
			expected: []byte("{}\n"),
		},
		"simple": {
			input:    Header{"single": []Secret{"a"}},
			expected: []byte("single:\n- <secret>\n"),
		},
		"multi": {
			input:    Header{"multi": []Secret{"a", "b"}},
			expected: []byte("multi:\n- <secret>\n- <secret>\n"),
		},
		"empty": {
			input:    Header{"empty": nil},
			expected: []byte("empty: []\n"),
		},
	}

	for name, tc := range testcases {
		t.Run(name, func(t *testing.T) {
			actual, err := yaml.Marshal(tc.input)
			if err != nil {
				t.Fatalf("error unmarshaling %#v: %s", tc.input, err)
			}
			if !bytes.Equal(actual, tc.expected) {
				t.Fatalf("expecting: %q, actual: %q", tc.expected, actual)
			}
		})
	}
}

func TestHeaderJsonUnmarshal(t *testing.T) {
	testcases := map[string]struct {
		input    string
		expected Header
	}{
		"void": {
			input: `null`,
		},
		"simple": {
			input:    `{"single": ["a"]}`,
			expected: Header{"single": []Secret{"a"}},
		},
		"multi": {
			input:    `{"multi": ["a", "b"]}`,
			expected: Header{"multi": []Secret{"a", "b"}},
		},
		"empty": {
			input:    `{}`,
			expected: Header{},
		},
		"empty value": {
			input:    `{"empty":null}`,
			expected: Header{"empty": nil},
		},
	}

	for name, tc := range testcases {
		t.Run(name, func(t *testing.T) {
			var actual Header
			err := json.Unmarshal([]byte(tc.input), &actual)
			if err != nil {
				t.Fatalf("error unmarshaling %s: %s", tc.input, err)
			}
			if !reflect.DeepEqual(actual, tc.expected) {
				t.Fatalf("expecting: %#v, actual: %#v", tc.expected, actual)
			}
		})
	}
}

func TestHeaderJsonMarshal(t *testing.T) {
	testcases := map[string]struct {
		input    Header
		expected []byte
	}{
		"void": {
			input:    nil,
			expected: []byte("null"),
		},
		"simple": {
			input:    Header{"single": []Secret{"a"}},
			expected: []byte("{\"single\":[\"\\u003csecret\\u003e\"]}"),
		},
		"multi": {
			input:    Header{"multi": []Secret{"a", "b"}},
			expected: []byte("{\"multi\":[\"\\u003csecret\\u003e\",\"\\u003csecret\\u003e\"]}"),
		},
		"empty": {
			input:    Header{"empty": nil},
			expected: []byte(`{"empty":null}`),
		},
	}

	for name, tc := range testcases {
		t.Run(name, func(t *testing.T) {
			actual, err := json.Marshal(tc.input)
			if err != nil {
				t.Fatalf("error marshaling %#v: %s", tc.input, err)
			}
			if !bytes.Equal(actual, tc.expected) {
				t.Fatalf("expecting: %q, actual: %q", tc.expected, actual)
			}
		})
	}
}
