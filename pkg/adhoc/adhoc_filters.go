package adhoc

import (
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strings"
)

// AdhocFilter represents a filter condition for ad-hoc queries
type AdhocFilter struct {
	Key      string      `json:"key"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

// numericValueRegex matches an integer or decimal string, optionally with surrounding whitespace.
var numericValueRegex = regexp.MustCompile(`^\s*\d+(\.\d+)?\s*$`)

// formatAdhocScalar quotes a scalar value for SQL, matching legacy behavior.
func formatAdhocScalar(v interface{}) string {
	switch val := v.(type) {
	case json.Number:
		return val.String() // exact digits, no float64/%g precision loss
	case float64:
		return fmt.Sprintf("%g", val)
	case string:
		if numericValueRegex.MatchString(val) ||
			strings.Contains(val, "'") ||
			strings.Contains(val, ", ") {
			return val
		}
		escaped := strings.ReplaceAll(val, "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	default:
		str := fmt.Sprintf("%v", val)
		escaped := strings.ReplaceAll(str, "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	}
}

// tryArrayLiteral converts a JSON-array string into a ClickHouse array literal.
// Returns ("", false) if v is not a JSON array.
// arrayElementType returns the element type of an Array(...) ClickHouse type,
// or "" when the type is not an array (or is unknown).
func arrayElementType(chType string) string {
	t := stripNullable(chType)
	if strings.HasPrefix(t, "Array(") && strings.HasSuffix(t, ")") {
		return strings.TrimSpace(t[len("Array(") : len(t)-1])
	}
	return ""
}

// formatArrayElement formats one array element honouring the COLUMN's element
// type when known. This matters because output_format_json_quote_64bit_integers=1
// (enabled for logs queries) makes ClickHouse serialize UInt64/Int64 array
// elements as JSON strings — formatting by JSON type alone would produce
// Array(String) literals that fail to compare against Array(UInt64) columns
// (ILLEGAL_TYPE_OF_ARGUMENT, verified on ClickHouse 26.1).
func formatArrayElement(e interface{}, elemType string) string {
	if elemType != "" && isStringFamily(elemType) {
		// String-family elements are ALWAYS quoted, even when they look numeric.
		var s string
		switch ev := e.(type) {
		case string:
			s = ev
		case json.Number:
			s = ev.String()
		case bool:
			s = fmt.Sprintf("%t", ev)
		default:
			s = fmt.Sprintf("%v", ev)
		}
		return fmt.Sprintf("'%s'", strings.ReplaceAll(s, "'", "''"))
	}
	if elemType != "" && isNumericFamily(elemType) {
		// Numeric-family elements stay unquoted; numeric-looking strings are
		// emitted as bare numbers (exact digits — no float64 round-trip).
		switch ev := e.(type) {
		case json.Number:
			return ev.String()
		case string:
			if numericValueRegex.MatchString(ev) {
				return ev
			}
			return fmt.Sprintf("'%s'", strings.ReplaceAll(ev, "'", "''"))
		case bool:
			return fmt.Sprintf("%t", ev)
		default:
			return fmt.Sprintf("'%v'", ev)
		}
	}
	// Unknown element type: legacy JSON-type-driven formatting.
	switch ev := e.(type) {
	case string:
		return fmt.Sprintf("'%s'", strings.ReplaceAll(ev, "'", "''"))
	case json.Number:
		return ev.String() // exact digits, no float64/%g precision loss
	case bool:
		return fmt.Sprintf("%t", ev)
	default:
		return fmt.Sprintf("'%v'", ev)
	}
}

func tryArrayLiteral(v interface{}, elemType string) (string, bool) {
	s, ok := v.(string)
	if !ok {
		return "", false
	}
	trimmed := strings.TrimSpace(s)
	if !strings.HasPrefix(trimmed, "[") {
		return "", false
	}
	dec := json.NewDecoder(strings.NewReader(trimmed))
	dec.UseNumber()
	var elems []interface{}
	if err := dec.Decode(&elems); err != nil {
		return "", false
	}
	// Guard against json.Decoder.Decode parsing only a prefix and silently
	// discarding trailing text (e.g. "[404] upstream timeout" -> [404]).
	// Requiring the next token to be io.EOF ensures the ENTIRE string was
	// consumed as the array (trailing whitespace is skipped by the decoder
	// and still satisfies this check).
	if _, err := dec.Token(); err != io.EOF {
		return "", false
	}
	parts := make([]string, 0, len(elems))
	for _, e := range elems {
		parts = append(parts, formatArrayElement(e, elemType))
	}
	return "[" + strings.Join(parts, ", ") + "]", true
}

// baseColumnName extracts the base column name from a key by taking the segment
// before the first '.' or '['. Used to distinguish column paths from db.table.col keys.
// Examples: "j.a.b" → "j", "coords.lat" → "coords", "_map['host']" → "_map", "error" → "error".
func baseColumnName(key string) string {
	end := len(key)
	if i := strings.IndexAny(key, ".["); i >= 0 {
		end = i
	}
	return key[:end]
}

// stripNullable removes a Nullable(...) wrapper from a ClickHouse type string.
func stripNullable(colType string) string {
	trimmed := strings.TrimSpace(colType)
	if strings.HasPrefix(trimmed, "Nullable(") && strings.HasSuffix(trimmed, ")") {
		return strings.TrimSpace(trimmed[len("Nullable(") : len(trimmed)-1])
	}
	return trimmed
}

// splitTopLevelArgs splits a comma-separated argument string at the top nesting level
// (respecting parentheses). Used for parsing Map(K, V) type arguments.
func splitTopLevelArgs(s string) []string {
	var args []string
	depth := 0
	start := 0
	for i := 0; i < len(s); i++ {
		switch s[i] {
		case '(':
			depth++
		case ')':
			depth--
		case ',':
			if depth == 0 {
				args = append(args, strings.TrimSpace(s[start:i]))
				start = i + 1
			}
		}
	}
	args = append(args, strings.TrimSpace(s[start:]))
	return args
}

// mapValueType returns the value type of a Map(K, V) ClickHouse type.
// Strips Nullable(...) before matching. Returns "" if not a Map or unparseable.
func mapValueType(colType string) string {
	t := stripNullable(colType)
	if !strings.HasPrefix(t, "Map(") || !strings.HasSuffix(t, ")") {
		return ""
	}
	inner := t[len("Map(") : len(t)-1]
	args := splitTopLevelArgs(inner)
	if len(args) < 2 {
		return ""
	}
	return args[1]
}

// leafTypeForKey returns the ClickHouse type to use for quoting decisions given
// the column's declared type and the filter key expression.
// Returns "" when the leaf type cannot be determined (JSON/Tuple dot paths).
func leafTypeForKey(colType, key string) string {
	if colType == "" {
		return ""
	}
	// Map subscript col['k'] -> resolve to the Map's value type
	if strings.Contains(key, "[") {
		stripped := stripNullable(colType)
		if strings.HasPrefix(stripped, "Map(") {
			return mapValueType(colType)
		}
	}
	// Dot path into JSON/Tuple -> leaf type unknown
	if strings.Contains(key, ".") {
		return ""
	}
	// Plain column reference
	return colType
}

// isStringFamily returns true if t is a string-family ClickHouse type whose
// values should always be quoted regardless of content.
func isStringFamily(t string) bool {
	stripped := stripNullable(t)
	return stripped == "String" ||
		strings.HasPrefix(stripped, "FixedString(") ||
		strings.HasPrefix(stripped, "LowCardinality(") ||
		strings.HasPrefix(stripped, "Enum8(") ||
		strings.HasPrefix(stripped, "Enum16(") ||
		strings.HasPrefix(stripped, "Enum(") ||
		stripped == "UUID" ||
		stripped == "IPv4" ||
		stripped == "IPv6"
}

// dotAccessibleTypeRegex matches ClickHouse types that support dot-path
// access into their fields (JSON, Tuple, Nested, legacy Object), after
// stripping a Nullable(...) wrapper. Mirrors the frontend's
// pathStyleForType dot-list.
var dotAccessibleTypeRegex = regexp.MustCompile(`(?i)^(JSON|Tuple|Nested|Object)\b`)

// isDotAccessible returns true if chType is a ClickHouse type whose values
// support dot-path field access (JSON/Tuple/Nested/Object), looking through
// a Nullable(...) wrapper.
func isDotAccessible(chType string) bool {
	if chType == "" {
		return false
	}
	return dotAccessibleTypeRegex.MatchString(stripNullable(chType))
}

// isArrayType returns true if chType is an Array(...) ClickHouse type,
// looking through a Nullable(...) wrapper.
func isArrayType(chType string) bool {
	return strings.HasPrefix(strings.TrimSpace(stripNullable(chType)), "Array(")
}

// isNumericFamily returns true if t is a numeric ClickHouse type.
func isNumericFamily(t string) bool {
	stripped := stripNullable(t)
	return strings.HasPrefix(stripped, "UInt") ||
		strings.HasPrefix(stripped, "Int") ||
		strings.HasPrefix(stripped, "Float") ||
		strings.HasPrefix(stripped, "Decimal")
}

// formatAdhocValue formats a filter value for SQL with type-aware quoting.
// When leafType is "", it delegates to formatAdhocScalar (byte-identical legacy behavior).
func formatAdhocValue(v interface{}, leafType string) string {
	// Fix 1: when the column's leaf type is a string family, ALL Go value types
	// (including json.Number and float64) must be coerced to a string form and
	// emitted as a quoted SQL literal. This block ONLY runs when leafType is
	// known; the nil/unknown path (leafType=="") falls through to formatAdhocScalar
	// unchanged.
	if leafType != "" && isStringFamily(leafType) {
		// Legacy passthrough: a string value that already looks pre-quoted or
		// like an IN-list payload (contains "'" or ", ") is emitted AS-IS,
		// matching the historical formatAdhocScalar behavior. This must take
		// priority over force-quoting so that filters like
		// level IN ('error','warn') keep working with introspection ON.
		if s, ok := v.(string); ok && (strings.Contains(s, "'") || strings.Contains(s, ", ")) {
			return s
		}
		var s string
		switch val := v.(type) {
		case string:
			s = val
		case json.Number:
			s = val.String()
		case float64:
			s = fmt.Sprintf("%v", val)
		default:
			s = fmt.Sprintf("%v", val)
		}
		return fmt.Sprintf("'%s'", strings.ReplaceAll(s, "'", "''"))
	}

	// Numeric-family leaf: numeric-looking strings stay unquoted, everything else quoted.
	if s, ok := v.(string); ok && isNumericFamily(leafType) {
		if numericValueRegex.MatchString(s) {
			return s
		}
		return fmt.Sprintf("'%s'", strings.ReplaceAll(s, "'", "''"))
	}
	// Everything else (unknown leaf type, non-string Go values): legacy scalar behavior —
	// json.Number keeps exact digits, float64 uses %g, strings use the historical heuristics.
	return formatAdhocScalar(v)
}

// ProcessAdhocFilters extracts the common logic for processing adhoc filters.
// Returns a slice of SQL condition strings that can be used in WHERE clauses.
//
// columns is an optional map of current-table column name → ClickHouse type.
// When non-nil, keys whose base name matches a real column are treated as column
// expressions (dot-path or bracket subscript) rather than db.table.col references,
// and values are quoted according to the column type.
// When nil or empty, behavior is byte-identical to the legacy implementation.
func ProcessAdhocFilters(adhocFilters []AdhocFilter, targetDatabase, targetTable string, columns map[string]string) []string {
	var adhocConditions []string

	for _, filter := range adhocFilters {
		var columnExpr string
		var colType string
		resolved := false

		if len(columns) > 0 {
			if ct, ok := columns[filter.Key]; ok {
				// Exact column name match — including Nested flattened names
				// that themselves contain a dot (e.g. "attr.key").
				columnExpr, colType, resolved = filter.Key, ct, true
			} else {
				base := baseColumnName(filter.Key)
				if bt, ok := columns[base]; ok {
					hasBracket := strings.Contains(filter.Key, "[")
					hasDot := strings.Contains(filter.Key, ".")
					if hasBracket && !hasDot {
						// Map subscript: _map['host']
						columnExpr, colType, resolved = filter.Key, bt, true
					} else if hasDot && isDotAccessible(bt) {
						// JSON/Tuple/Nested dot path: j.a.b, coords.lat
						columnExpr, colType, resolved = filter.Key, bt, true
					} else if !hasBracket && !hasDot {
						// Plain column reference.
						columnExpr, colType, resolved = filter.Key, bt, true
					}
					// else: a dotted (or dotted+bracketed) key whose base column
					// does not support dot access — e.g. "logs.level" where "logs"
					// is a plain String column. This is NOT a column path; fall
					// through to the legacy db.table.col matcher below, which will
					// drop it on mismatch (or keep it if it happens to resolve to
					// the current database/table).
				}
			}
		}

		if !resolved {
			// LEGACY behavior (unchanged): handle db.table.col fully-qualified keys,
			// drop filters whose db/table don't match the target.
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

			columnExpr = parts[2]
		}

		// Convert operator
		operator := filter.Operator
		switch operator {
		case "=~":
			operator = "LIKE"
		case "!~":
			operator = "NOT LIKE"
		}

		// Format value: array literal for JSON arrays (only when the column's leaf
		// type is an Array(...) or unknown), else type-aware scalar quoting.
		leaf := leafTypeForKey(colType, filter.Key)
		var value string
		if leaf == "" || isArrayType(leaf) {
			if lit, ok := tryArrayLiteral(filter.Value, arrayElementType(leaf)); ok {
				value = lit
			} else {
				value = formatAdhocValue(filter.Value, leaf)
			}
		} else {
			value = formatAdhocValue(filter.Value, leaf)
		}

		condition := fmt.Sprintf("%s %s %s", columnExpr, operator, value)
		adhocConditions = append(adhocConditions, condition)
	}

	return adhocConditions
}
