package adhoc

import (
	"fmt"
	"regexp"
	"strings"
)

// AdhocFilter represents a filter condition for ad-hoc queries
type AdhocFilter struct {
	Key      string      `json:"key"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

// ProcessAdhocFilters extracts the common logic for processing adhoc filters
// Returns a slice of SQL condition strings that can be used in WHERE clauses
func ProcessAdhocFilters(adhocFilters []AdhocFilter, targetDatabase, targetTable string) []string {
	var adhocConditions []string

	// Process each adhoc filter
	for _, filter := range adhocFilters {
		var parts []string
		if strings.Contains(filter.Key, ".") {
			parts = strings.Split(filter.Key, ".")
		} else {
			parts = []string{targetDatabase, targetTable, filter.Key}
		}

		// Add missing parts
		if len(parts) == 1 {
			parts = append([]string{targetTable}, parts...)
		}
		if len(parts) == 2 {
			parts = append([]string{targetTable}, parts...)
		}
		if len(parts) < 3 {
			continue
		}

		if targetDatabase != parts[0] || targetTable != parts[1] {
			continue
		}

		// Convert operator
		operator := filter.Operator
		switch operator {
		case "=~":
			operator = "LIKE"
		case "!~":
			operator = "NOT LIKE"
		}

		// Format value with consistent quoting
		var value string
		switch v := filter.Value.(type) {
		case float64:
			value = fmt.Sprintf("%g", v)
		case string:
			// Don't quote if it's already a number or contains special SQL syntax
			if regexp.MustCompile(`^\s*\d+(\.\d+)?\s*$`).MatchString(v) ||
				strings.Contains(v, "'") ||
				strings.Contains(v, ", ") {
				value = v
			} else {
				// Escape single quotes in string values
				escaped := strings.ReplaceAll(v, "'", "''")
				value = fmt.Sprintf("'%s'", escaped)
			}
		default:
			// For any other type, convert to string and escape quotes
			str := fmt.Sprintf("%v", v)
			escaped := strings.ReplaceAll(str, "'", "''")
			value = fmt.Sprintf("'%s'", escaped)
		}

		// Build the condition with proper spacing
		condition := fmt.Sprintf("%s %s %s", parts[2], operator, value)
		adhocConditions = append(adhocConditions, condition)
	}

	return adhocConditions
}
