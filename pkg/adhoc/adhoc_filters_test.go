package adhoc

import (
	"encoding/json"
	"strings"
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
			shouldProcess:  false,                                       // Won't match because first part is "query_log", not "system"
		},
		{
			name:           "SinglePartWithDot",
			filterKey:      "error.level",
			targetDatabase: "system",
			targetTable:    "query_log",
			expectedParts:  []string{"error.level", "query_log", "error.level"}, // Split creates ["error", "level"] -> len=2, prepends targetTable
			shouldProcess:  false,                                               // First part is "error", not "system"
		},
		{
			name:           "MultipleDots",
			filterKey:      "db.schema.table.column",
			targetDatabase: "db",
			targetTable:    "schema",
			expectedParts:  []string{"db", "schema", "table"}, // Takes first 3 parts
			shouldProcess:  true,                              // Matches: db==db AND schema==schema, uses "table" as column
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

			result := ProcessAdhocFilters([]AdhocFilter{filter}, tt.targetDatabase, tt.targetTable, nil)

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
				{Key: "system.query_log.error", Operator: "=", Value: "test1"},  // Match
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
				{Key: "", Operator: "=", Value: "test"},  // Empty key -> [system, query_log, ""] -> matches but empty column
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
			result := ProcessAdhocFilters(tt.filters, tt.targetDatabase, tt.targetTable, nil)

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
			result := ProcessAdhocFilters(tt.filters, tt.targetDatabase, tt.targetTable, nil)

			if len(result) != tt.expectedCount {
				t.Errorf("Test '%s': Expected %d conditions, got %d. Description: %s",
					tt.name, tt.expectedCount, len(result), tt.description)
			}
		})
	}
}

// TestProcessAdhocFilters_ConditionFormat verifies that adhoc conditions are raw SQL
// expressions (not wrapped in quotes). This is the backend counterpart of the fix for
// issue #422 regression where $adhoc was replaced by templateSrv with a quoted string.
func TestProcessAdhocFilters_ConditionFormat(t *testing.T) {
	tests := []struct {
		name              string
		filters           []AdhocFilter
		targetDatabase    string
		targetTable       string
		expectedCondition string
	}{
		{
			name: "StringValue_NoExtraQuotes",
			filters: []AdhocFilter{
				{Key: "default.test_grafana.service_name", Operator: "=", Value: "mysql"},
			},
			targetDatabase:    "default",
			targetTable:       "test_grafana",
			expectedCondition: "service_name = 'mysql'",
		},
		{
			name: "NumericValue_NoQuotes",
			filters: []AdhocFilter{
				{Key: "default.test_grafana.status", Operator: ">", Value: float64(200)},
			},
			targetDatabase:    "default",
			targetTable:       "test_grafana",
			expectedCondition: "status > 200",
		},
		{
			name: "LikeOperator",
			filters: []AdhocFilter{
				{Key: "default.test_grafana.service_name", Operator: "=~", Value: "mysql%"},
			},
			targetDatabase:    "default",
			targetTable:       "test_grafana",
			expectedCondition: "service_name LIKE 'mysql%'",
		},
		{
			name: "SimpleColumnName_MatchesTarget",
			filters: []AdhocFilter{
				{Key: "service_name", Operator: "=", Value: "mysql"},
			},
			targetDatabase:    "default",
			targetTable:       "test_grafana",
			expectedCondition: "service_name = 'mysql'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ProcessAdhocFilters(tt.filters, tt.targetDatabase, tt.targetTable, nil)
			if len(result) != 1 {
				t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
			}
			if result[0] != tt.expectedCondition {
				t.Errorf("Expected condition %q, got %q", tt.expectedCondition, result[0])
			}
		})
	}
}

