package data_test

import (
	"encoding/json"
	"testing"

	jsoniter "github.com/json-iterator/go"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// Equals returns true if the argument has the same k=v pairs as the receiver.
func TestEquals(t *testing.T) {
	a := data.Labels{"aLabelKey": "aLabelValue"}
	b := data.Labels{"bLabelKey": "bLabelValue"}
	c := data.Labels{"aLabelKey": "aLabelValue"}

	result1 := a.Equals(b)
	result2 := a.Equals(c)
	require.Equal(t, result1, false)
	require.Equal(t, result2, true)
}

func TestCopy(t *testing.T) {
	a := data.Labels{"copyLabelKey": "copyLabelValue"}
	result := a.Copy()
	require.Equal(t, result, data.Labels{"copyLabelKey": "copyLabelValue"})
}

func TestContains(t *testing.T) {
	a := data.Labels{"containsLabelKey": "containsLabelValue", "cat": "notADog"}
	result := a.Contains(data.Labels{"cat": "notADog"})
	require.Equal(t, result, true)
}

func TestJSONReadWrite(t *testing.T) {
	a0 := data.Labels{"a": "AAA", "b": "BBB"}
	a1 := data.Labels{"b": "BBB", "a": "AAA"}

	b0, _ := jsoniter.Marshal(a0)
	b1, _ := jsoniter.Marshal(a1)

	require.Equal(t, b0, b1)
	require.Equal(t, `{"a":"AAA","b":"BBB"}`, string(b0))

	// Check that unmarshal works as expected
	out := data.Labels{}
	err := json.Unmarshal(b1, &out)
	require.NoError(t, err)
	require.Equal(t, a0, out)

	out, err = data.LabelsFromString(string(b0))
	require.NoError(t, err)
	require.Equal(t, a0, out)
}

func TestString(t *testing.T) {
	a := data.Labels{"job": "prometheus", "group": "canary"}
	result := a.String()
	require.Equal(t, result, "group=canary, job=prometheus")
	b := `{group="canary", job=prometheus}`
	res, err := data.LabelsFromString(b)
	require.NoError(t, err)
	result1 := res.String()
	require.Equal(t, result1, "group=canary, job=prometheus")
}

func TestLabelsFromString(t *testing.T) {
	target := data.Labels{"group": "canary", "job": "prometheus"}

	// Support prometheus style input
	result, err := data.LabelsFromString(`{group="canary", job="prometheus"}`)
	require.NoError(t, err)
	require.Equal(t, target, result)

	// and influx style input
	result, err = data.LabelsFromString(`group=canary, job=prometheus`)
	require.NoError(t, err)
	require.Equal(t, target, result)

	// raw string
	result, err = data.LabelsFromString(`{method="GET"}`)
	require.NoError(t, err)
	require.Equal(t, result, data.Labels{"method": "GET"})
}

func TestLabelsFingerprint(t *testing.T) {
	testCases := []struct {
		name        string
		labels      data.Labels
		fingerprint data.Fingerprint
	}{
		{
			name:        "should work if nil",
			labels:      nil,
			fingerprint: data.Fingerprint(0xcbf29ce484222325),
		},
		{
			name:        "should work if empty",
			labels:      make(data.Labels),
			fingerprint: data.Fingerprint(0xcbf29ce484222325),
		},
		{
			name:        "should calculate hash",
			labels:      data.Labels{"a": "AAA", "b": "BBB", "c": "CCC", "d": "DDD"},
			fingerprint: data.Fingerprint(0xfb4532f90d896635),
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			require.Equal(t, testCase.fingerprint, testCase.labels.Fingerprint())
		})
	}
}

func TestLabelsFingerprintString(t *testing.T) {
	testCases := []struct {
		name        string
		fingerprint data.Fingerprint
		expected    string
	}{
		{"simple", data.Fingerprint(0x1234567890abcdef), "1234567890abcdef"},
		{"zero", data.Fingerprint(0), "0000000000000000"},
		{"max", data.Fingerprint(0xffffffffffffffff), "ffffffffffffffff"},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			require.Equal(t, testCase.expected, testCase.fingerprint.String())
		})
	}
}
