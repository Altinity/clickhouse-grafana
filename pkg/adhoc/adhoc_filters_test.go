package adhoc

import (
	"testing"
)

func TestProcessAdhocFilters_KeyParsing(t *testing.T) {
	tests := []struct {
		name           string
		filterKey      string
		targetDatabase string
		targetTable    string
		expectedParts  []string // What parts should be after parsing
		shouldProcess  bool     // Whether filter should be processed (matches target)
	}{
		{
			name:           "SimpleColumnName",
			filterKey:      "error",
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedParts:  []string{"system", "query_log", "error"},
			shouldProcess:  true,
		},
		{
			name:           "FullyQualifiedName_Match",
			filterKey:      "system.query_log.error",
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedParts:  []string{"system", "query_log", "error"},
			shouldProcess:  true,
		},
		{
			name:           "FullyQualifiedName_NoMatch",
			filterKey:      "default.users.name",
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedParts:  []string{"default", "users", "name"},
			shouldProcess:  false,
		},
		{
			name:           "TwoPartName",
			filterKey:      "query_log.error",
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedParts:  []string{"query_log", "query_log", "error"}, // Note: prepends targetTable
			shouldProcess:  false, // Won't match because first part is "query_log", not "system"
		},
		{
			name:           "SinglePartWithDot",
			filterKey:      "error.level",
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedParts:  []string{"error.level", "query_log", "error.level"}, // Split creates ["error", "level"] -> len=2, prepends targetTable
			shouldProcess:  false, // First part is "error", not "system"
		},
		{
			name:           "MultipleDots",
			filterKey:      "db.schema.table.column",
			targetDatabase: "db",
			targetTable:    "schema",
			expectedParts:  []string{"db", "schema", "table"}, // Takes first 3 parts
			shouldProcess:  true, // Matches: db==db AND schema==schema, uses "table" as column
		},
		{
			name:           "EmptyPartsInKey",
			filterKey:      "system..error",
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedParts:  []string{"system", "", "error"},
			shouldProcess:  false, // Second part is empty, not "query_log"
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filter := AdhocFilter{
				Key:      tt.filterKey,
				Operator: "=",
				Value:    "test_value",
			}

			result := ProcessAdhocFilters([]AdhocFilter{filter}, tt.targetDatabase, tt.targetTable)

			if tt.shouldProcess {
				if len(result) != 1 {
					t.Errorf("Expected 1 condition, got %d", len(result))
				}
				// Verify the condition contains the correct column name (last part)
				expectedColumn := tt.expectedParts[2]
				if len(result) > 0 && !containsColumn(result[0], expectedColumn) {
					t.Errorf("Expected condition to contain column '%s', got '%s'", expectedColumn, result[0])
				}
			} else {
				if len(result) != 0 {
					t.Errorf("Expected 0 conditions (filter should be skipped), got %d: %v", len(result), result)
				}
			}
		})
	}
}

