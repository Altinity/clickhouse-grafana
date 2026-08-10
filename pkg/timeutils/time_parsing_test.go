package timeutils

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestParseTimeRange(t *testing.T) {
	tests := []struct {
		name    string
		from    string
		to      string
		wantErr bool
	}{
		{"valid", "2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z", false},
		{"bad from", "not-a-time", "2024-01-02T00:00:00Z", true},
		{"bad to", "2024-01-01T00:00:00Z", "not-a-time", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			from, to, err := ParseTimeRange(TimeRangeStruct{From: tt.from, To: tt.to})
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), from)
			require.Equal(t, time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), to)
		})
	}
}
