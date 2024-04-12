package macros_test

import (
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/macros"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFromMacro(t *testing.T) {
	from := time.UnixMilli(1669900815456).In(time.UTC) // Thu Dec 01 2022 13:20:15 GMT+0000 (Greenwich Mean Time)
	tests := []struct {
		name        string
		inputString string
		from        *time.Time
		want        string
		wantErr     error
	}{
		{inputString: "${__from}", want: "1669900815456"},
		{inputString: "${__from:date}", want: "2022-12-01T13:20:15.456Z"},
		{inputString: "${__from:date:iso}", want: "2022-12-01T13:20:15.456Z"},
		{inputString: "foo ${__from:date:YYYY:MM:DD:HH:mm} bar", want: "foo 2022:12:01:13:20 bar"},
		{inputString: "foo ${__from:date:YYYY-MM-DD:hh,mm} bar", want: "foo 2022-12-01:01,20 bar"},
		{inputString: "foo${__from:date:iso}Bar${__from}baz", want: "foo2022-12-01T13:20:15.456ZBar1669900815456baz"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.from != nil {
				from = *tt.from
			}
			got, err := macros.FromMacro(tt.inputString, backend.TimeRange{From: from})
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

func TestToMacro(t *testing.T) {
	to := time.UnixMilli(1670221215456).In(time.UTC) // Mon Dec 05 2022 06:20:15 GMT+0000 (Greenwich Mean Time)
	tests := []struct {
		name        string
		inputString string
		to          *time.Time
		want        string
		wantErr     error
	}{
		{inputString: "${__to}", want: "1670221215456"},
		{inputString: "${__to:date}", want: "2022-12-05T06:20:15.456Z"},
		{inputString: "${__to:date:iso}", want: "2022-12-05T06:20:15.456Z"},
		{inputString: "foo ${__to:date:YYYY:MM:DD:HH:mm} bar", want: "foo 2022:12:05:06:20 bar"},
		{inputString: "foo ${__to:date:YYYY-MM-DD:hh,mm} bar", want: "foo 2022-12-05:06,20 bar"},
		{inputString: "foo ${__to:date:D/M/YY h:mm} bar", want: "foo 5/12/22 6:20 bar"},
		{inputString: "foo${__to:date:iso}Bar${__to}baz", want: "foo2022-12-05T06:20:15.456ZBar1670221215456baz"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.to != nil {
				to = *tt.to
			}
			got, err := macros.ToMacro(tt.inputString, backend.TimeRange{To: to})
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