func TestProcessAdhocFilters_DatabaseTableMatching(t *testing.T) {
	tests := []struct {
		name           string
		filters        []AdhocFilter
		targetDatabase string
		targetTable    string
		expectedCount  int
		description    string
	}{
		{
			name: "ExactMatch",
			filters: []AdhocFilter{
				{Key: "system.query_log.error", Operator: "=", Value: "test"},
			},
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedCount:  1,
			description:    "Filter matches target database and table exactly",
		},
		{
			name: "WrongDatabase",
			filters: []AdhocFilter{
				{Key: "default.query_log.error", Operator: "=", Value: "test"},
			},
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedCount:  0,
			description:    "Filter has wrong database, should be skipped",
		},
		{
			name: "WrongTable",
			filters: []AdhocFilter{
				{Key: "system.users.name", Operator: "=", Value: "test"},
			},
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedCount:  0,
			description:    "Filter has wrong table, should be skipped",
		},
		{
			name: "BothWrong",
			filters: []AdhocFilter{
				{Key: "default.users.name", Operator: "=", Value: "test"},
			},
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedCount:  0,
			description:    "Filter has wrong database and table, should be skipped",
		},
		{
			name: "MultipleFiltersMixed",
			filters: []AdhocFilter{
				{Key: "system.query_log.error", Operator: "=", Value: "test1"}, // Match
				{Key: "default.query_log.error", Operator: "=", Value: "test2"}, // Wrong DB
				{Key: "system.users.name", Operator: "=", Value: "test3"},       // Wrong table
				{Key: "system.query_log.duration", Operator: ">", Value: 100},   // Match
				{Key: "type", Operator: "!=", Value: "SELECT"},                  // Simple name - Match
			},
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedCount:  3,
			description:    "Mix of matching and non-matching filters",
		},
		{
			name: "InsufficientParts",
			filters: []AdhocFilter{
				{Key: "", Operator: "=", Value: "test"}, // Empty key -> [system, query_log, ""] -> matches but empty column
				{Key: ".", Operator: "=", Value: "test"}, // Single dot -> ["", ""] -> len=2 -> [query_log, "", ""] -> query_log != system, skipped
			},
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedCount:  1, // Only the empty key will be processed
			description:    "Empty key gets processed (with empty column), single dot gets skipped",
		},
		{
			name: "CaseSensitivity",
			filters: []AdhocFilter{
				{Key: "SYSTEM.QUERY_LOG.ERROR", Operator: "=", Value: "test"},
			},
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedCount:  0,
			description:    "Database/table matching should be case sensitive",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ProcessAdhocFilters(tt.filters, tt.targetDatabase, tt.targetTable)

			if len(result) != tt.expectedCount {
				t.Errorf("Test '%s': Expected %d conditions, got %d. Description: %s\nResult: %v",
					tt.name, tt.expectedCount, len(result), tt.description, result)
			}

			// Verify each result is a valid SQL condition
			for i, condition := range result {
				if condition == "" {
					t.Errorf("Test '%s': Condition %d is empty", tt.name, i)
				}
			}
		})
	}
}

func TestProcessAdhocFilters_EdgeCases(t *testing.T) {
	tests := []struct {
		name           string
		filters        []AdhocFilter
		targetDatabase string
		targetTable    string
		expectedCount  int
		description    string
	}{
		{
			name:           "EmptyFiltersArray",
			filters:        []AdhocFilter{},
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedCount:  0,
			description:    "Empty filter array should return empty result",
		},
		{
			name:           "NilFiltersArray",
			filters:        nil,
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedCount:  0,
			description:    "Nil filter array should return empty result",
		},
		{
			name: "EmptyTargets",
			filters: []AdhocFilter{
				{Key: "error", Operator: "=", Value: "test"}, // No dots -> ["", "", "error"] -> matches empty targets
			},
			targetDatabase: "",
			targetTable:    "",
			expectedCount:  1,
			description:    "Empty target database/table will match empty parts (edge case)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ProcessAdhocFilters(tt.filters, tt.targetDatabase, tt.targetTable)

			if len(result) != tt.expectedCount {
				t.Errorf("Test '%s': Expected %d conditions, got %d. Description: %s",
					tt.name, tt.expectedCount, len(result), tt.description)
			}
		})
	}
}

// Helper function to check if a condition contains a specific column name
func containsColumn(condition, column string) bool {
	// Simple check - in real SQL condition like "error = 'test'", 
	// the column should be at the beginning
	return len(condition) > len(column) && condition[:len(column)] == column
}

// Benchmark for performance validation
func BenchmarkProcessAdhocFilters(b *testing.B) {
	filters := []AdhocFilter{
		{Key: "system.query_log.error", Operator: "=", Value: "test1"},
		{Key: "system.query_log.duration", Operator: ">", Value: 100},
		{Key: "system.query_log.type", Operator: "!=", Value: "SELECT"},
		{Key: "default.users.name", Operator: "=", Value: "user"}, // Won't match
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ProcessAdhocFilters(filters, "system", "query_log")
	}
}