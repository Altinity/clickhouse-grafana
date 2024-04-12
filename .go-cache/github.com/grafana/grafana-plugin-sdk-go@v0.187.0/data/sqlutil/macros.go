package sqlutil

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var (
	// ErrorBadArgumentCount is returned from macros when the wrong number of arguments were provided
	ErrorBadArgumentCount = errors.New("unexpected number of arguments")
)

// MacroFunc defines a signature for applying a query macro
// Query macro implementations are defined by users/consumers of this package
type MacroFunc func(*Query, []string) (string, error)

// Macros is a list of MacroFuncs.
// The "string" key is the name of the macro function. This name has to be regex friendly.
type Macros map[string]MacroFunc

// Default time filter for SQL based on the query time range.
// It requires one argument, the time column to filter.
// Example:
//
//	$__timeFilter(time) => "time BETWEEN '2006-01-02T15:04:05Z07:00' AND '2006-01-02T15:04:05Z07:00'"
func macroTimeFilter(query *Query, args []string) (string, error) {
	if len(args) != 1 {
		return "", fmt.Errorf("%w: expected 1 argument, received %d", ErrorBadArgumentCount, len(args))
	}

	var (
		column = args[0]
		from   = query.TimeRange.From.UTC().Format(time.RFC3339)
		to     = query.TimeRange.To.UTC().Format(time.RFC3339)
	)

	return fmt.Sprintf("%s >= '%s' AND %s <= '%s'", column, from, column, to), nil
}

// Default time filter for SQL based on the starting query time range.
// It requires one argument, the time column to filter.
// Example:
//
//	$__timeFrom(time) => "time > '2006-01-02T15:04:05Z07:00'"
func macroTimeFrom(query *Query, args []string) (string, error) {
	if len(args) != 1 {
		return "", fmt.Errorf("%w: expected 1 argument, received %d", ErrorBadArgumentCount, len(args))
	}

	return fmt.Sprintf("%s >= '%s'", args[0], query.TimeRange.From.UTC().Format(time.RFC3339)), nil
}

// Default time filter for SQL based on the ending query time range.
// It requires one argument, the time column to filter.
// Example:
//
//	$__timeTo(time) => "time < '2006-01-02T15:04:05Z07:00'"
func macroTimeTo(query *Query, args []string) (string, error) {
	if len(args) != 1 {
		return "", fmt.Errorf("%w: expected 1 argument, received %d", ErrorBadArgumentCount, len(args))
	}

	return fmt.Sprintf("%s <= '%s'", args[0], query.TimeRange.To.UTC().Format(time.RFC3339)), nil
}

// Default time group for SQL based the given period.
// This basic example is meant to be customized with more complex periods.
// It requires two arguments, the column to filter and the period.
// Example:
//
//	$__timeTo(time, month) => "datepart(year, time), datepart(month, time)'"
func macroTimeGroup(_ *Query, args []string) (string, error) {
	if len(args) != 2 {
		return "", fmt.Errorf("%w: expected 1 argument, received %d", ErrorBadArgumentCount, len(args))
	}

	res := ""
	switch args[1] {
	case "minute":
		res += fmt.Sprintf("datepart(minute, %s),", args[0])
		fallthrough
	case "hour":
		res += fmt.Sprintf("datepart(hour, %s),", args[0])
		fallthrough
	case "day":
		res += fmt.Sprintf("datepart(day, %s),", args[0])
		fallthrough
	case "month":
		res += fmt.Sprintf("datepart(month, %s),", args[0])
		fallthrough
	case "year":
		res += fmt.Sprintf("datepart(year, %s)", args[0])
	}

	return res, nil
}

// Default macro to return the query table name.
// Example:
//
//	$__table => "my_table"
func macroTable(query *Query, _ []string) (string, error) {
	return query.Table, nil
}

// Default macro to return the query column name.
// Example:
//
//	$__column => "my_col"
func macroColumn(query *Query, _ []string) (string, error) {
	return query.Column, nil
}

var DefaultMacros = Macros{
	"timeFilter": macroTimeFilter,
	"timeFrom":   macroTimeFrom,
	"timeGroup":  macroTimeGroup,
	"timeTo":     macroTimeTo,
	"table":      macroTable,
	"column":     macroColumn,
}

func trimAll(s []string) []string {
	r := make([]string, len(s))
	for i, v := range s {
		r[i] = strings.TrimSpace(v)
	}

	return r
}

// getMacroMatches extracts macro strings with their respective arguments from the sql input given
// It manually parses the string to find the closing parenthesis of the macro (because regex has no memory)
func getMacroMatches(input string, name string) ([][]string, error) {
	macroName := fmt.Sprintf("\\$__%s\\b", name)
	matchedMacros := [][]string{}

	rgx, err := regexp.Compile(macroName)
	if err != nil {
		return nil, err
	}

	// get all matching macro instances
	matched := rgx.FindAllStringIndex(input, -1)
	if matched == nil {
		return nil, nil
	}

	for matchedIndex := 0; matchedIndex < len(matched); matchedIndex++ {
		var macroEnd = 0
		var argStart = 0
		// quick exit from the loop, when we encounter a closing bracket before an opening one (ie "($__macro)", where we can skip the closing one from the result)
		var forceBreak = false
		macroStart := matched[matchedIndex][0]
		inputCopy := input[macroStart:]
		cache := make([]rune, 0)

		// find the opening and closing arguments brackets
		for idx, r := range inputCopy {
			if len(cache) == 0 && macroEnd > 0 || forceBreak {
				break
			}
			switch r {
			case '(':
				cache = append(cache, r)
				if argStart == 0 {
					argStart = idx + 1
				}
			case ')':
				l := len(cache)
				if l == 0 {
					macroEnd = 0
					forceBreak = true
					break
				}
				cache = cache[:l-1]
				macroEnd = idx + 1
			default:
				continue
			}
		}

		// macroEnd equals to 0 means there are no parentheses, so just set it
		// to the end of the regex match
		if macroEnd == 0 {
			macroEnd = matched[matchedIndex][1] - macroStart
		}
		macroString := inputCopy[0:macroEnd]
		macroMatch := []string{macroString}

		args := ""
		// if opening parenthesis was found, extract contents as arguments
		if argStart > 0 {
			args = inputCopy[argStart : macroEnd-1]
		}
		macroMatch = append(macroMatch, args)
		matchedMacros = append(matchedMacros, macroMatch)
	}
	return matchedMacros, nil
}

// Interpolate returns an interpolated query string given a backend.DataQuery
func Interpolate(query *Query, macros Macros) (string, error) {
	for key, defaultMacro := range DefaultMacros {
		if _, ok := macros[key]; !ok {
			// If the driver doesn't define some macro, use the default one
			macros[key] = defaultMacro
		}
	}
	rawSQL := query.RawSQL

	for key, macro := range macros {
		matches, err := getMacroMatches(rawSQL, key)
		if err != nil {
			return rawSQL, err
		}

		for _, match := range matches {
			if len(match) == 0 {
				// There were no matches for this macro
				continue
			}

			args := []string{}
			if len(match) > 1 {
				// This macro has arguments
				args = trimAll(strings.Split(match[1], ","))
			}

			res, err := macro(query.WithSQL(rawSQL), args)
			if err != nil {
				return rawSQL, err
			}

			rawSQL = strings.ReplaceAll(rawSQL, match[0], res)
		}
	}

	return rawSQL, nil
}
