package live

import (
	"errors"
	"fmt"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/require"
)

func TestParseChannel(t *testing.T) {
	channel, err := ParseChannel("aaa/bbb/ccc")
	require.NoError(t, err)

	ex := Channel{
		Scope:     "aaa",
		Namespace: "bbb",
		Path:      "ccc",
	}

	if diff := cmp.Diff(channel, ex); diff != "" {
		t.Fatalf("Result mismatch (-want +got):\n%s", diff)
	}
}

func TestParseChannel_ChannelTooLong(t *testing.T) {
	prefix := "grafana/dashboard/"
	b := make([]byte, 0, maxChannelLength+1)
	for i := 0; i < maxChannelLength+1-len(prefix); i++ {
		b = append(b, 'a')
	}
	chID := fmt.Sprintf("grafana/dashboard/%s", string(b))
	_, err := ParseChannel(chID)
	require.ErrorIs(t, err, ErrInvalidChannelID)
}

func TestParseChannel_IsValid(t *testing.T) {
	tests := []struct {
		name    string
		id      string
		isValid bool
	}{
		{
			name:    "valid",
			id:      "Stream/cpu/test",
			isValid: true,
		},
		{
			name:    "valid_long_path",
			id:      "stream/cpu/test",
			isValid: true,
		},
		{
			name:    "invalid_empty",
			id:      "",
			isValid: false,
		},
		{
			name:    "invalid_path_empty",
			id:      "stream/test",
			isValid: false,
		},
		{
			name:    "invalid_reserved_symbol",
			id:      "stream/test/%",
			isValid: false,
		},
		{
			name:    "invalid_has_space",
			id:      "stream/cpu/ test",
			isValid: false,
		},
		{
			name:    "invalid_has_unicode",
			id:      "stream/cpu/ѓ",
			isValid: false,
		},
		{
			name:    "invalid_no_path",
			id:      "grafana/bbb",
			isValid: false,
		},
		{
			name:    "invalid_only_scope",
			id:      "grafana",
			isValid: false,
		},
		{
			name:    "path_with_additional_symbols",
			id:      "grafana/test/path/dash-and-equal=1.1.1.1",
			isValid: true,
		},
		{
			name:    "scope_namespace_with_additional_symbols",
			id:      "grafana=/test=/path/dash-and-equal",
			isValid: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseChannel(tt.id)
			if tt.isValid && err != nil {
				t.Errorf("unexpected isValid result for %s", tt.id)
			} else if !tt.isValid && !errors.Is(err, ErrInvalidChannelID) {
				t.Errorf("unexpected isValid result for %s", tt.id)
			}
		})
	}
}

func TestChannel_String(t *testing.T) {
	type fields struct {
		Scope     string
		Namespace string
		Path      string
	}
	tests := []struct {
		name   string
		fields fields
		want   string
	}{
		{
			"with_all_parts",
			fields{Scope: ScopeStream, Namespace: "telegraf", Path: "test"},
			"stream/telegraf/test",
		},
		{
			"with_scope_and_namespace",
			fields{Scope: ScopeStream, Namespace: "telegraf"},
			"stream/telegraf",
		},
		{
			"with_scope_only",
			fields{Scope: ScopeStream},
			"stream",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Channel{
				Scope:     tt.fields.Scope,
				Namespace: tt.fields.Namespace,
				Path:      tt.fields.Path,
			}.String()
			if got != tt.want {
				t.Errorf("String() = %v, want %v", got, tt.want)
			}
		})
	}
}
