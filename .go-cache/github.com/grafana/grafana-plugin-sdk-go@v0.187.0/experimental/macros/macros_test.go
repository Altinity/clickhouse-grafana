package macros_test

import (
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/macros"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestApplyMacros(t *testing.T) {
	from := time.UnixMilli(1669900815456).In(time.UTC) // Thu Dec 01 2022 13:20:15 GMT+0000 (Greenwich Mean Time)
	to := from.Add(65 * time.Second)                   // above plus 65 seconds
	tests := []struct {
		name        string
		inputString string
		from        *time.Time
		to          *time.Time
		want        string
		wantErr     error
	}{
		{inputString: "${__from}", want: "1669900815456"},
		{inputString: "${__from:date}", want: "2022-12-01T13:20:15.456Z"},
		{inputString: "${__from:date:iso}", want: "2022-12-01T13:20:15.456Z"},
		{inputString: "foo ${__from:date:YYYY:MM:DD:HH:mm} bar", want: "foo 2022:12:01:13:20 bar"},
		{inputString: "foo ${__to:date:YYYY-MM-DD:hh,mm} bar", want: "foo 2022-12-01:01,21 bar"},
		{inputString: "from ${__from:date:iso} to ${__to:date:iso}", want: "from 2022-12-01T13:20:15.456Z to 2022-12-01T13:21:20.456Z"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.from != nil {
				from = *tt.from
			}
			if tt.to != nil {
				to = *tt.to
			}
			got, err := macros.ApplyMacros(tt.inputString, backend.TimeRange{From: from, To: to}, backend.PluginContext{})
			if tt.wantErr != nil {
				require.NotNil(t, err)
				assert.Equal(t, tt.wantErr, err)
				return
			}
			require.Nil(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}
