package eval

import (
	"strings"
	"testing"
)

func TestScannerPreservesInListSeparators(t *testing.T) {
	tests := []struct {
		name  string
		query string
		want  string
	}{
		{
			name:  "string values",
			query: "SELECT dt FROM default.messages WHERE severity IN ('EMERGENCY','ALERT','CRITICAL')",
			want:  "severity IN ('EMERGENCY', 'ALERT', 'CRITICAL')",
		},
		{
			name:  "numeric values",
			query: "SELECT id FROM default.messages WHERE id IN (1,2,3)",
			want:  "id IN (1, 2, 3)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scanner := NewScanner(tt.query)
			formatted, err := scanner.Format()
			if err != nil {
				t.Fatalf("format query: %v", err)
			}
			if !strings.Contains(formatted, tt.want) {
				t.Fatalf("formatted query %q does not contain %q", formatted, tt.want)
			}
		})
	}
}