// TestAdhocReplacementInQuery verifies the full $adhoc macro replacement flow
// as it happens in resource_handlers.go — conditions must be raw SQL, not quoted strings.
func TestAdhocReplacementInQuery(t *testing.T) {
	filters := []AdhocFilter{
		{Key: "default.test_grafana.service_name", Operator: "=", Value: "mysql"},
	}
	conditions := ProcessAdhocFilters(filters, "default", "test_grafana", nil)

	// Simulate $adhoc replacement from resource_handlers.go
	query := "SELECT t, sum(v) FROM default.test_grafana WHERE event_time BETWEEN 1 AND 2 AND $adhoc GROUP BY t ORDER BY t WITH FILL STEP(15000)"
	renderedCondition := "1"
	if len(conditions) > 0 {
		renderedCondition = "(" + strings.Join(conditions, " AND ") + ")"
	}
	result := strings.ReplaceAll(query, "$adhoc", renderedCondition)

	expected := "SELECT t, sum(v) FROM default.test_grafana WHERE event_time BETWEEN 1 AND 2 AND (service_name = 'mysql') GROUP BY t ORDER BY t WITH FILL STEP(15000)"
	if result != expected {
		t.Errorf("Unexpected query result.\nExpected: %s\nGot:      %s", expected, result)
	}

	// Must NOT contain the broken quoted format that templateSrv would produce
	if strings.Contains(result, "'default.test_grafana.service_name") {
		t.Error("Query contains quoted fully-qualified filter — this is the bug from issue #422 regression")
	}
}

func TestProcessAdhocFilters_ArrayLiteral(t *testing.T) {
	tests := []struct {
		name     string
		filter   AdhocFilter
		expected string
	}{
		{
			name:     "json string array becomes ClickHouse array literal",
			filter:   AdhocFilter{Key: "_arr", Operator: "=", Value: `["a","b"]`},
			expected: "_arr = ['a', 'b']",
		},
		{
			name:     "json numeric array stays unquoted",
			filter:   AdhocFilter{Key: "_arr", Operator: "=", Value: `[1,2,3]`},
			expected: "_arr = [1, 2, 3]",
		},
		{
			name:     "not-equals on array",
			filter:   AdhocFilter{Key: "_arr", Operator: "!=", Value: `["a"]`},
			expected: "_arr != ['a']",
		},
		{
			name:     "expand subscript scalar is unaffected",
			filter:   AdhocFilter{Key: "_map['host']", Operator: "=", Value: "web1"},
			expected: "_map['host'] = 'web1'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ProcessAdhocFilters([]AdhocFilter{tt.filter}, "default", "test_grafana", nil)
			if len(result) != 1 || result[0] != tt.expected {
				t.Errorf("got %v, want [%q]", result, tt.expected)
			}
		})
	}
}

// TestProcessAdhocFilters_BigNumberArray verifies that UInt64/Int64 values exceeding 2^53
// are rendered with exact digits (no scientific notation / float64 precision loss).
func TestProcessAdhocFilters_BigNumberArray(t *testing.T) {
	tests := []struct {
		name     string
		filter   AdhocFilter
		expected string
	}{
		{
			name: "uint64 max and int64 max stay exact",
			filter: AdhocFilter{
				Key:      "ids",
				Operator: "=",
				Value:    "[18446744073709551615, 9223372036854775807]",
			},
			expected: "ids = [18446744073709551615, 9223372036854775807]",
		},
		{
			name: "float array preserved",
			filter: AdhocFilter{
				Key:      "ids",
				Operator: "=",
				Value:    "[1.5, 2.5]",
			},
			expected: "ids = [1.5, 2.5]",
		},
		{
			name: "mixed string and integer array",
			filter: AdhocFilter{
				Key:      "ids",
				Operator: "=",
				Value:    `["a", 200]`,
			},
			expected: "ids = ['a', 200]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ProcessAdhocFilters([]AdhocFilter{tt.filter}, "default", "test_grafana", nil)
			if len(result) != 1 || result[0] != tt.expected {
				t.Errorf("got %v, want [%q]", result, tt.expected)
			}
		})
	}
}

// TestFormatAdhocScalar_BigNumber verifies that json.Number values are emitted verbatim
// without going through float64 (which would lose precision for large integers).
func TestFormatAdhocScalar_BigNumber(t *testing.T) {
	n := json.Number("18446744073709551615")
	got := formatAdhocScalar(n)
	want := "18446744073709551615"
	if got != want {
		t.Errorf("formatAdhocScalar(json.Number(%q)) = %q, want %q", n, got, want)
	}
}

// ---------------------------------------------------------------------------
// New tests: column/type-aware behavior
// ---------------------------------------------------------------------------

