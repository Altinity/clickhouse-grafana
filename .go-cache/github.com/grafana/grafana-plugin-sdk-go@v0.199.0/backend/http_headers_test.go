package backend

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSetHTTPHeaderInStringMap(t *testing.T) {
	tcs := []struct {
		input    map[string]string
		expected map[string]string
	}{
		{
			expected: map[string]string{
				"":  "",
				"a": "",
			},
		},
		{
			input: map[string]string{
				"authorization": "a",
				"x-id-token":    "b",
				"cookie":        "c",
				"x-custom":      "d",
			},
			expected: map[string]string{
				"":              "",
				"a":             "",
				"authorization": "a",
				"Authorization": "a",
				"x-id-token":    "b",
				"X-Id-Token":    "b",
				"cookie":        "c",
				"Cookie":        "c",
				"x-custom":      "d",
				"X-Custom":      "d",
			},
		},
		{
			input: map[string]string{
				"Authorization": "a",
				"X-ID-Token":    "b",
				"Cookie":        "c",
				"X-Custom":      "d",
			},
			expected: map[string]string{
				"":              "",
				"a":             "",
				"authorization": "a",
				"Authorization": "a",
				"x-id-token":    "b",
				"X-Id-Token":    "b",
				"cookie":        "c",
				"Cookie":        "c",
				"x-custom":      "d",
				"X-Custom":      "d",
			},
		},
	}

	for _, tc := range tcs {
		headerMap := map[string]string{}
		for k, v := range tc.input {
			setHTTPHeaderInStringMap(headerMap, k, v)
		}
		headers := getHTTPHeadersFromStringMap(headerMap)

		for k, v := range tc.expected {
			require.Equal(t, v, headers.Get(k))
		}
	}
}

func TestGetHTTPHeadersFromStringMap(t *testing.T) {
	tcs := []struct {
		input    map[string]string
		expected map[string]string
	}{
		{
			expected: map[string]string{
				"":  "",
				"a": "",
			},
		},
		{
			input: map[string]string{
				"authorization":               "a",
				"x-id-token":                  "b",
				"cookie":                      "c",
				httpHeaderPrefix + "x-custom": "d",
			},
			expected: map[string]string{
				"":              "",
				"a":             "",
				"authorization": "a",
				"Authorization": "a",
				"x-id-token":    "b",
				"X-Id-Token":    "b",
				"cookie":        "c",
				"Cookie":        "c",
				"x-custom":      "d",
				"X-Custom":      "d",
			},
		},
		{
			input: map[string]string{
				"Authorization":               "a",
				"X-ID-Token":                  "b",
				"Cookie":                      "c",
				httpHeaderPrefix + "X-Custom": "d",
			},
			expected: map[string]string{
				"":              "",
				"a":             "",
				"authorization": "a",
				"Authorization": "a",
				"x-id-token":    "b",
				"X-Id-Token":    "b",
				"cookie":        "c",
				"Cookie":        "c",
				"x-custom":      "d",
				"X-Custom":      "d",
			},
		},
	}

	for _, tc := range tcs {
		headers := getHTTPHeadersFromStringMap(tc.input)

		for k, v := range tc.expected {
			require.Equal(t, v, headers.Get(k))
		}
	}
}

func TestDeleteHTTPHeaderInStringMap(t *testing.T) {
	tcs := []struct {
		input      map[string]string
		deleteKeys []string
		expected   map[string]string
	}{
		{
			expected: map[string]string{
				"":  "",
				"a": "",
			},
		},
		{
			input: map[string]string{
				"authorization":               "a",
				"x-id-token":                  "b",
				"cookie":                      "c",
				httpHeaderPrefix + "x-custom": "d",
			},
			deleteKeys: []string{"authorization", "x-id-token", "cookie", "x-custom"},
			expected: map[string]string{
				"":              "",
				"a":             "",
				"authorization": "",
				"Authorization": "",
				"x-id-token":    "",
				"X-Id-Token":    "",
				"cookie":        "",
				"Cookie":        "",
				"x-custom":      "",
				"X-Custom":      "",
			},
		},
		{
			input: map[string]string{
				"Authorization":               "a",
				"X-ID-Token":                  "b",
				"Cookie":                      "c",
				httpHeaderPrefix + "X-Custom": "d",
			},
			deleteKeys: []string{"Authorization", "X-Id-Token", "Cookie", "X-Custom"},
			expected: map[string]string{
				"":              "",
				"a":             "",
				"authorization": "",
				"Authorization": "",
				"x-id-token":    "",
				"X-Id-Token":    "",
				"cookie":        "",
				"Cookie":        "",
				"x-custom":      "",
				"X-Custom":      "",
			},
		},
	}

	for _, tc := range tcs {
		headerMap := make(map[string]string, len(tc.input))
		for k, v := range tc.input {
			headerMap[k] = v
		}

		for _, key := range tc.deleteKeys {
			deleteHTTPHeaderInStringMap(headerMap, key)
		}
		headers := getHTTPHeadersFromStringMap(headerMap)

		for k, v := range tc.expected {
			require.Equal(t, v, headers.Get(k))
		}
	}
}
