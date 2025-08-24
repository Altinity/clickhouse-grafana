package helpers

import (
	"time"
)

// TimeRangeStruct represents a time range with From/To fields
type TimeRangeStruct struct {
	From string `json:"from"`
	To   string `json:"to"`
}

// ParseTimeRange parses From/To time strings and returns parsed times
// Returns the parsed times and any error that occurred
func ParseTimeRange(timeRange TimeRangeStruct) (time.Time, time.Time, error) {
	from, err := time.Parse(time.RFC3339, timeRange.From)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	
	to, err := time.Parse(time.RFC3339, timeRange.To)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	
	return from, to, nil
}