// TestProcessAdhocFilters_DotPathKeptWhenColumnKnown: a JSON dot-path key whose
// base name matches a real column must be treated as a column expression, not dropped
// as a db.table.col mismatch.
func TestProcessAdhocFilters_DotPathKeptWhenColumnKnown(t *testing.T) {
	columns := map[string]string{"j": "JSON"}
	filter := AdhocFilter{Key: "j.a.b", Operator: "=", Value: "GET"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "j.a.b = 'GET'"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestProcessAdhocFilters_TupleDotPathKept: a Tuple dot-path key is kept and
// the float64 value is formatted without spurious quotes.
func TestProcessAdhocFilters_TupleDotPathKept(t *testing.T) {
	columns := map[string]string{"coords": "Tuple(lat Float64, lon Float64)"}
	filter := AdhocFilter{Key: "coords.lat", Operator: "=", Value: float64(50.0)}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "coords.lat = 50"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestProcessAdhocFilters_OtherTableStillDropped: when the base name is NOT a known column,
// the legacy db.table.col parser runs and drops mismatched filters.
func TestProcessAdhocFilters_OtherTableStillDropped(t *testing.T) {
	// "j" is a known column but "otherdb" is not — so the legacy path runs and drops it.
	columns := map[string]string{"j": "JSON"}
	filter := AdhocFilter{Key: "otherdb.othertable.col", Operator: "=", Value: "x"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 0 {
		t.Errorf("Expected 0 conditions (mismatch should be dropped), got %d: %v", len(result), result)
	}
}

// TestProcessAdhocFilters_TypeAwareQuoting: Map subscript values are quoted
// according to the Map's value type (String → always quoted, Float64 → unquoted if numeric).
func TestProcessAdhocFilters_TypeAwareQuoting(t *testing.T) {
	columns := map[string]string{
		"_map":    "Map(String, String)",
		"metrics": "Map(String, Float64)",
	}

	tests := []struct {
		filter AdhocFilter
		want   string
	}{
		{
			filter: AdhocFilter{Key: "_map['code']", Operator: "=", Value: "200"},
			want:   "_map['code'] = '200'", // String value type → always quoted
		},
		{
			filter: AdhocFilter{Key: "metrics['lat']", Operator: "=", Value: "50"},
			want:   "metrics['lat'] = 50", // Float64 value type → unquoted numeric
		},
	}

	for _, tt := range tests {
		result := ProcessAdhocFilters([]AdhocFilter{tt.filter}, "default", "logs", columns)
		if len(result) != 1 {
			t.Fatalf("filter %q: expected 1 condition, got %d: %v", tt.filter.Key, len(result), result)
		}
		if result[0] != tt.want {
			t.Errorf("filter %q: got %q, want %q", tt.filter.Key, result[0], tt.want)
		}
	}
}

// TestLeafTypeForKey verifies the helper that resolves the leaf ClickHouse type
// for a filter key expression.
func TestLeafTypeForKey(t *testing.T) {
	tests := []struct {
		colType string
		key     string
		want    string
	}{
		{"Map(String, String)", "_map['code']", "String"},
		{"Map(String, Float64)", "metrics['lat']", "Float64"},
		{"Nullable(Map(String, String))", "_map['code']", "String"},
		{"JSON", "j.a.b", ""},    // dot path → unknown
		{"Tuple(lat Float64, lon Float64)", "coords.lat", ""}, // dot path → unknown
		{"String", "col", "String"},                           // plain column
		{"UInt64", "col", "UInt64"},
		{"", "col", ""},   // empty type → unknown
	}

	for _, tt := range tests {
		got := leafTypeForKey(tt.colType, tt.key)
		if got != tt.want {
			t.Errorf("leafTypeForKey(%q, %q) = %q, want %q", tt.colType, tt.key, got, tt.want)
		}
	}
}

// TestMapValueType verifies the Map value type extractor.
func TestMapValueType(t *testing.T) {
	tests := []struct {
		colType string
		want    string
	}{
		{"Map(String, String)", "String"},
		{"Map(String, Float64)", "Float64"},
		{"Map(String, Tuple(a UInt8, b String))", "Tuple(a UInt8, b String)"},
		{"Nullable(Map(String, String))", "String"},
		{"String", ""},  // not a Map
		{"Map(String)", ""}, // only one arg → malformed
	}

	for _, tt := range tests {
		got := mapValueType(tt.colType)
		if got != tt.want {
			t.Errorf("mapValueType(%q) = %q, want %q", tt.colType, got, tt.want)
		}
	}
}

// ---------------------------------------------------------------------------
// Fix 1: type-aware quoting must apply to numeric Go types (json.Number/float64)
// ---------------------------------------------------------------------------

// TestFormatAdhocValue_TypeAwareNumericTypes verifies that when leafType is a
// string family, numeric Go types (json.Number, float64) are coerced to a
// string form and quoted — the gap that Fix 1 closes.
// Regression cases verify nil/unknown-leaf path remains byte-identical.
func TestFormatAdhocValue_TypeAwareNumericTypes(t *testing.T) {
	tests := []struct {
		name     string
		v        interface{}
		leafType string
		want     string
	}{
		// NEW: numeric Go type → string-family leafType → must be quoted
		{"json.Number with String leafType", json.Number("200"), "String", "'200'"},
		{"float64 with String leafType", float64(200), "String", "'200'"},
		{"json.Number with FixedString leafType", json.Number("42"), "FixedString(10)", "'42'"},
		{"float64 apostrophe value with String leafType (escape)", float64(1), "String", "'1'"},
		// REGRESSION: nil/unknown leafType — behavior must be byte-identical to before
		{"json.Number with empty leafType", json.Number("200"), "", "200"},
		{"float64 with empty leafType", float64(200), "", "200"},
		{"string '200' with empty leafType", "200", "", "200"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatAdhocValue(tt.v, tt.leafType)
			if got != tt.want {
				t.Errorf("formatAdhocValue(%v, %q) = %q, want %q", tt.v, tt.leafType, got, tt.want)
			}
		})
	}
}

// TestProcessAdhocFilters_StringFamilyNumericGoTypes verifies Fix 1 end-to-end:
// json.Number arriving for a Map(String,String) column must be quoted;
// json.Number arriving for a Map(String,Float64) column must stay unquoted.
func TestProcessAdhocFilters_StringFamilyNumericGoTypes(t *testing.T) {
	columns := map[string]string{
		"_map":    "Map(String, String)",
		"metrics": "Map(String, Float64)",
	}

	tests := []struct {
		filter AdhocFilter
		want   string
	}{
		{
			filter: AdhocFilter{Key: "_map['code']", Operator: "=", Value: json.Number("200")},
			want:   "_map['code'] = '200'", // String value type → quoted even for json.Number
		},
		{
			filter: AdhocFilter{Key: "metrics['x']", Operator: "=", Value: json.Number("50")},
			want:   "metrics['x'] = 50", // Float64 value type → unquoted
		},
		{
			filter: AdhocFilter{Key: "_map['code']", Operator: "=", Value: float64(200)},
			want:   "_map['code'] = '200'", // float64 in String column → quoted
		},
	}

	for _, tt := range tests {
		t.Run(tt.filter.Key+"_"+tt.filter.Operator, func(t *testing.T) {
			result := ProcessAdhocFilters([]AdhocFilter{tt.filter}, "default", "logs", columns)
			if len(result) != 1 {
				t.Fatalf("filter %q: expected 1 condition, got %d: %v", tt.filter.Key, len(result), result)
			}
			if result[0] != tt.want {
				t.Errorf("filter %q: got %q, want %q", tt.filter.Key, result[0], tt.want)
			}
		})
	}
}

// TestProcessAdhocFilters_StringColumnBracketTextNotArray verifies that a String
// column value which happens to look like a JSON array (starts with '[') is NOT
// rewritten into a ClickHouse array literal — it must be quoted as a plain string.
func TestProcessAdhocFilters_StringColumnBracketTextNotArray(t *testing.T) {
	columns := map[string]string{"s": "String"}
	filter := AdhocFilter{Key: "s", Operator: "=", Value: `["not","an","array"]`}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := `s = '["not","an","array"]'`
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestProcessAdhocFilters_ArrayColumnStillLiteral verifies that a real Array(...)
// column still converts a JSON-array-shaped string value into a ClickHouse array literal.
func TestProcessAdhocFilters_ArrayColumnStillLiteral(t *testing.T) {
	columns := map[string]string{"arr": "Array(String)"}
	filter := AdhocFilter{Key: "arr", Operator: "=", Value: `["a","b"]`}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "arr = ['a', 'b']"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestProcessAdhocFilters_NilColumnsArrayLegacyPreserved verifies that when columns
// is nil (type unknown / legacy path), a JSON-array-shaped string value is still
// converted into a ClickHouse array literal, preserving pre-existing behavior.
func TestProcessAdhocFilters_NilColumnsArrayLegacyPreserved(t *testing.T) {
	filter := AdhocFilter{Key: "arr", Operator: "=", Value: `["a","b"]`}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "test_grafana", nil)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "arr = ['a', 'b']"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestIsArrayType verifies detection of Array(...) ClickHouse types, including
// through a Nullable(...) wrapper.
func TestIsArrayType(t *testing.T) {
	tests := []struct {
		chType string
		want   bool
	}{
		{"Array(String)", true},
		{"Nullable(Array(UInt8))", true},
		{"String", false},
		{"Map(String, String)", false},
	}

	for _, tt := range tests {
		t.Run(tt.chType, func(t *testing.T) {
			got := isArrayType(tt.chType)
			if got != tt.want {
				t.Errorf("isArrayType(%q) = %v, want %v", tt.chType, got, tt.want)
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

// ---------------------------------------------------------------------------
// Finding A: string-family passthrough regression — legacy behavior left
// pre-quoted / IN-list payloads (containing "'" or ", ") unquoted even for
// string-family columns. Force-quoting broke IN (...) adhoc filters.
// ---------------------------------------------------------------------------

// TestFormatAdhocValue_StringFamilyPassthrough verifies that string Go values
// containing "'" or ", " are passed through raw (legacy passthrough) even when
// leafType is a string-family type, while plain numeric-looking strings like
// "200" are still force-quoted.
func TestFormatAdhocValue_StringFamilyPassthrough(t *testing.T) {
	tests := []struct {
		name     string
		v        interface{}
		leafType string
		want     string
	}{
		{"IN-list payload passes through raw", "('error','warn')", "String", "('error','warn')"},
		{"value with comma-space passes through raw", "a, b", "String", "a, b"},
		{"apostrophe value passes through raw (legacy)", "O'Brien", "String", "O'Brien"},
		{"plain numeric-looking string still force-quoted", "200", "String", "'200'"},
		{"plain word still force-quoted", "mysql", "String", "'mysql'"},
		// Non-string Go types in string-family: keep current quoting behavior.
		{"json.Number with String leafType still quoted", json.Number("200"), "String", "'200'"},
		{"float64 with String leafType still quoted", float64(200), "String", "'200'"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatAdhocValue(tt.v, tt.leafType)
			if got != tt.want {
				t.Errorf("formatAdhocValue(%v, %q) = %q, want %q", tt.v, tt.leafType, got, tt.want)
			}
		})
	}
}

// TestProcessAdhocFilters_StringFamilyINList verifies the end-to-end condition
// for a String column with an IN-list style value and an "IN" operator: the
// operator passes through unchanged (only "=~"/"!~" are translated), and the
// value must be emitted raw, not force-quoted.
func TestProcessAdhocFilters_StringFamilyINList(t *testing.T) {
	columns := map[string]string{"level": "String"}
	filter := AdhocFilter{Key: "level", Operator: "IN", Value: "('error','warn')"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "level IN ('error','warn')"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestProcessAdhocFilters_StringFamilyNumericStringStillQuoted verifies the
// "200" fix from a prior commit is preserved: a numeric-looking string value
// on a String column is still force-quoted.
func TestProcessAdhocFilters_StringFamilyNumericStringStillQuoted(t *testing.T) {
	columns := map[string]string{"status": "String"}
	filter := AdhocFilter{Key: "status", Operator: "=", Value: "200"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "status = '200'"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestProcessAdhocFilters_StringFamilyApostrophePassthrough verifies legacy
// passthrough for a raw apostrophe-containing value on a String column.
func TestProcessAdhocFilters_StringFamilyApostrophePassthrough(t *testing.T) {
	columns := map[string]string{"name": "String"}
	filter := AdhocFilter{Key: "name", Operator: "=", Value: "O'Brien"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "name = O'Brien"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// ---------------------------------------------------------------------------
// Finding B: tryArrayLiteral must not silently truncate trailing text after
// a valid JSON array prefix (json.Decoder.Decode stops after the first value).
// ---------------------------------------------------------------------------

// TestTryArrayLiteral_TrailingTextRejected verifies that a string like
// "[404] upstream timeout" — which has a valid JSON array prefix followed by
// non-JSON trailing text — is NOT treated as an array literal.
func TestTryArrayLiteral_TrailingTextRejected(t *testing.T) {
	_, ok := tryArrayLiteral("[404] upstream timeout", "")
	if ok {
		t.Errorf("expected tryArrayLiteral to reject trailing text, but it accepted it")
	}
}

// TestTryArrayLiteral_TrailingWhitespaceAccepted verifies that trailing
// whitespace after the array (which json.Decoder skips) is still accepted.
func TestTryArrayLiteral_TrailingWhitespaceAccepted(t *testing.T) {
	lit, ok := tryArrayLiteral(`["a","b"] `, "")
	if !ok {
		t.Fatalf("expected tryArrayLiteral to accept trailing whitespace")
	}
	want := "['a', 'b']"
	if lit != want {
		t.Errorf("got %q, want %q", lit, want)
	}
}

// TestProcessAdhocFilters_TrailingTextFallsBackToScalar verifies the full
// pipeline: a value with a JSON-array-like prefix but trailing garbage text
// falls back to the scalar (quoted string) path instead of being silently
// truncated to just the array prefix.
func TestProcessAdhocFilters_TrailingTextFallsBackToScalar(t *testing.T) {
	filter := AdhocFilter{Key: "message", Operator: "=", Value: "[404] upstream timeout"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "test_grafana", nil)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "message = '[404] upstream timeout'"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// ---------------------------------------------------------------------------
// Findings C+D: dot-key column collision + Nested full-key lookup.
// ---------------------------------------------------------------------------

// TestProcessAdhocFilters_DottedKeyOnNonDotAccessibleColumnDropped verifies
// that a fully-qualified key for ANOTHER table (e.g. "logs.level") is not
// wrongly treated as a dot-path into a plain String column literally named
// "logs" on the current table — it must fall through to the legacy
// db.table.col matcher and be dropped on mismatch.
func TestProcessAdhocFilters_DottedKeyOnNonDotAccessibleColumnDropped(t *testing.T) {
	columns := map[string]string{"logs": "String"}
	filter := AdhocFilter{Key: "logs.level", Operator: "=", Value: "error"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 0 {
		t.Errorf("Expected 0 conditions (dotted key on non-dot-accessible column should be dropped), got %d: %v", len(result), result)
	}
}

// TestProcessAdhocFilters_NestedFlattenedColumnNameWithDot verifies that a
// real column whose NAME contains a dot (ClickHouse Nested flattening, e.g.
// "attr.key") is matched by exact name and kept as a column expression.
func TestProcessAdhocFilters_NestedFlattenedColumnNameWithDot(t *testing.T) {
	columns := map[string]string{"attr.key": "String"}
	filter := AdhocFilter{Key: "attr.key", Operator: "=", Value: "x"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "attr.key = 'x'"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestProcessAdhocFilters_JSONDotPathStillKept re-verifies (post-fix) that a
// JSON dot-path key is still kept as a column expression.
func TestProcessAdhocFilters_JSONDotPathStillKept(t *testing.T) {
	columns := map[string]string{"j": "JSON"}
	filter := AdhocFilter{Key: "j.a.b", Operator: "=", Value: "GET"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "j.a.b = 'GET'"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestProcessAdhocFilters_TupleDotPathStillKept re-verifies (post-fix) that a
// Tuple dot-path key is still kept as a column expression.
func TestProcessAdhocFilters_TupleDotPathStillKept(t *testing.T) {
	columns := map[string]string{"coords": "Tuple(lat Float64, lon Float64)"}
	filter := AdhocFilter{Key: "coords.lat", Operator: "=", Value: float64(50.0)}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "coords.lat = 50"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestProcessAdhocFilters_MapSubscriptStillKept re-verifies (post-fix) that a
// Map subscript key (bracket, no dot) is still kept as a column expression.
func TestProcessAdhocFilters_MapSubscriptStillKept(t *testing.T) {
	columns := map[string]string{"_map": "Map(String, String)"}
	filter := AdhocFilter{Key: "_map['host']", Operator: "=", Value: "web1"}
	result := ProcessAdhocFilters([]AdhocFilter{filter}, "default", "logs", columns)
	if len(result) != 1 {
		t.Fatalf("Expected 1 condition, got %d: %v", len(result), result)
	}
	want := "_map['host'] = 'web1'"
	if result[0] != want {
		t.Errorf("got %q, want %q", result[0], want)
	}
}

// TestIsDotAccessible verifies the helper distinguishing dot-accessible
// (JSON/Tuple/Nested/Object) ClickHouse types from plain scalar types.
func TestIsDotAccessible(t *testing.T) {
	tests := []struct {
		chType string
		want   bool
	}{
		{"JSON", true},
		{"Tuple(lat Float64, lon Float64)", true},
		{"Nested(a String, b UInt8)", true},
		{"Object('json')", true},
		{"Nullable(JSON)", true},
		{"String", false},
		{"UInt64", false},
		{"Map(String, String)", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.chType, func(t *testing.T) {
			got := isDotAccessible(tt.chType)
			if got != tt.want {
				t.Errorf("isDotAccessible(%q) = %v, want %v", tt.chType, got, tt.want)
			}
		})
	}
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
		ProcessAdhocFilters(filters, "system", "query_log", nil)
	}
}

// arrayElementType must extract the element type from Array(...) declarations.
func TestArrayElementType(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"Array(String)", "String"},
		{"Array(UInt64)", "UInt64"},
		{"Nullable(Array(UInt64))", "UInt64"},
		{"Array(Nullable(String))", "Nullable(String)"},
		{"String", ""},
		{"Map(String, String)", ""},
	}
	for _, tc := range cases {
		if got := arrayElementType(tc.in); got != tc.want {
			t.Errorf("arrayElementType(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// Array literals must be formatted by the COLUMN's element type, not by the
// JSON type of the incoming elements: under output_format_json_quote_64bit_integers=1
// ClickHouse serializes UInt64/Int64 array elements as strings, and comparing
// Array(UInt64) with Array(String) throws ILLEGAL_TYPE_OF_ARGUMENT (verified CH 26.1).
func TestProcessAdhocFilters_ArrayElementTypeAware(t *testing.T) {
	tests := []struct {
		name     string
		columns  map[string]string
		filter   AdhocFilter
		expected string
	}{
		{
			name:     "quote_64bit string elements on Array(UInt64) become unquoted numerics",
			columns:  map[string]string{"ids": "Array(UInt64)"},
			filter:   AdhocFilter{Key: "ids", Operator: "=", Value: `["18446744073709551615","7"]`},
			expected: "ids = [18446744073709551615, 7]",
		},
		{
			name:     "numeric-looking string elements on Array(String) stay quoted",
			columns:  map[string]string{"s": "Array(String)"},
			filter:   AdhocFilter{Key: "s", Operator: "=", Value: `["200","404"]`},
			expected: "s = ['200', '404']",
		},
		{
			name:     "hand-typed JSON numbers on Array(String) get quoted by element type",
			columns:  map[string]string{"s": "Array(String)"},
			filter:   AdhocFilter{Key: "s", Operator: "=", Value: `[200,404]`},
			expected: "s = ['200', '404']",
		},
		{
			name:     "nil columns keep legacy JSON-type-driven formatting",
			columns:  nil,
			filter:   AdhocFilter{Key: "arr", Operator: "=", Value: `["a","b"]`},
			expected: "arr = ['a', 'b']",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ProcessAdhocFilters([]AdhocFilter{tt.filter}, "default", "logs", tt.columns)
			if len(result) != 1 || result[0] != tt.expected {
				t.Errorf("got %v, want [%q]", result, tt.expected)
			}
		})
	}
}
