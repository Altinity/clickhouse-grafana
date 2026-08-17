package main

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestApplyTimeRangeToQueryNumericDateAndTimeValues(t *testing.T) {
	from := time.Unix(1640995200, 0).UTC()
	to := time.Unix(1641081600, 0).UTC()
	testCases := []struct {
		dateTimeType string
		from         string
		to           string
	}{
		{"DATE", "toDate(1640995200)", "toDate(1641081600)"},
		{"DATE32", "toDate32(1640995200)", "toDate32(1641081600)"},
		{"DATETIME", "toDateTime(1640995200)", "toDateTime(1641081600)"},
		{"DATETIME64", "toDateTime64(1640995200.000,3)", "toDateTime64(1641081600.000,3)"},
		{"TIMESTAMP", "1640995200", "1641081600"},
		{"TIMESTAMP64_3", "1640995200000", "1641081600000"},
		{"TIMESTAMP64_6", "1640995200000000", "1641081600000000"},
		{"TIMESTAMP64_9", "1640995200000000000", "1641081600000000000"},
		{"FLOAT", "1640995200.000", "1641081600.000"},
		// unknown type keeps the column comparison but drops the compared value
		{"", "", ""},
	}
	for _, tc := range testCases {
		t.Run("type "+tc.dateTimeType, func(t *testing.T) {
			q := Query{
				RawQuery:     "SELECT * FROM tbl WHERE d >= yesterday() AND d <= today() AND ts >= now() AND ts <= now()",
				DateCol:      "d",
				DateTimeCol:  "ts",
				DateTimeType: tc.dateTimeType,
				From:         from,
				To:           to,
			}
			expected := fmt.Sprintf(
				"SELECT * FROM tbl WHERE d >= toDate(1640995200) AND d <= toDate(1641081600) AND ts >= %s AND ts <= %s FORMAT JSON",
				tc.from, tc.to,
			)
			require.Equal(t, expected, q.ApplyTimeRangeToQuery())
		})
	}
}

func TestApplyTimeRangeToQueryTimeValueReplacement(t *testing.T) {
	from := time.Unix(1640995200, 0).UTC()
	to := time.Unix(1641081600, 0).UTC()
	testCases := []struct {
		name     string
		rawQuery string
		expected string
	}{
		{
			"trims and appends FORMAT JSON",
			"SELECT 1;\r\n\t ",
			"SELECT 1 FORMAT JSON",
		},
		{
			"toDateTime range values replaced",
			"SELECT c FROM tbl WHERE ts >= toDateTime(1111111111) AND ts <= toDateTime(2222222222)",
			"SELECT c FROM tbl WHERE ts >= toDateTime(1640995200) AND ts <= toDateTime(1641081600) FORMAT JSON",
		},
		{
			"toDate BETWEEN values replaced",
			"SELECT c FROM tbl WHERE d BETWEEN toDate(1111111111) AND toDate(2222222222)",
			"SELECT c FROM tbl WHERE d BETWEEN toDate(1640995200) AND toDate(1641081600) FORMAT JSON",
		},
		{
			"toDateTime64 millisecond values replaced",
			"SELECT c FROM tbl WHERE ts >= toDateTime64(1111111111111/1000, 3) AND ts <= toDateTime64(2222222222222/1000, 3)",
			"SELECT c FROM tbl WHERE ts >= toDateTime64(1640995200000/1000, 3) AND ts <= toDateTime64(1641081600000/1000, 3) FORMAT JSON",
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			q := Query{RawQuery: tc.rawQuery, From: from, To: to}
			require.Equal(t, tc.expected, q.ApplyTimeRangeToQuery())
		})
	}
}
