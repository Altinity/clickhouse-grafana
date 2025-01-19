package main

import (
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/dlclark/regexp2"
)

/* var NumberOnlyRegexp = regexp.MustCompile(`^[+-]?\d+(\.\d+)?$`) */

var timeSeriesMacroRegexp = regexp.MustCompile(`\$timeSeries\b`)
var timeSeriesMsMacroRegexp = regexp.MustCompile(`\$timeSeriesMs\b`)
var naturalTimeSeriesMacroRegexp = regexp.MustCompile(`\$naturalTimeSeries\b`)
var timeFilterMacroRegexp = regexp.MustCompile(`\$timeFilter\b`)
var timeFilterMsMacroRegexp = regexp.MustCompile(`\$timeFilterMs\b`)
var tableMacroRegexp = regexp.MustCompile(`\$table\b`)
var fromMacroRegexp = regexp.MustCompile(`\$from\b`)
var toMacroRegexp = regexp.MustCompile(`\$to\b`)
var dateColMacroRegexp = regexp.MustCompile(`\$dateCol\b`)
var dateTimeColMacroRegexp = regexp.MustCompile(`\$dateTimeCol\b`)
var intervalMacroRegexp = regexp.MustCompile(`\$interval\b`)
var timeFilterByColumnMacroRegexp = regexp.MustCompile(`\$timeFilterByColumn\(([\w_]+)\)`)
var timeFilter64ByColumnMacroRegexp = regexp.MustCompile(`\$timeFilter64ByColumn\(([\w_]+)\)`)

var fromMsMacroRegexp = regexp.MustCompile(`\$__from\b`)
var toMsMacroRegexp = regexp.MustCompile(`\$__to\b`)
var intervalMsMacroRegexp = regexp.MustCompile(`\$__interval_ms\b`)

type EvalQuery struct {
	RefId                  string `json:"refId"`
	RuleUid                string
	RawQuery               bool   `json:"rawQuery"`
	Query                  string `json:"query"`
	DateTimeCol            string `json:"dateTimeColDataType"`
	DateCol                string `json:"dateColDataType"`
	DateTimeType           string `json:"dateTimeType"`
	Extrapolate            bool   `json:"extrapolate"`
	SkipComments           bool   `json:"skip_comments"`
	AddMetadata            bool   `json:"add_metadata"`
	UseWindowFuncForMacros bool   `json:"useWindowFuncForMacros"`
	Format                 string `json:"format"`
	Round                  string `json:"round"`
	IntervalFactor         int    `json:"intervalFactor"`
	Interval               string `json:"interval"`
	IntervalSec            int
	IntervalMs             int
	Database               string `json:"database"`
	Table                  string `json:"table"`
	MaxDataPoints          int64
	From                   time.Time
	To                     time.Time
}

func (q *EvalQuery) ApplyMacrosAndTimeRangeToQuery() (string, error) {
	query, err := q.replace(q.Query)
	if err != nil {
		return "", err
	}
	return query, nil
}

func (q *EvalQuery) replace(query string) (string, error) {
	var err error
	query = strings.Trim(query, " \xA0\t\r\n")
	if q.DateTimeType == "" {
		q.DateTimeType = "DATETIME"
	}
	/* @TODO research other data sources how they calculate MaxDataPoints on unified alerts */
	if q.IntervalFactor == 0 {
		q.IntervalFactor = 1
	}
	i := 1 * time.Second
	ms := 1 * time.Millisecond
	if q.Interval != "" {
		duration, err := time.ParseDuration(q.Interval)
		if err != nil {
			return "", err
		}
		q.IntervalSec = int(math.Ceil(duration.Seconds()))
		q.IntervalMs = int(duration.Milliseconds())
	}
	if q.IntervalSec <= 0 {
		if q.MaxDataPoints > 0 {
			i = q.To.Sub(q.From) / time.Duration(q.MaxDataPoints)
		} else {
			i = q.To.Sub(q.From) / 100
		}
		if i > 1*time.Millisecond && q.IntervalMs <= 0 {
			ms = i
		}
		if i < 1*time.Second {
			i = 1 * time.Second
		}
		q.IntervalSec, err = q.convertInterval(fmt.Sprintf("%fs", math.Ceil(i.Seconds())), q.IntervalFactor, false)
		if err != nil {
			return "", err
		}
	}
	if q.IntervalMs <= 0 {
		q.IntervalMs, err = q.convertInterval(fmt.Sprintf("%dms", ms.Milliseconds()), q.IntervalFactor, true)
		if err != nil {
			return "", err
		}
	}
	scanner := newScanner(query)
	ast, err := scanner.toAST()
	if err != nil {
		return "", fmt.Errorf("parse AST error: %v ", err)
	}
	topQueryAST := ast

	query, err = q.applyMacros(query, topQueryAST)
	if err != nil {
		return "", fmt.Errorf("applyMacros error: %v", err)
	}

	if q.SkipComments {
		query, err = scanner.RemoveComments(query)
		if err != nil {
			return "", err
		}
	}

	if q.AddMetadata {
		query = scanner.AddMetadata(query, q)
	}

	query, err = q.unescape(query)
	if err != nil {
		return "", err
	}

	timeFilter := q.getDateTimeFilter(q.DateTimeType)
	timeFilterMs := q.getDateTimeFilterMs(q.DateTimeType)
	if q.DateCol != "" {
		timeFilter = q.getDateFilter() + " AND " + timeFilter
		timeFilterMs = q.getDateFilter() + " AND " + timeFilterMs
	}

	table := q.escapeTableIdentifier(q.Table)
	if q.Database != "" {
		table = q.escapeTableIdentifier(q.Database) + "." + table
	}

	myRound, err := q.convertInterval(q.Round, q.IntervalFactor, false)
	if err != nil {
		return "", err
	}
	if q.Round == "$step" {
		myRound = q.IntervalSec
	}
	from := q.convertTimestamp(q.round(q.From, myRound))
	to := q.convertTimestamp(q.round(q.To, myRound))

	query = timeSeriesMacroRegexp.ReplaceAllString(query, strings.Replace(q.getTimeSeries(q.DateTimeType), "$", "$$", -1))
	query = timeSeriesMsMacroRegexp.ReplaceAllString(query, strings.Replace(q.getTimeSeriesMs(q.DateTimeType), "$", "$$", -1))
	query = naturalTimeSeriesMacroRegexp.ReplaceAllString(query, strings.Replace(q.getNaturalTimeSeries(q.DateTimeType, from, to), "$", "$$", -1))
	query = timeFilterMacroRegexp.ReplaceAllString(query, strings.Replace(timeFilter, "$", "$$", -1))
	query = timeFilterMsMacroRegexp.ReplaceAllString(query, strings.Replace(timeFilterMs, "$", "$$", -1))
	query = tableMacroRegexp.ReplaceAllString(query, table)
	query = fromMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", from))
	query = toMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", to))
	query = fromMsMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", q.From.UnixMilli()))
	query = toMsMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", q.To.UnixMilli()))
	query = dateColMacroRegexp.ReplaceAllString(query, q.escapeIdentifier(q.DateCol))
	query = dateTimeColMacroRegexp.ReplaceAllString(query, q.escapeIdentifier(q.DateTimeCol))
	query = intervalMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", q.IntervalSec))
	query = intervalMsMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", q.IntervalMs))

	query = q.replaceTimeFilters(query, myRound)

	return query, nil
}

func (q *EvalQuery) escapeIdentifier(identifier string) string {
	if regexp.MustCompile(`^[a-zA-Z][0-9a-zA-Z_]+$`).MatchString(identifier) || regexp.MustCompile(`\(.*\)`).MatchString(identifier) || regexp.MustCompile(`[/*+\-]`).MatchString(identifier) {
		return identifier
	} else {
		return `"` + strings.Replace(identifier, `"`, `\"`, -1) + `"`
	}
}

func (q *EvalQuery) escapeTableIdentifier(identifier string) string {
	if regexp.MustCompile(`^[a-zA-Z][0-9a-zA-Z_]+$`).MatchString(identifier) {
		return identifier
	} else {
		return "`" + strings.Replace(identifier, "`", "\\`", -1) + "`"
	}
}

func (q *EvalQuery) replaceRegexpWithCallBack(re *regexp.Regexp, str string, replacer func([]string) string) string {
	result := ""
	lastIndex := 0
	for _, v := range re.FindAllSubmatchIndex([]byte(str), -1) {
		var groups []string
		for i := 0; i < len(v); i += 2 {
			groups = append(groups, str[v[i]:v[i+1]])
		}
		result += str[lastIndex:v[0]] + replacer(groups)
		lastIndex = v[1]
	}
	return result + str[lastIndex:]
}

func (q *EvalQuery) replaceTimeFilters(query string, round int) string {
	from := q.round(q.From, round)
	to := q.round(q.To, round)

	// Extend date range to be sure that first and last points
	// data is not affected by round
	if round > 0 {
		to = to.Add(time.Duration((round*2)-1) * time.Second)
		from = from.Add(-time.Duration((round*2)-1) * time.Second)
	}

	fromTS := q.convertTimestamp(from)
	toTS := q.convertTimestamp(to)

	query = q.replaceRegexpWithCallBack(timeFilterByColumnMacroRegexp, query, func(groups []string) string {
		return q.getFilterSqlForDateTime(groups[1], q.DateTimeType)
	})

	query = q.replaceRegexpWithCallBack(timeFilter64ByColumnMacroRegexp, query, func(groups []string) string {
		return q.getFilterSqlForDateTimeMs(groups[1], q.DateTimeType)
	})

	query = fromMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", fromTS))
	query = toMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", toTS))

	query = fromMsMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", from.UnixMilli()))
	query = toMsMacroRegexp.ReplaceAllString(query, fmt.Sprintf("%d", to.UnixMilli()))

	return query
}

func (q *EvalQuery) getFilterSqlForDateTimeMs(columnName string, dateTimeType string) string {
	var convertFn = func(t string) string {
		if dateTimeType == "DATETIME" {
			return "toDateTime(" + t + ")"
		}

		if dateTimeType == "DATETIME64" {
			return "toDateTime64(" + t + ",3)"
		}
		if dateTimeType == "FLOAT" {
			return t + "/1000"
		}
		if dateTimeType == "TIMESTAMP" {
			return t + "/1000"
		}
		if dateTimeType == "TIMESTAMP64_3" {
			return t
		}
		if dateTimeType == "TIMESTAMP64_6" {
			return "1000*" + t
		}
		if dateTimeType == "TIMESTAMP64_9" {
			return "1000000*" + t
		}
		return t
	}
	var from = "$__from"
	var to = "$__to"
	if dateTimeType == "DATETIME64" || dateTimeType == "DATETIME" {
		from = "$__from/1000"
		to = "$__to/1000"
	}
	return fmt.Sprintf("%s >= %s AND %s <= %s", columnName, convertFn(from), columnName, convertFn(to))
}

func (q *EvalQuery) getFilterSqlForDateTime(columnName string, dateTimeType string) string {
	var convertFn = func(t string) string {
		if dateTimeType == "DATETIME" {
			return "toDateTime(" + t + ")"
		}
		if dateTimeType == "DATETIME64" {
			return "toDateTime64(" + t + ",3)"
		}
		if dateTimeType == "TIMESTAMP64_3" {
			return "1000*" + t
		}
		if dateTimeType == "TIMESTAMP64_6" {
			return "1000000*" + t
		}
		if dateTimeType == "TIMESTAMP64_9" {
			return "1000000000*" + t
		}
		return t
	}
	var from = "$from"
	var to = "$to"
	if dateTimeType == "DATETIME64" {
		from = "$__from/1000"
		to = "$__to/1000"
	}
	return fmt.Sprintf("%s >= %s AND %s <= %s", columnName, convertFn(from), columnName, convertFn(to))
}

func (q *EvalQuery) applyMacros(query string, ast *EvalAST) (string, error) {
	if q.contain(ast, "$columns") {
		return q.columns(query, ast)
	}
	if q.contain(ast, "$columnsMs") {
		return q.columnsMs(query, ast)
	}
	if q.contain(ast, "$rateColumnsAggregated") {
		return q.rateColumnsAggregated(query, ast)
	}
	if q.contain(ast, "$rateColumns") {
		return q.rateColumns(query, ast)
	}
	if q.contain(ast, "$rate") {
		return q.rate(query, ast)
	}
	if q.contain(ast, "$perSecond") {
		return q.perSecond(query, ast)
	}
	if q.contain(ast, "$perSecondColumns") {
		return q.perSecondColumns(query, ast)
	}
	if q.contain(ast, "$perSecondColumnsAggregated") {
		return q.perSecondColumnsAggregated(query, ast)
	}
	if q.contain(ast, "$deltaColumnsAggregated") {
		return q.deltaColumnsAggregated(query, ast)
	}
	if q.contain(ast, "$delta") {
		return q.delta(query, ast)
	}
	if q.contain(ast, "$deltaColumns") {
		return q.deltaColumns(query, ast)
	}
	if q.contain(ast, "$increase") {
		return q.increase(query, ast)
	}
	if q.contain(ast, "$increaseColumns") {
		return q.increaseColumns(query, ast)
	}
	if q.contain(ast, "$increaseColumnsAggregated") {
		return q.increaseColumnsAggregated(query, ast)
	}
	return query, nil
}

func (q *EvalQuery) contain(ast *EvalAST, field string) bool {
	value, hasValue := ast.Obj[field]
	return hasValue && value != nil && len(value.(*EvalAST).Arr) > 0
}

func (q *EvalQuery) _parseMacro(macro string, query string) ([]string, error) {
	var mLen = len(macro)
	var mPos = strings.Index(query, macro)
	if mPos == -1 || query[mPos:mPos+mLen+1] != macro+"(" {
		return []string{query, ""}, nil
	}
	var fromIndex, err = q._fromIndex(query, macro)
	if err != nil {
		return nil, err
	}
	return []string{query[0:mPos], query[fromIndex:]}, nil
}

func (q *EvalQuery) columns(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$columns", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	args := ast.Obj["$columns"].(*EvalAST).Arr
	if args == nil || len(args) != 2 {
		return "", fmt.Errorf("amount of arguments must equal 2 for $columns func. Parsed arguments are: %v", ast.Obj["$columns"])
	}
	return q._columns(args[0].(string), args[1].(string), beforeMacrosQuery, fromQuery, false)
}

func (q *EvalQuery) columnsMs(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$columnsMs", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	args := ast.Obj["$columnsMs"].(*EvalAST).Arr
	if args == nil || len(args) != 2 {
		return "", fmt.Errorf("amount of arguments must equal 2 for $columnsMs func. Parsed arguments are: %v", ast.Obj["$columnsMs"])
	}
	return q._columns(args[0].(string), args[1].(string), beforeMacrosQuery, fromQuery, true)
}

func (q *EvalQuery) _columns(key, value, beforeMacrosQuery, fromQuery string, useMs bool) (string, error) {
	if key[len(key)-1] == ')' || value[len(value)-1] == ')' {
		return "", fmt.Errorf("some of passed arguments are without aliases: %s, %s", key, value)
	}
	var keySplit = strings.Split(strings.Trim(key, " \xA0\t\r\n"), " ")
	var keyAlias = keySplit[len(keySplit)-1]
	var valueSplit = strings.Split(strings.Trim(value, " \xA0\t\r\n"), " ")
	var valueAlias = valueSplit[len(valueSplit)-1]
	var groupByQuery = " GROUP BY t, " + keyAlias
	var orderByQuery = " ORDER BY t, " + keyAlias
	var havingQuery = ""
	if matched, err := regexp.MatchString(`(?mi)^\s*FROM\s*\(`, fromQuery); err == nil && !matched {
		var groupByIndex = findKeywordOutsideBrackets(strings.ToLower(fromQuery), "group by")
		var havingIndex = findKeywordOutsideBrackets(strings.ToLower(fromQuery), "having")
		var orderByIndex = findKeywordOutsideBrackets(strings.ToLower(fromQuery), "order by")

		if havingIndex >= 0 && orderByIndex >= 0 && havingIndex >= orderByIndex {
			return "", fmt.Errorf("ORDER BY clause shall be before HAVING")
		}

		if groupByIndex >= 0 && orderByIndex >= 0 && groupByIndex >= orderByIndex {
			return "", fmt.Errorf("GROUP BY clause shall be before ORDER BY")
		}

		if groupByIndex >= 0 && havingIndex >= 0 && groupByIndex >= havingIndex {
			return "", fmt.Errorf("GROUP BY clause shall be before HAVING")
		}

		if orderByIndex != -1 {
			orderByQuery = " " + fromQuery[orderByIndex:]
			fromQuery = fromQuery[0 : orderByIndex-1]
		}
		if havingIndex != -1 {
			havingQuery = " " + fromQuery[havingIndex:]
			fromQuery = fromQuery[0 : havingIndex-1]
		}
		if groupByIndex != -1 {
			groupByQuery = " " + fromQuery[groupByIndex:]
			fromQuery = fromQuery[0 : groupByIndex-1]
		}
	}
	fromQuery = q._applyTimeFilter(fromQuery, useMs)
	timeSeriesMacro := "$timeSeries"
	if useMs {
		timeSeriesMacro = "$timeSeriesMs"
	}
	return beforeMacrosQuery + "SELECT" +
		" t," +
		" groupArray((" + keyAlias + ", " + valueAlias + ")) AS groupArr" +
		" FROM (" +
		" SELECT " + timeSeriesMacro + " AS t" +
		", " + key +
		", " + value + " " +
		fromQuery +
		groupByQuery +
		havingQuery +
		orderByQuery +
		")" +
		" GROUP BY t" +
		" ORDER BY t", nil
}

func findKeywordOutsideBrackets(query, keyword string) int {
	bracketDepth := 0
	keywordRegex := regexp.MustCompile("(?i)" + regexp.QuoteMeta(keyword)) // Case-insensitive match

	for i := 0; i < len(query); i++ {
		switch query[i] {
		case '(':
			bracketDepth++
		case ')':
			if bracketDepth > 0 {
				bracketDepth--
			}
		default:
			if bracketDepth == 0 {
				// Check if the current segment matches the keyword
				if keywordRegex.MatchString(query[i:]) {
					// Check if this match is really starting at i
					if matchIndexes := keywordRegex.FindStringIndex(query[i:]); matchIndexes != nil && matchIndexes[0] == 0 {
						return i // Match found at index i
					}
				}
			}
		}
	}

	return -1 // No match found
}

func (q *EvalQuery) rateColumns(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$rateColumns", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	var args = ast.Obj["$rateColumns"].(*EvalAST).Arr
	if args == nil || len(args) != 2 {
		return "", fmt.Errorf("amount of arguments must equal 2 for $rateColumns func. Parsed arguments are: %v", args)
	}

	query, err = q._columns(args[0].(string), args[1].(string), "", fromQuery, false)
	if err != nil {
		return "", err
	}
	var timeChange string
	if q.UseWindowFuncForMacros {
		timeChange = "(t/1000 - lagInFrame(t/1000,1,0) OVER ())"
	} else {
		timeChange = "runningDifference( t/1000 )"
	}

	return beforeMacrosQuery + "SELECT t" +
		", arrayMap(a -> (a.1, a.2/" + timeChange + "), groupArr)" +
		" FROM (" +
		query +
		")", nil
}

func (q *EvalQuery) _prepareColumnsAggregated(macroName string, query string, ast *EvalAST) (string, string, string, string, string, string, string, []string, []string, []string, error) {
	macroQueries, err := q._parseMacro(macroName, query)
	if err != nil {
		return "", "", "", "", "", "", "", nil, nil, nil, err
	}

	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return "", "", "", "", "", "", "", nil, nil, nil, nil
	}
	var args = ast.Obj[macroName].(*EvalAST).Arr

	if args == nil || len(args) < 4 {
		return "", "", "", "", "", "", "", nil, nil, nil, fmt.Errorf("expect 2 or more amount of arguments for $*ColumnsAggregated macro functions. Parsed arguments are: %v", args)
	}

	var havingIndex = strings.Index(strings.ToLower(fromQuery), "having")
	var having = ""

	if havingIndex != -1 {
		having = " " + fromQuery[havingIndex:]
		fromQuery = fromQuery[0 : havingIndex-1]
	}
	fromQuery = q._applyTimeFilter(fromQuery, false)

	var key = args[0].(string)
	var keySplit = strings.Split(strings.Trim(key, " \xA0\t\r\n"), " ")
	var keyAlias = keySplit[len(keySplit)-1]
	var subKey = args[1].(string)
	var subKeySplit = strings.Split(strings.Trim(subKey, " \xA0\t\r\n"), " ")
	var subKeyAlias = subKeySplit[len(subKeySplit)-1]

	if len(args)%2 != 0 {
		return "", "", "", "", "", "", "", nil, nil, nil, fmt.Errorf("wrong arguments count, expect argument pairs aggregate function and value for "+macroName+" function. Parsed arguments are: %v", args)
	}
	var values []string
	var aliases []string
	var aggFuncs []string
	for i := 2; i < len(args); i += 2 {
		aggFuncs = append(aggFuncs, args[i].(string))

		value := args[i+1].(string)
		aliasSplit := strings.Split(strings.Trim(value, " \xA0\t\r\n"), " ")
		alias := aliasSplit[len(aliasSplit)-1]
		aliases = append(aliases, alias)

		if len(aliasSplit) > 1 {
			value = strings.Join(aliasSplit[:len(aliasSplit)-1], " ")
			value = strings.TrimSuffix(strings.TrimSuffix(value, " AS"), " as")
		}

		if !strings.Contains(value, "(") {
			value = "max(" + value + ")"
		}
		values = append(values, value+" AS "+alias)
	}
	return beforeMacrosQuery, fromQuery, having, key, keyAlias, subKey, subKeyAlias, values, aliases, aggFuncs, nil
}

func (q *EvalQuery) _formatColumnsAggregatedSQL(beforeMacrosQuery string, fromQuery string, key string, keyAlias string, subKey string, subKeyAlias string, values []string, finalValues []string, finalAggregatedValues []string, having string) string {
	return beforeMacrosQuery +
		"SELECT t, " + keyAlias + ", " + strings.Join(finalAggregatedValues, ", ") +
		" FROM (" +
		"  SELECT t, " + keyAlias + ", " + subKeyAlias + ", " + strings.Join(finalValues, ", ") +
		"  FROM (" +
		"   SELECT $timeSeries AS t, " + key + ", " + subKey + ", " + strings.Join(values, ", ") +
		"   " + fromQuery +
		"   GROUP BY " + keyAlias + ", " + subKeyAlias + ", t " + having +
		"   ORDER BY " + keyAlias + ", " + subKeyAlias + ", t" +
		"  )" +
		" ) " +
		"GROUP BY " + keyAlias + ", t ORDER BY " + keyAlias + ", t"
}

func (q *EvalQuery) rateColumnsAggregated(query string, ast *EvalAST) (string, error) {
	beforeMacrosQuery, fromQuery, having, key, keyAlias, subKey, subKeyAlias, values, aliases, aggFuncs, err := q._prepareColumnsAggregated("$rateColumnsAggregated", query, ast)
	if err != nil {
		return "", err
	}
	if len(fromQuery) < 1 {
		return query, nil
	}
	var finalAggregatedValues []string
	var finalValues []string
	for i, a := range aliases {
		finalAggregatedValues = append(finalAggregatedValues, aggFuncs[i]+"("+a+"Rate) AS "+a+"RateAgg")
		if q.UseWindowFuncForMacros {
			finalValues = append(finalValues, a+" / (t/1000 - lagInFrame(t/1000,1,0) OVER ()) AS "+a+"Rate")
		} else {
			finalValues = append(finalValues, a+" / runningDifference(t / 1000) AS "+a+"Rate")
		}
	}

	return q._formatColumnsAggregatedSQL(beforeMacrosQuery, fromQuery, key, keyAlias, subKey, subKeyAlias, values, finalValues, finalAggregatedValues, having), nil
}

func (q *EvalQuery) perSecondColumnsAggregated(query string, ast *EvalAST) (string, error) {
	beforeMacrosQuery, fromQuery, having, key, keyAlias, subKey, subKeyAlias, values, aliases, aggFuncs, err := q._prepareColumnsAggregated("$perSecondColumnsAggregated", query, ast)
	if err != nil {
		return "", err
	}
	if len(fromQuery) < 1 {
		return query, nil
	}
	var finalAggregatedValues []string
	var finalValues []string
	for i, a := range aliases {
		finalAggregatedValues = append(finalAggregatedValues, aggFuncs[i]+"("+a+"PerSecond) AS "+a+"PerSecondAgg")
		if q.UseWindowFuncForMacros {
			finalValues = append(finalValues, "if(("+a+" - lagInFrame("+a+",1,0) OVER ()) < 0 OR "+
				"lagInFrame("+subKeyAlias+",1,"+subKeyAlias+") OVER () != "+subKeyAlias+", nan, "+
				"("+a+" - lagInFrame("+a+",1,0) OVER ()) / (t/1000 - lagInFrame(t/1000,1,0) OVER ())) AS "+a+"PerSecond",
			)
		} else {
			finalValues = append(finalValues, "if(runningDifference("+a+") < 0 OR neighbor("+subKeyAlias+",-1,"+subKeyAlias+") != "+subKeyAlias+", nan, runningDifference("+a+") / runningDifference(t / 1000)) AS "+a+"PerSecond")
		}
	}

	return q._formatColumnsAggregatedSQL(beforeMacrosQuery, fromQuery, key, keyAlias, subKey, subKeyAlias, values, finalValues, finalAggregatedValues, having), nil
}

func (q *EvalQuery) increaseColumnsAggregated(query string, ast *EvalAST) (string, error) {
	beforeMacrosQuery, fromQuery, having, key, keyAlias, subKey, subKeyAlias, values, aliases, aggFuncs, err := q._prepareColumnsAggregated("$increaseColumnsAggregated", query, ast)
	if err != nil {
		return "", err
	}
	if len(fromQuery) < 1 {
		return query, nil
	}
	var finalAggregatedValues []string
	var finalValues []string
	for i, a := range aliases {
		finalAggregatedValues = append(finalAggregatedValues, aggFuncs[i]+"("+a+"Increase) AS "+a+"IncreaseAgg")
		if q.UseWindowFuncForMacros {
			finalValues = append(finalValues, "if(("+a+" - lagInFrame("+a+",1,0) OVER ()) < 0 OR "+
				"lagInFrame("+subKeyAlias+",1,"+subKeyAlias+") OVER () != "+subKeyAlias+
				", nan, ("+a+" - lagInFrame("+a+",1,0) OVER ()) / 1) AS "+a+"Increase",
			)
		} else {
			finalValues = append(finalValues, "if(runningDifference("+a+") < 0 OR neighbor("+subKeyAlias+",-1,"+subKeyAlias+") != "+subKeyAlias+", nan, runningDifference("+a+") / 1) AS "+a+"Increase")
		}
	}

	return q._formatColumnsAggregatedSQL(beforeMacrosQuery, fromQuery, key, keyAlias, subKey, subKeyAlias, values, finalValues, finalAggregatedValues, having), nil
}

func (q *EvalQuery) deltaColumnsAggregated(query string, ast *EvalAST) (string, error) {
	beforeMacrosQuery, fromQuery, having, key, keyAlias, subKey, subKeyAlias, values, aliases, aggFuncs, err := q._prepareColumnsAggregated("$deltaColumnsAggregated", query, ast)
	if err != nil {
		return "", err
	}
	if len(fromQuery) < 1 {
		return query, nil
	}
	var finalAggregatedValues []string
	var finalValues []string
	for i, a := range aliases {
		finalAggregatedValues = append(finalAggregatedValues, aggFuncs[i]+"("+a+"Delta) AS "+a+"DeltaAgg")
		if q.UseWindowFuncForMacros {
			finalValues = append(finalValues, "if(lagInFrame("+subKeyAlias+",1,"+subKeyAlias+") OVER () != "+subKeyAlias+", 0, "+a+" - lagInFrame("+a+",1,0) OVER ()) AS "+a+"Delta")
		} else {
			finalValues = append(finalValues, "if(neighbor("+subKeyAlias+",-1,"+subKeyAlias+") != "+subKeyAlias+", 0, runningDifference("+a+") / 1) AS "+a+"Delta")
		}
	}

	return q._formatColumnsAggregatedSQL(beforeMacrosQuery, fromQuery, key, keyAlias, subKey, subKeyAlias, values, finalValues, finalAggregatedValues, having), nil
}

func (q *EvalQuery) _fromIndex(query, macro string) (int, error) {
	var fromRe = regexp.MustCompile("(?im)\\" + macro + "\\([\\w\\s\\S]+?\\)(\\s+FROM\\s+)")
	var matches = fromRe.FindStringSubmatchIndex(query)
	if len(matches) == 0 {
		return 0, fmt.Errorf("could not find FROM-statement at: %s", query)
	}
	var fragmentWithFrom = query[matches[len(matches)-2]:matches[len(matches)-1]]
	var fromRelativeIndex = strings.Index(strings.ToLower(fragmentWithFrom), "from")
	return matches[1] - len(fragmentWithFrom) + fromRelativeIndex, nil
}

func (q *EvalQuery) rate(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$rate", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	var args = ast.Obj["$rate"].(*EvalAST).Arr
	if args == nil || len(args) < 1 {
		return "", fmt.Errorf("amount of arguments must be > 0 for $rate func. Parsed arguments are: %v ", args)
	}

	return q._rate(args, beforeMacrosQuery, fromQuery)
}

func (q *EvalQuery) _rate(args []interface{}, beforeMacrosQuery, fromQuery string) (string, error) {
	var aliases = make([]string, len(args))
	var argsStr = make([]string, len(args))
	for i, arg := range args {
		str := arg.(string)
		if str[len(str)-1] == ')' {
			return "", fmt.Errorf("argument %v cant be used without alias", str)
		}
		argSplit := strings.Split(strings.Trim(str, " \xA0\t\r\n"), " ")
		aliases[i] = argSplit[len(argSplit)-1]
		argsStr[i] = arg.(string)
	}

	var cols []string
	for _, a := range aliases {
		if q.UseWindowFuncForMacros {
			cols = append(cols, a+"/((t - lagInFrame(t,1,0) OVER ())/1000) "+a+"Rate")
		} else {
			cols = append(cols, a+"/runningDifference(t/1000) "+a+"Rate")
		}
	}

	fromQuery = q._applyTimeFilter(fromQuery, false)
	return beforeMacrosQuery + "SELECT " +
		"t," +
		" " + strings.Join(cols, ", ") +
		" FROM (" +
		" SELECT $timeSeries AS t" +
		", " + strings.Join(argsStr, ", ") +
		" " + fromQuery +
		" GROUP BY t" +
		" ORDER BY t" +
		")", nil
}

func (q *EvalQuery) perSecondColumns(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$perSecondColumns", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	var args = ast.Obj["$perSecondColumns"].(*EvalAST).Arr
	if len(args) != 2 {
		return "", fmt.Errorf("amount of arguments must equal 2 for $perSecondColumns func. Parsed arguments are: %v", args)
	}

	var key = args[0].(string)
	var value = "max(" + strings.Trim(args[1].(string), " \xA0\t\r\n") + ") AS max_0"
	var havingIndex = strings.Index(strings.ToLower(fromQuery), "having")
	var having = ""
	var aliasIndex = strings.Index(strings.ToLower(key), " as ")
	var alias = "perSecondColumns"
	if aliasIndex == -1 {
		key = key + " AS " + alias
	} else {
		alias = key[aliasIndex+4:]
	}

	if havingIndex != -1 {
		having = " " + fromQuery[havingIndex:]
		fromQuery = fromQuery[0 : havingIndex-1]
	}
	fromQuery = q._applyTimeFilter(fromQuery, false)
	var maxPerSecond string
	if q.UseWindowFuncForMacros {
		maxPerSecond = "if((max_0 - lagInFrame(max_0,1,0) OVER ()) < 0 OR lagInFrame(" + alias + ",1," + alias + ") OVER () != " + alias +
			", nan, (max_0 - lagInFrame(max_0,1,0) OVER ()) / (t/1000 - lagInFrame(t/1000,1,0) OVER ()))"
	} else {
		maxPerSecond = "if(runningDifference(max_0) < 0 OR neighbor(" + alias + ",-1," + alias + ") != " + alias + ", nan, runningDifference(max_0) / runningDifference(t/1000))"
	}
	return beforeMacrosQuery + "SELECT" +
		" t," +
		" groupArray((" + alias + ", max_0_PerSecond)) AS groupArr" +
		" FROM (" +
		" SELECT t," +
		" " + alias +
		", " + maxPerSecond + " AS max_0_PerSecond" +
		" FROM (" +
		" SELECT $timeSeries AS t" +
		", " + key +
		", " + value + " " +
		fromQuery +
		" GROUP BY t, " + alias +
		having +
		" ORDER BY " + alias + ", t" +
		")" +
		")" +
		" GROUP BY t" +
		" ORDER BY t", nil
}

func (q *EvalQuery) deltaColumns(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$deltaColumns", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	var args = ast.Obj["$deltaColumns"].(*EvalAST).Arr
	if len(args) != 2 {
		return "", fmt.Errorf("amount of arguments must equal 2 for $deltaColumns func. Parsed arguments are: %v", args)
	}

	var key = args[0].(string)
	var value = "max(" + strings.Trim(args[1].(string), " \xA0\t\r\n") + ") AS max_0"
	var havingIndex = strings.Index(strings.ToLower(fromQuery), "having")
	var having = ""
	var aliasIndex = strings.Index(strings.ToLower(key), " as ")
	var alias = "deltaColumns"
	if aliasIndex == -1 {
		key = key + " AS " + alias
	} else {
		alias = key[aliasIndex+4:]
	}

	if havingIndex != -1 {
		having = " " + fromQuery[havingIndex:]
		fromQuery = fromQuery[0 : havingIndex-1]
	}
	fromQuery = q._applyTimeFilter(fromQuery, false)

	var maxDelta string
	if q.UseWindowFuncForMacros {
		maxDelta = "if(lagInFrame(" + alias + ",1," + alias + ") OVER () != " + alias + ", 0, max_0 - lagInFrame(max_0,1,0) OVER ())"
	} else {
		maxDelta = "if(neighbor(" + alias + ",-1," + alias + ") != " + alias + ", 0, runningDifference(max_0))"
	}

	return beforeMacrosQuery + "SELECT" +
		" t," +
		" groupArray((" + alias + ", max_0_Delta)) AS groupArr" +
		" FROM (" +
		" SELECT t," +
		" " + alias +
		", " + maxDelta + " AS max_0_Delta" +
		" FROM (" +
		" SELECT $timeSeries AS t" +
		", " + key +
		", " + value + " " +
		fromQuery +
		" GROUP BY t, " + alias +
		having +
		" ORDER BY " + alias + ", t" +
		")" +
		")" +
		" GROUP BY t" +
		" ORDER BY t", nil
}

func (q *EvalQuery) increaseColumns(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$increaseColumns", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	var args = ast.Obj["$increaseColumns"].(*EvalAST).Arr
	if len(args) != 2 {
		return "", fmt.Errorf("amount of arguments must equal 2 for $increaseColumns func. Parsed arguments are: %v", args)
	}

	var key = args[0].(string)
	var value = "max(" + strings.Trim(args[1].(string), " \xA0\t\r\n") + ") AS max_0"
	var havingIndex = strings.Index(strings.ToLower(fromQuery), "having")
	var having = ""
	var aliasIndex = strings.Index(strings.ToLower(key), " as ")
	var alias = "increaseColumns"
	if aliasIndex == -1 {
		key = key + " AS " + alias
	} else {
		alias = key[aliasIndex+4:]
	}

	if havingIndex != -1 {
		having = " " + fromQuery[havingIndex:]
		fromQuery = fromQuery[0 : havingIndex-1]
	}
	fromQuery = q._applyTimeFilter(fromQuery, false)
	var maxIncrease string
	if q.UseWindowFuncForMacros {
		maxIncrease = "if((max_0 - lagInFrame(max_0,1,0) OVER ()) < 0 OR lagInFrame(" + alias + ",1," + alias + ") OVER () != " + alias + ", 0, max_0 - lagInFrame(max_0,1,0) OVER ())"
	} else {
		maxIncrease = "if(runningDifference(max_0) < 0 OR neighbor(" + alias + ",-1," + alias + ") != " + alias + ", 0, runningDifference(max_0))"
	}

	return beforeMacrosQuery + "SELECT" +
		" t," +
		" groupArray((" + alias + ", max_0_Increase)) AS groupArr" +
		" FROM (" +
		" SELECT t," +
		" " + alias +
		", " + maxIncrease + " AS max_0_Increase" +
		" FROM (" +
		" SELECT $timeSeries AS t" +
		", " + key +
		", " + value + " " +
		fromQuery +
		" GROUP BY t, " + alias +
		having +
		" ORDER BY " + alias + ", t" +
		")" +
		")" +
		" GROUP BY t" +
		" ORDER BY t", nil
}

func (q *EvalQuery) perSecond(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$perSecond", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	var args = ast.Obj["$perSecond"].(*EvalAST).Arr
	if len(args) < 1 {
		return "", fmt.Errorf("amount of arguments must be > 0 for $perSecond func. Parsed arguments are: %v", args)
	}
	for i, a := range args {
		args[i] = fmt.Sprintf("max("+strings.Trim(a.(string), " \xA0\t\r\n")+") AS max_%d", i)
	}

	return q._perSecond(args, beforeMacrosQuery, fromQuery)
}

func (q *EvalQuery) _perSecond(args []interface{}, beforeMacrosQuery, fromQuery string) (string, error) {
	var cols = make([]string, len(args))
	var argsStr = make([]string, len(args))
	for i, item := range args {
		argsStr[i] = item.(string)
		if q.UseWindowFuncForMacros {
			cols[i] = fmt.Sprintf("if(max_%d - lagInFrame(max_%d,1,0) OVER () < 0, nan, "+
				"(max_%d - lagInFrame(max_%d,1,0) OVER ()) "+
				"/ ((t - lagInFrame(t,1,0) OVER ())/1000) ) AS max_%d_PerSecond",
				i, i, i, i, i)
		} else {
			cols[i] = fmt.Sprintf("if(runningDifference(max_%d) < 0, nan, runningDifference(max_%d) / runningDifference(t/1000)) AS max_%d_PerSecond", i, i, i)
		}
	}

	fromQuery = q._applyTimeFilter(fromQuery, false)
	return beforeMacrosQuery + "SELECT " +
		"t," +
		" " + strings.Join(cols, ", ") +
		" FROM (" +
		" SELECT $timeSeries AS t," +
		" " + strings.Join(argsStr, ", ") +
		" " + fromQuery +
		" GROUP BY t" +
		" ORDER BY t" +
		")", nil
}

func (q *EvalQuery) delta(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$delta", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	var args = ast.Obj["$delta"].(*EvalAST).Arr
	if len(args) < 1 {
		return "", fmt.Errorf("amount of arguments must be > 0 for $delta func. Parsed arguments are: %v", args)
	}
	for i, a := range args {
		args[i] = fmt.Sprintf("max("+strings.Trim(a.(string), " \xA0\t\r\n")+") AS max_%d", i)
	}

	return q._delta(args, beforeMacrosQuery, fromQuery)
}

func (q *EvalQuery) _delta(args []interface{}, beforeMacrosQuery, fromQuery string) (string, error) {
	var cols = make([]string, len(args))
	var argsStr = make([]string, len(args))
	for i, item := range args {
		argsStr[i] = item.(string)
		if q.UseWindowFuncForMacros {
			cols[i] = fmt.Sprintf("max_%d - lagInFrame(max_%d,1,0) OVER () AS max_%d_Delta", i, i, i)
		} else {
			cols[i] = fmt.Sprintf("runningDifference(max_%d) AS max_%d_Delta", i, i)
		}
	}

	fromQuery = q._applyTimeFilter(fromQuery, false)
	return beforeMacrosQuery + "SELECT " +
		"t," +
		" " + strings.Join(cols, ", ") +
		" FROM (" +
		" SELECT $timeSeries AS t," +
		" " + strings.Join(argsStr, ", ") +
		" " + fromQuery +
		" GROUP BY t" +
		" ORDER BY t" +
		")", nil
}

func (q *EvalQuery) increase(query string, ast *EvalAST) (string, error) {
	macroQueries, err := q._parseMacro("$increase", query)
	if err != nil {
		return "", err
	}
	beforeMacrosQuery, fromQuery := macroQueries[0], macroQueries[1]
	if len(fromQuery) < 1 {
		return query, nil
	}
	var args = ast.Obj["$increase"].(*EvalAST).Arr
	if len(args) < 1 {
		return "", fmt.Errorf("amount of arguments must be > 0 for $increase func. Parsed arguments are: %v", args)
	}
	for i, a := range args {
		args[i] = fmt.Sprintf("max("+strings.Trim(a.(string), " \xA0\t\r\n")+") AS max_%d", i)
	}

	return q._increase(args, beforeMacrosQuery, fromQuery)
}

func (q *EvalQuery) _increase(args []interface{}, beforeMacrosQuery, fromQuery string) (string, error) {
	var cols = make([]string, len(args))
	var argsStr = make([]string, len(args))
	for i, item := range args {
		argsStr[i] = item.(string)
		if q.UseWindowFuncForMacros {
			cols[i] = fmt.Sprintf("if((max_%d - lagInFrame(max_%d,1,0) OVER ()) < 0, 0, max_%d - lagInFrame(max_%d,1,0) OVER ()) AS max_%d_Increase", i, i, i, i, i)
		} else {
			cols[i] = fmt.Sprintf("if(runningDifference(max_%d) < 0, 0, runningDifference(max_%d)) AS max_%d_Increase", i, i, i)
		}
	}

	fromQuery = q._applyTimeFilter(fromQuery, false)
	return beforeMacrosQuery + "SELECT " +
		"t," +
		" " + strings.Join(cols, ", ") +
		" FROM (" +
		" SELECT $timeSeries AS t," +
		" " + strings.Join(argsStr, ", ") +
		" " + fromQuery +
		" GROUP BY t" +
		" ORDER BY t" +
		")", nil
}

func (q *EvalQuery) _applyTimeFilter(query string, useMs bool) string {
	timeFilterMacro := "$timeFilter"
	if useMs {
		timeFilterMacro = "$timeFilterMs"
	}
	if strings.Contains(strings.ToLower(query), "where") {
		whereRe := regexp.MustCompile("(?i)where")
		//don't delete $ it needs for replacing with regexp
		query = whereRe.ReplaceAllString(query, "WHERE $"+timeFilterMacro+" AND")
	} else {
		query += " WHERE " + timeFilterMacro
	}

	return query
}

func (q *EvalQuery) getNaturalTimeSeries(dateTimeType string, from, to int64) string {
	const SomeMinutes = 60 * 20
	const FewHours = 60 * 60 * 4
	const SomeHours = 60 * 60 * 24
	const ManyHours = 60 * 60 * 72
	const FewDays = 60 * 60 * 24 * 15
	const ManyWeeks = 60 * 60 * 24 * 7 * 15
	const FewMonths = 60 * 60 * 24 * 30 * 10
	const FewYears = 60 * 60 * 24 * 365 * 6
	if dateTimeType == "DATETIME" || dateTimeType == "DATETIME64" {
		var duration = to - from
		if duration < SomeMinutes {
			return "toUInt32($dateTimeCol) * 1000"
		} else if duration < FewHours {
			return "toUInt32(toStartOfMinute($dateTimeCol)) * 1000"
		} else if duration < SomeHours {
			return "toUInt32(toStartOfFiveMinute($dateTimeCol)) * 1000"
		} else if duration < ManyHours {
			return "toUInt32(toStartOfFifteenMinutes($dateTimeCol)) * 1000"
		} else if duration < FewDays {
			return "toUInt32(toStartOfHour($dateTimeCol)) * 1000"
		} else if duration < ManyWeeks {
			return "toUInt32(toStartOfDay($dateTimeCol)) * 1000"
		} else if duration < FewMonths {
			return "toUInt32(toDateTime(toMonday($dateTimeCol))) * 1000"
		} else if duration < FewYears {
			return "toUInt32(toDateTime(toStartOfMonth($dateTimeCol))) * 1000"
		} else {
			return "toUInt32(toDateTime(toStartOfQuarter($dateTimeCol))) * 1000"
		}
	}
	return "(intDiv($dateTimeCol, $interval) * $interval) * 1000"
}

func (q *EvalQuery) getTimeSeries(dateTimeType string) string {
	if dateTimeType == "DATETIME" {
		return "(intDiv(toUInt32($dateTimeCol), $interval) * $interval) * 1000"
	}
	if dateTimeType == "DATETIME64" {
		return "(intDiv(toFloat64($dateTimeCol) * 1000, ($interval * 1000)) * ($interval * 1000))"
	}
	if dateTimeType == "FLOAT" {
		return "(intDiv($dateTimeCol * 1000, ($interval * 1000)) * ($interval * 1000))"
	}
	if dateTimeType == "TIMESTAMP64_3" {
		return "(intDiv($dateTimeCol, ($interval * 1000)) * ($interval * 1000))"
	}
	if dateTimeType == "TIMESTAMP64_6" {
		return "(intDiv($dateTimeCol / 1000, ($interval * 1000)) * ($interval * 1000))"
	}
	if dateTimeType == "TIMESTAMP64_9" {
		return "(intDiv($dateTimeCol / 1000000, ($interval * 1000)) * ($interval * 1000))"
	}
	return "(intDiv($dateTimeCol, $interval) * $interval) * 1000"
}

func (q *EvalQuery) getTimeSeriesMs(dateTimeType string) string {
	if dateTimeType == "DATETIME" {
		return "(intDiv(toUInt32($dateTimeCol) * 1000, $__interval_ms) * $__interval_ms)"
	}
	if dateTimeType == "DATETIME64" {
		return "(intDiv(toFloat64($dateTimeCol) * 1000, $__interval_ms) * $__interval_ms)"
	}
	if dateTimeType == "TIMESTAMP" {
		return "(intDiv($dateTimeCol * 1000, $__interval_ms) * $__interval_ms)"
	}
	if dateTimeType == "FLOAT" {
		return "(intDiv($dateTimeCol * 1000, $__interval_ms) * $__interval_ms)"
	}
	if dateTimeType == "TIMESTAMP64_3" {
		return "(intDiv($dateTimeCol, $__interval_ms) * $__interval_ms)"
	}
	if dateTimeType == "TIMESTAMP64_6" {
		return "(intDiv($dateTimeCol / 1000, $__interval_ms) * $__interval_ms)"
	}
	if dateTimeType == "TIMESTAMP64_9" {
		return "(intDiv($dateTimeCol / 1000000, $__interval_ms) * $__interval_ms)"
	}
	return "(intDiv($dateTimeCol, $__interval_ms) * $__interval_ms)"
}

func (q *EvalQuery) getDateFilter() string {
	return "$dateCol >= toDate($from) AND $dateCol <= toDate($to)"
}

func (q *EvalQuery) getDateTimeFilter(dateTimeType string) string {
	convertFn := func(t string) string {
		if dateTimeType == "DATETIME" {
			return "toDateTime(" + t + ")"
		}
		if dateTimeType == "DATETIME64" {
			return "toDateTime64(" + t + ",3)"
		}
		if dateTimeType == "FLOAT" {
			return t
		}
		if dateTimeType == "TIMESTAMP" {
			return t
		}
		if dateTimeType == "TIMESTAMP64_3" {
			return "1000*" + t
		}
		if dateTimeType == "TIMESTAMP64_6" {
			return "1000000*" + t
		}
		if dateTimeType == "TIMESTAMP64_9" {
			return "1000000000*" + t
		}
		return t
	}
	return "$dateTimeCol >= " + convertFn("$from") + " AND $dateTimeCol <= " + convertFn("$to")
}

func (q *EvalQuery) getDateTimeFilterMs(dateTimeType string) string {
	convertFn := func(t string) string {
		if dateTimeType == "DATETIME" {
			return "toDateTime(" + t + "/1000)"
		}
		if dateTimeType == "DATETIME64" {
			return "toDateTime64(" + t + "/1000,3)"
		}
		if dateTimeType == "FLOAT" {
			return "toFloat64(" + t + "/1000)"
		}
		if dateTimeType == "TIMESTAMP" {
			return "" + t + "/1000"
		}
		if dateTimeType == "TIMESTAMP64_3" {
			return t
		}
		if dateTimeType == "TIMESTAMP64_6" {
			return "1000*" + t
		}
		if dateTimeType == "TIMESTAMP64_9" {
			return "1000000*" + t
		}
		return t
	}
	return "$dateTimeCol >= " + convertFn("$__from") + " AND $dateTimeCol <= " + convertFn("$__to")
}

func (q *EvalQuery) convertTimestamp(dt time.Time) int64 {
	return dt.UnixMilli() / 1000
}

func (q *EvalQuery) round(dt time.Time, round int) time.Time {
	if round == 0 {
		return dt
	}
	return dt.Truncate(time.Duration(round) * time.Second)
}

func (q *EvalQuery) convertInterval(interval string, intervalFactor int, ms bool) (int, error) {
	if interval == "" {
		return 0, nil
	}
	d, err := time.ParseDuration(interval)
	if err != nil {
		return 0, err
	}
	if ms {
		return int(math.Ceil(float64(d.Milliseconds()) * float64(intervalFactor))), nil
	}
	return int(math.Ceil(d.Seconds() * float64(intervalFactor))), nil
}

func (q *EvalQuery) unescape(query string) (string, error) {
	macros := "$unescape("
	openMacros := strings.Index(query, macros)
	for openMacros != -1 {
		r := q.betweenBraces(query[openMacros+len(macros):])
		if r.error != "" {
			return "", fmt.Errorf("$unescape macros error: %v", r.error)
		}
		arg := r.result
		arg = strings.Replace(arg, "'", "", -1)
		var closeMacros = openMacros + len(macros) + len(r.result) + 1
		query = query[:openMacros] + arg + query[closeMacros:]
		openMacros = strings.Index(query, macros)
	}
	return query, nil
}

type betweenBracesResult struct {
	result string
	error  string
}

func (q *EvalQuery) betweenBraces(query string) betweenBracesResult {
	r := betweenBracesResult{}
	openBraces := 1
	for i := 0; i < len(query); i++ {
		if query[i] == '(' {
			openBraces++
		}
		if query[i] == ')' {
			openBraces--
			if openBraces == 0 {
				r.result = query[0:i]
				break
			}
		}
	}
	if openBraces > 1 {
		r.error = "missing parentheses"
	}
	return r
}

type EvalAST struct {
	Obj map[string]interface{}
	Arr []interface{}
}

func newEvalAST(isObj bool) *EvalAST {
	var obj map[string]interface{}
	var arr []interface{}
	if isObj {
		obj = make(map[string]interface{})
	} else {
		arr = make([]interface{}, 0)
	}
	return &EvalAST{
		Obj: obj,
		Arr: arr,
	}

}
func (e *EvalAST) hasOwnProperty(key string) bool {
	v, hasKey := e.Obj[key]
	return hasKey && v != nil
}

func (e *EvalAST) pushObj(objName string, value interface{}) {
	_, objExists := e.Obj[objName]
	if !objExists {
		e.Obj[objName] = EvalAST{}
	}
	e.Obj[objName].(*EvalAST).push(value)
}

func (e *EvalAST) push(value interface{}) {
	if e.Arr == nil {
		e.Arr = []interface{}{}
	}
	e.Arr = append(e.Arr, value)
}

type EvalQueryScanner struct {
	Tree         *EvalAST
	RootToken    string
	Token        string
	SkipSpace    bool
	re           *regexp2.Regexp
	expectedNext bool
	_sOriginal   string
	_s           string
}

func newScanner(query string) EvalQueryScanner {
	return EvalQueryScanner{
		_sOriginal: query,
		Token:      "",
	}
}

func (s *EvalQueryScanner) raw() string {
	return s._sOriginal
}

func (s *EvalQueryScanner) Next() (bool, error) {
	for {
		isNext, err := func() (bool, error) {
			if len(s._s) == 0 {
				return false, nil
			}
			r, err := s.re.FindStringMatch(s._s)
			if err != nil || r == nil {
				return false, fmt.Errorf("cannot find next token in [%v]", s._s)
			}

			s.Token = r.String()
			s._s = s._s[len(s.Token):]

			return true, nil
		}()

		if !isNext {
			break
		}
		if err != nil {
			return false, err
		}
		if s.SkipSpace && isWS(s.Token) {
			continue
		}
		return true, nil
	}
	return false, nil
}

func (s *EvalQueryScanner) expectNext() (bool, error) {
	isNext, err := s.Next()
	if err != nil {
		return false, fmt.Errorf("expecting additional token at the end of query [%s], error: %v", s._sOriginal, err)
	}
	return isNext, err
}

func (s *EvalQueryScanner) Format() (string, error) {
	ast, err := s.toAST()
	if err != nil {
		return "", err
	}
	return printAST(ast, ""), nil
}

func (s *EvalQueryScanner) push(argument interface{}) {
	rootAST, exist := s.Tree.Obj[s.RootToken]
	if exist {
		ast := rootAST.(*EvalAST)
		if ast.Arr != nil {
			ast.Arr = append(ast.Arr, argument)
		} else {
			var aliasesArr *EvalAST
			if !ast.hasOwnProperty("aliases") {
				aliasesArr = newEvalAST(false)
				ast.Obj["aliases"] = aliasesArr
			} else {
				aliasesArr = ast.Obj["aliases"].(*EvalAST)
			}
			aliasesArr.Arr = append(aliasesArr.Arr, argument)
		}
		s.Tree.Obj[s.RootToken] = ast
	}
	s.expectedNext = false
}

func (s *EvalQueryScanner) SetRoot(token string) {
	s.RootToken = strings.ToLower(token)
	s.Tree.Obj[s.RootToken] = newEvalAST(false)
	s.expectedNext = true
}

func (s *EvalQueryScanner) isExpectedNext() bool {
	var v = s.expectedNext
	s.expectedNext = false
	return v
}

func (s *EvalQueryScanner) appendToken(argument string) string {
	if argument == "" || isSkipSpace(argument[len(argument)-1:]) {
		return s.Token
	}
	return " " + s.Token
}

func (s *EvalQueryScanner) toAST() (*EvalAST, error) {
	var err error
	s._s = s._sOriginal
	s.Tree = newEvalAST(true)
	s.SetRoot("root")
	s.expectedNext = false
	s.SkipSpace = true
	s.re = tokenReComplied
	subQuery := ""
	argument := ""

	for {
		if next, err := s.Next(); err != nil {
			return nil, err
		} else if !next {
			break
		}
		if !s.isExpectedNext() && isStatement(s.Token) && !s.Tree.hasOwnProperty(strings.ToLower(s.Token)) {
			if strings.ToUpper(s.Token) == "WITH" && s.RootToken == "order by" {
				argument += s.appendToken(argument)
				continue
			}
			if !isClosured(argument) {
				argument += s.appendToken(argument)
				continue
			}
			if len(argument) > 0 {
				s.push(argument)
				argument = ""
			}
			s.SetRoot(s.Token)
		} else if s.Token == "," && isClosured(argument) {
			s.push(argument)
			argument = ""
			if s.RootToken == "where" {
				s.push(s.Token)
			}
			s.expectedNext = true
		} else if isClosureChars(s.Token) && s.RootToken == "from" {
			subQuery = betweenBraces(s._s)
			if !isTableFunc(argument) {
				if s.Tree.Obj[s.RootToken], err = toAST(subQuery); err != nil {
					return nil, err
				}
			} else {
				s.push(argument + "(" + subQuery + ")")
				argument = ""
			}
			s._s = s._s[len(subQuery)+1:]
		} else if isMacroFunc(s.Token) {
			var funcName = s.Token
			if next, err := s.Next(); err != nil {
				return nil, fmt.Errorf("wrong macros parsing: %v", err)
			} else if !next {
				return nil, fmt.Errorf("wrong macros signature for `%s` at [%s]", funcName, s._s)
			}

			subQuery = betweenBraces(s._s)
			var subAST *EvalAST
			if subAST, err = toAST(subQuery); err != nil {
				return nil, err
			}
			if subAST.hasOwnProperty("root") {
				s.Tree.Obj[funcName] = subAST.Obj["root"]
			} else {
				s.Tree.Obj[funcName] = subAST
			}
			s._s = s._s[len(subQuery)+1:]

			// macro funcNames are used instead of SELECT statement
			s.Tree.Obj["select"] = newEvalAST(false)
		} else if isIn(s.Token) {
			argument += " " + s.Token
			if next, err := s.Next(); err != nil {
				return nil, fmt.Errorf("error `IN` parsing: %v", err)
			} else if !next {
				return nil, fmt.Errorf("wrong `IN` signature for `%s` at [%s]", argument, s._s)
			}

			if isClosureChars(s.Token) {
				subQuery = betweenBraces(s._s)

				if subQuery == "" {
					betweenBrackets(s._s)
				}

				var subAST *EvalAST
				if subAST, err = toAST(subQuery); err != nil {
					return nil, err
				}
				if subAST.hasOwnProperty("root") && len(subAST.Obj["root"].(*EvalAST).Arr) > 0 {
					var subArr = subAST.Obj["root"].(*EvalAST)
					argument += " ("
					for _, item := range subArr.Arr {
						argument += item.(string)
					}
					argument = argument + ")"
				} else {
					argument += " (" + newLine + printAST(subAST, tabSize) + ")"
					if s.RootToken != "select" {
						s.push(argument)
						argument = ""
					}
				}
				s._s = s._s[len(subQuery)+1:]
			} else {
				argument += " " + s.Token
			}
		} else if isCond(s.Token) && (s.RootToken == "where" || s.RootToken == "prewhere") {
			if isClosured(argument) {
				s.push(argument)
				argument = s.Token
			} else {
				argument += " " + s.Token
			}
		} else if isJoin(s.Token) {
			argument, err = s.parseJOIN(argument)
			if err != nil {
				return nil, fmt.Errorf("parseJOIN error: %v", err)
			}
		} else if s.RootToken == "union all" {
			var statement = "union all"
			s._s = s.Token + " " + s._s
			var subQueryPos = strings.Index(strings.ToLower(s._s), statement)
			for subQueryPos != -1 {
				var subQuery = s._s[0:subQueryPos]
				var ast *EvalAST
				if ast, err = toAST(subQuery); err != nil {
					return nil, err
				}
				s.Tree.pushObj(statement, ast)
				s._s = s._s[subQueryPos+len(statement) : len(s._s)]
				subQueryPos = strings.Index(strings.ToLower(s._s), statement)
			}
			ast, err := toAST(s._s)
			if err != nil {
				return nil, err
			}
			s._s = ""
			s.Tree.pushObj(statement, ast)
		} else if isComment(s.Token) {
			//comment is part of push element, and will add after next statement
			argument += s.Token + "\n"
		} else if isClosureChars(s.Token) || s.Token == "." {
			argument += s.Token
		} else if s.Token == "," {
			argument += s.Token + " "
		} else {
			argument += s.appendToken(argument)
		}
	}

	if argument != "" {
		s.push(argument)
	}
	return s.Tree, nil
}

func (s *EvalQueryScanner) parseJOIN(argument string) (string, error) {
	if !s.Tree.hasOwnProperty("join") {
		s.Tree.Obj["join"] = newEvalAST(false)
	}
	var joinType = s.Token
	if next, err := s.Next(); err != nil {
		return "", err
	} else if !next {
		return "", fmt.Errorf("wrong join signature for `%s` at [%s]", joinType, s._s)
	}
	var source *EvalAST
	var err error
	if isClosureChars(s.Token) {
		var subQuery = betweenBraces(s._s)
		if source, err = toAST(subQuery); err != nil {
			return "", err
		}
		s._s = s._s[len(subQuery)+1:]
		s.Token = ""
	} else {
		var sourceStr = ""
		var ok = true
		for {
			if isID(s.Token) && !isTable(sourceStr) && strings.ToUpper(s.Token) != "AS" && !onJoinTokenOnlyRe.MatchString(s.Token) {
				sourceStr += s.Token
			} else if isMacro(s.Token) {
				sourceStr += s.Token
			} else if s.Token == "." {
				sourceStr += s.Token
			} else {
				break
			}
			if ok, err = s.CheckArrayJOINAndExpectNextOrNext(joinType); err != nil {
				return "", err
			} else if !ok {
				break
			}
		}
		if s.Token == sourceStr {
			s.Token = ""
		}
		source = &EvalAST{
			Obj: map[string]interface{}{
				"root": EvalAST{Arr: []interface{}{sourceStr}},
			},
		}
	}

	var joinAST = &EvalAST{
		Obj: map[string]interface{}{
			"type":    joinType,
			"source":  source,
			"aliases": newEvalAST(false),
			"using":   newEvalAST(false),
			"on":      newEvalAST(false),
		},
	}
	ok := true
	for {
		if s.Token != "" && !onJoinTokenOnlyRe.MatchString(s.Token) {
			joinAST.pushObj("aliases", s.Token)
		} else if onJoinTokenOnlyRe.MatchString(s.Token) {
			break
		}

		if ok, err = s.CheckArrayJOINAndExpectNextOrNext(joinType); err != nil {
			return "", err
		} else if !ok {
			break
		}
	}
	var joinExprToken = strings.ToLower(s.Token)
	var joinConditions = ""
	for {
		if next, err := s.Next(); err != nil {
			return "", fmt.Errorf("joinConditions s.Next() return %v", err)
		} else if !next {
			break
		}
		if isStatement(s.Token) {
			if argument != "" {
				s.push(argument)
				argument = ""
			}
			s.SetRoot(s.Token)
			break
		}
		if isJoin(s.Token) {
			if joinConditions != "" {
				joinAST.pushObj("on", joinConditions)
				joinConditions = ""
			}
			s.Tree.pushObj("join", joinAST)
			joinAST = nil
			if argument, err = s.parseJOIN(argument); err != nil {
				return "", fmt.Errorf("joinConditions s.parseJOIN return: %v", err)
			}
			break
		}

		if joinExprToken == "using" {
			if !isID(s.Token) {
				continue
			}
			joinAST.pushObj("using", s.Token)
		} else {
			if isCond(s.Token) {
				joinConditions += " " + strings.ToUpper(s.Token) + " "
			} else {
				joinConditions += s.Token
			}
		}
	}
	if joinAST != nil {
		if joinConditions != "" {
			joinAST.pushObj("on", joinConditions)
		}
		s.Tree.pushObj("join", joinAST)
	}
	return argument, nil
}

func (s *EvalQueryScanner) CheckArrayJOINAndExpectNextOrNext(joinType string) (bool, error) {
	if !strings.Contains(strings.ToUpper(joinType), "ARRAY JOIN") {
		expectNext, err := s.expectNext()
		if err != nil {
			return false, fmt.Errorf("parseJOIN s.expectNext() return: %v", err)
		}
		if expectNext {
			return expectNext, nil
		}
	}
	next, err := s.Next()
	if err != nil {
		return false, fmt.Errorf("parseJOIN s.next() return: %v", err)
	}
	return next, nil
}

func (s *EvalQueryScanner) RemoveComments(query string) (string, error) {
	return regexp2.MustCompile(commentRe, 0).Replace(query, "", 0, -1)
}

func (s *EvalQueryScanner) AddMetadata(query string, q *EvalQuery) string {
	return "/* grafana alerts rule=" + q.RuleUid + " query=" + q.RefId + " */ " + query
}

const wsRe = "\\s+"
const commentRe = `--(([^\'\n]*[\']){2})*[^\'\n]*(?=\n|$)|` + `/\*(?:[^*]|\*[^/])*\*/`
const idRe = "[a-zA-Z_][a-zA-Z_0-9]*"
const intRe = "\\d+"
const powerIntRe = "\\d+e\\d+"
const floatRe = "\\d+\\.\\d*|\\d*\\.\\d+|\\d+[eE][-+]\\d+"
const stringRe = "('(?:[^'\\\\]|\\\\.)*')|(`(?:[^`\\\\]|\\\\.)*`)|(\"(?:[^\"\\\\]|\\\\.)*\")"
const binaryOpRe = "=>|\\|\\||>=|<=|==|!=|<>|->|[-+/%*=<>\\.!]"
const statementRe = "\\b(with|select|from|where|having|order by|group by|limit|format|prewhere|union all)\\b"

// look https://clickhouse.tech/docs/en/sql-reference/statements/select/join/
// [GLOBAL] [ANY|ALL] [INNER|LEFT|RIGHT|FULL|CROSS] [OUTER] JOIN
const joinsRe = "\\b(" +
	"left\\s+array\\s+join|" +
	"array\\s+join|" +
	"global\\s+any\\s+inner\\s+outer\\s+join|" +
	"global\\s+any\\s+inner\\s+join|" +
	"global\\s+any\\s+left\\s+outer\\s+join|" +
	"global\\s+any\\s+left\\s+join|" +
	"global\\s+any\\s+right\\s+outer\\s+join|" +
	"global\\s+any\\s+right\\s+join|" +
	"global\\s+any\\s+full\\s+outer\\s+join|" +
	"global\\s+any\\s+full\\s+join|" +
	"global\\s+any\\s+cross\\s+outer\\s+join|" +
	"global\\s+any\\s+cross\\s+join|" +
	"global\\s+any\\s+outer\\s+join|" +
	"global\\s+any\\s+join|" +
	"global\\s+all\\s+inner\\s+outer\\s+join|" +
	"global\\s+all\\s+inner\\s+join|" +
	"global\\s+all\\s+left\\s+outer\\s+join|" +
	"global\\s+all\\s+left\\s+join|" +
	"global\\s+all\\s+right\\s+outer\\s+join|" +
	"global\\s+all\\s+right\\s+join|" +
	"global\\s+all\\s+full\\s+outer\\s+join|" +
	"global\\s+all\\s+full\\s+join|" +
	"global\\s+all\\s+cross\\s+outer\\s+join|" +
	"global\\s+all\\s+cross\\s+join|" +
	"global\\s+all\\s+outer\\s+join|" +
	"global\\s+all\\s+join|" +
	"global\\s+inner\\s+outer\\s+join|" +
	"global\\s+inner\\s+join|" +
	"global\\s+left\\s+outer\\s+join|" +
	"global\\s+left\\s+join|" +
	"global\\s+right\\s+outer\\s+join|" +
	"global\\s+right\\s+join|" +
	"global\\s+full\\s+outer\\s+join|" +
	"global\\s+full\\s+join|" +
	"global\\s+cross\\s+outer\\s+join|" +
	"global\\s+cross\\s+join|" +
	"global\\s+outer\\s+join|" +
	"global\\s+join|" +
	"any\\s+inner\\s+outer\\s+join|" +
	"any\\s+inner\\s+join|" +
	"any\\s+left\\s+outer\\s+join|" +
	"any\\s+left\\s+join|" +
	"any\\s+right\\s+outer\\s+join|" +
	"any\\s+right\\s+join|" +
	"any\\s+full\\s+outer\\s+join|" +
	"any\\s+full\\s+join|" +
	"any\\s+cross\\s+outer\\s+join|" +
	"any\\s+cross\\s+join|" +
	"any\\s+outer\\s+join|" +
	"any\\s+join|" +
	"all\\s+inner\\s+outer\\s+join|" +
	"all\\s+inner\\s+join|" +
	"all\\s+left\\s+outer\\s+join|" +
	"all\\s+left\\s+join|" +
	"all\\s+right\\s+outer\\s+join|" +
	"all\\s+right\\s+join|" +
	"all\\s+full\\s+outer\\s+join|" +
	"all\\s+full\\s+join|" +
	"all\\s+cross\\s+outer\\s+join|" +
	"all\\s+cross\\s+join|" +
	"all\\s+outer\\s+join|" +
	"all\\s+join|" +
	"inner\\s+outer\\s+join|" +
	"inner\\s+join|" +
	"left\\s+outer\\s+join|" +
	"left\\s+join|" +
	"right\\s+outer\\s+join|" +
	"right\\s+join|" +
	"full\\s+outer\\s+join|" +
	"full\\s+join|" +
	"cross\\s+outer\\s+join|" +
	"cross\\s+join|" +
	"outer\\s+join|" +
	"join" +
	")\\b"
const onJoinTokenRe = "\\b(using|on)\\b"
const tableNameRe = `([A-Za-z0-9_]+|[A-Za-z0-9_]+\\.[A-Za-z0-9_]+)`
const macroFuncRe = "(\\$deltaColumnsAggregated|\\$increaseColumnsAggregated|\\$perSecondColumnsAggregated|\\$rateColumnsAggregated|\\$rateColumns|\\$perSecondColumns|\\$deltaColumns|\\$increaseColumns|\\$rate|\\$perSecond|\\$delta|\\$increase|\\$columnsMs|\\$columns)"
const condRe = "\\b(or|and)\\b"
const inRe = "\\b(global in|global not in|not in|in)\\b(?:\\s+\\[\\s*(?:'[^']*'\\s*,\\s*)*'[^']*'\\s*\\])?"
const closureRe = "[\\(\\)\\[\\]]"
const specCharsRe = "[,?:]"
const macroRe = "\\$[A-Za-z0-9_$]+"
const skipSpaceRe = "[\\(\\.! \\[]"

const tableFuncRe = "\\b(sqlite|file|remote|remoteSecure|cluster|clusterAllReplicas|merge|numbers|url|mysql|postgresql|jdbc|odbc|hdfs|input|generateRandom|s3|s3Cluster)\\b"

/* const builtInFuncRe = "\\b(avg|countIf|first|last|max|min|sum|sumIf|ucase|lcase|mid|round|rank|now|" +
   "coalesce|ifnil|isnil|nvl|count|timeSlot|yesterday|today|now|toRelativeSecondNum|" +
   "toRelativeMinuteNum|toRelativeHourNum|toRelativeDayNum|toRelativeWeekNum|toRelativeMonthNum|" +
   "toRelativeYearNum|toTime|toStartOfHour|toStartOfFiveMinute|toStartOfMinute|toStartOfYear|" +
   "toStartOfQuarter|toStartOfMonth|toMonday|toSecond|toMinute|toHour|toDayOfWeek|toDayOfMonth|" +
   "toMonth|toYear|toFixedString|toStringCutToZero|reinterpretAsString|reinterpretAsDate|" +
   "reinterpretAsDateTime|reinterpretAsFloat32|reinterpretAsFloat64|reinterpretAsInt8|" +
   "reinterpretAsInt16|reinterpretAsInt32|reinterpretAsInt64|reinterpretAsUInt8|" +
   "reinterpretAsUInt16|reinterpretAsUInt32|reinterpretAsUInt64|toUInt8|toUInt16|toUInt32|" +
   "toUInt64|toInt8|toInt16|toInt32|toInt64|toFloat32|toFloat64|toDate|toDateTime|toString|" +
   "bitAnd|bitOr|bitXor|bitNot|bitShiftLeft|bitShiftRight|abs|negate|modulo|intDivOrZero|" +
   "intDiv|divide|multiply|minus|plus|empty|notEmpty|length|lengthUTF8|lower|upper|lowerUTF8|" +
   "upperUTF8|reverse|reverseUTF8|concat|substring|substringUTF8|appendTrailingCharIfAbsent|" +
   "position|positionUTF8|match|extract|extractAll|like|notLike|replaceOne|replaceAll|" +
   "replaceRegexpOne|range|arrayElement|has|indexOf|countEqual|arrayEnumerate|arrayEnumerateUniq|" +
   "arrayJoin|arrayMap|arrayFilter|arrayExists|arrayCount|arrayAll|arrayFirst|arraySum|splitByChar|" +
   "splitByString|alphaTokens|domainWithoutWWW|topLevelDomain|firstSignificantSubdomain|" +
   "cutToFirstSignificantSubdomain|queryString|URLPathHierarchy|URLHierarchy|extractURLParameterNames|" +
   "extractURLParameters|extractURLParameter|queryStringAndFragment|cutWWW|cutQueryString|" +
   "cutFragment|cutQueryStringAndFragment|cutURLParameter|IPv4NumToString|IPv4StringToNum|" +
   "IPv4NumToStringClassC|IPv6NumToString|IPv6StringToNum|rand|rand64|halfMD5|MD5|sipHash64|" +
   "sipHash128|cityHash64|intHash32|intHash64|SHA1|SHA224|SHA256|URLHash|hex|unhex|bitmaskToList|" +
   "bitmaskToArray|floor|ceil|round|roundToExp2|roundDuration|roundAge|regionToCountry|" +
   "regionToContinent|regionToPopulation|regionIn|regionHierarchy|regionToName|OSToRoot|OSIn|" +
   "OSHierarchy|SEToRoot|SEIn|SEHierarchy|dictGetUInt8|dictGetUInt16|dictGetUInt32|" +
   "dictGetUInt64|dictGetInt8|dictGetInt16|dictGetInt32|dictGetInt64|dictGetFloat32|" +
   "dictGetFloat64|dictGetDate|dictGetDateTime|dictGetString|dictGetHierarchy|dictHas|dictIsIn|" +
   "argMin|argMax|uniqCombined|uniqHLL12|uniqExact|uniqExactIf|groupArray|groupUniqArray|quantile|" +
   "quantileDeterministic|quantileTiming|quantileTimingWeighted|quantileExact|" +
   "quantileExactWeighted|quantileTDigest|median|quantiles|varSamp|varPop|stddevSamp|stddevPop|" +
   "covarSamp|covarPop|corr|sequenceMatch|sequenceCount|uniqUpTo|avgIf|" +
   "quantilesTimingIf|argMinIf|uniqArray|sumArray|quantilesTimingArrayIf|uniqArrayIf|medianIf|" +
   "quantilesIf|varSampIf|varPopIf|stddevSampIf|stddevPopIf|covarSampIf|covarPopIf|corrIf|" +
   "uniqArrayIf|sumArrayIf|uniq)\\b" */
/* const operatorRe = "\\b(select|group by|order by|from|where|limit|offset|having|as|" +
   "when|else|end|type|left|right|on|outer|desc|asc|primary|key|between|" +
   "foreign|not|nil|inner|cross|natural|database|prewhere|using|global|in)\\b" */
/* const dataTypeRe = "\\b(int|numeric|decimal|date|varchar|char|bigint|float|double|bit|binary|text|set|timestamp|" +
   "money|real|number|integer|" +
   "uint8|uint16|uint32|uint64|int8|int16|int32|int64|float32|float64|datetime|enum8|enum16|" +
   "array|tuple|string)\\b" */

var wsOnlyRe = regexp.MustCompile("^(?:" + wsRe + ")$")
var commentOnlyRe = regexp2.MustCompile("^(?:"+commentRe+")$", regexp2.Multiline)
var idOnlyRe = regexp.MustCompile("^(?:" + idRe + ")$")
var closureOnlyRe = regexp.MustCompile("^(?:" + closureRe + ")$")
var macroFuncOnlyRe = regexp.MustCompile("^(?:" + macroFuncRe + ")$")
var statementOnlyRe = regexp.MustCompile("(?mi)^(?:" + statementRe + ")$")
var joinsOnlyRe = regexp.MustCompile("(?mi)^(?:" + joinsRe + ")$")
var onJoinTokenOnlyRe = regexp.MustCompile("(?mi)^(?:" + onJoinTokenRe + ")$")
var tableNameOnlyRe = regexp.MustCompile("(?mi)^(?:" + tableNameRe + ")$")

/* var operatorOnlyRe = regexp.MustCompile("^(?mi)(?:" + operatorRe + ")$") */
/* var dataTypeOnlyRe = regexp.MustCompile("^(?:" + dataTypeRe + ")$") */
/* var builtInFuncOnlyRe = regexp.MustCompile("^(?:" + builtInFuncRe + ")$") */
var tableFuncOnlyRe = regexp.MustCompile("(?mi)^(?:" + tableFuncRe + ")$")
var macroOnlyRe = regexp.MustCompile("(?mi)^(?:" + macroRe + ")$")
var inOnlyRe = regexp.MustCompile("(?mi)^(?:" + inRe + ")$")
var condOnlyRe = regexp.MustCompile("(?mi)^(?:" + condRe + ")$")

/* var numOnlyRe = regexp.MustCompile("^(?:" + strings.Join([]string{powerIntRe, intRe, floatRe},"|") + ")$") */
/* var stringOnlyRe = regexp.MustCompile("^(?:" + stringRe + ")$") */
var skipSpaceOnlyRe = regexp.MustCompile("^(?:" + skipSpaceRe + ")$")

/* var binaryOnlyRe = regexp.MustCompile("^(?:" + binaryOpRe + ")$") */

var tokenRe = strings.Join([]string{
	statementRe, macroFuncRe, joinsRe, inRe, wsRe, commentRe, idRe, stringRe, powerIntRe, floatRe, intRe,
	binaryOpRe, closureRe, specCharsRe, macroRe,
}, "|")

var tokenReComplied = regexp2.MustCompile("^(?:"+tokenRe+")", regexp2.IgnoreCase+regexp2.Multiline)

func isSkipSpace(token string) bool {
	return skipSpaceOnlyRe.MatchString(token)
}

func isCond(token string) bool {
	return condOnlyRe.MatchString(token)
}

func isIn(token string) bool {
	return inOnlyRe.MatchString(token)
}

func isJoin(token string) bool {
	return joinsOnlyRe.MatchString(token)
}

func isTable(token string) bool {
	return tableNameOnlyRe.MatchString(token)
}

func isWS(token string) bool {
	return wsOnlyRe.MatchString(token)
}

func isMacroFunc(token string) bool {
	return macroFuncOnlyRe.MatchString(token)
}

func isMacro(token string) bool {
	return macroOnlyRe.MatchString(token)
}

func isComment(token string) bool {
	res, _ := commentOnlyRe.MatchString(token)
	return res
}

func isID(token string) bool {
	return idOnlyRe.MatchString(token)
}

func isStatement(token string) bool {
	return statementOnlyRe.MatchString(token)
}

/*
func isOperator(token string) bool {
    return operatorOnlyRe.MatchString(token)
}

func isDataType(token string) bool {
    return dataTypeOnlyRe.MatchString(token)
}

func isBuiltInFunc(token string) bool {
    return builtInFuncOnlyRe.MatchString(token)
}
*/

func isTableFunc(token string) bool {
	return tableFuncOnlyRe.MatchString(token)
}

func isClosureChars(token string) bool {
	return closureOnlyRe.MatchString(token)
}

/*
func isNum(token string) bool {
    return numOnlyRe.MatchString(token)
}

func isString(token string) bool {
    return stringOnlyRe.MatchString(token)
}

func isBinary(token string) bool {
    return binaryOnlyRe.MatchString(token)
}
*/

const tabSize = "    " // 4 spaces
const newLine = "\n"

func printItems(items *EvalAST, tab string, separator string) string {
	var result = ""
	if len(items.Arr) > 0 {
		if len(items.Arr) == 1 {
			result += " " + items.Arr[0].(string) + newLine
		} else {
			result += newLine
			for i, item := range items.Arr {
				result += tab + tabSize + item.(string)
				if i != len(items.Arr)-1 {
					result += separator
					result += newLine
				}
			}
		}
	} else if len(items.Obj) > 0 {
		result = newLine + "(" + newLine + printAST(items, tab+tabSize) + newLine + ")"
	}

	return result
}

func toAST(s string) (*EvalAST, error) {
	var scanner = newScanner(s)
	return scanner.toAST()
}

// isClosured checks if a string has properly balanced brackets while ignoring brackets within quotes
// https://github.com/Altinity/clickhouse-grafana/issues/648
func isClosured(str string) bool {
	stack := make([]rune, 0)
	isInQuote := false
	var quoteType rune

	openBrackets := map[rune]rune{
		'(': ')',
		'[': ']',
		'{': '}',
	}

	closeBrackets := map[rune]rune{
		')': '(',
		']': '[',
		'}': '{',
	}

	runes := []rune(str)
	for i := 0; i < len(runes); i++ {
		char := runes[i]

		// Handle quotes
		if (char == '\'' || char == '"' || char == '`') && (i == 0 || runes[i-1] != '\\') {
			if !isInQuote {
				isInQuote = true
				quoteType = char
			} else if char == quoteType {
				isInQuote = false
				quoteType = 0
			}
			continue
		}

		// Skip characters inside quotes
		if isInQuote {
			continue
		}

		// Handle brackets
		if _, ok := openBrackets[char]; ok {
			stack = append(stack, char)
		} else if closingPair, ok := closeBrackets[char]; ok {
			if len(stack) == 0 {
				return false
			}
			lastOpen := stack[len(stack)-1]
			stack = stack[:len(stack)-1] // pop
			if lastOpen != closingPair {
				return false
			}
		}
	}

	return len(stack) == 0
}

func betweenBraces(query string) string {
	var openBraces = 1
	var subQuery = ""
	for i := 0; i < len(query); i++ {
		if query[i] == '(' {
			openBraces++
		}
		if query[i] == ')' {
			if openBraces == 1 {
				subQuery = query[0:i]
				break
			}
			openBraces--
		}
	}
	return subQuery
}

func betweenBrackets(query string) string {
	var openBraces = 1
	var subQuery = ""
	for i := 0; i < len(query); i++ {
		if query[i] == '[' {
			openBraces++
		}
		if query[i] == ']' {
			if openBraces == 1 {
				subQuery = query[0:i]
				break
			}
			openBraces--
		}
	}
	return subQuery
}

// see https://clickhouse.tech/docs/en/sql-reference/statements/select/
func printAST(AST *EvalAST, tab string) string {
	var result = ""
	if AST.hasOwnProperty("root") {
		result += printItems(AST.Obj["root"].(*EvalAST), "\n", "\n")
	}

	if AST.hasOwnProperty("$rate") {
		result += tab + "$rate("
		result += printItems(AST.Obj["$rate"].(*EvalAST), tab, ",") + ")"
	}

	if AST.hasOwnProperty("$perSecond") {
		result += tab + "$perSecond("
		result += printItems(AST.Obj["$perSecond"].(*EvalAST), tab, ",") + ")"
	}

	if AST.hasOwnProperty("$perSecondColumns") {
		result += tab + "$perSecondColumns("
		result += printItems(AST.Obj["$perSecondColumns"].(*EvalAST), tab, ",") + ")"
	}

	if AST.hasOwnProperty("$columns") {
		result += tab + "$columns("
		result += printItems(AST.Obj["$columns"].(*EvalAST), tab, ",") + ")"
	}

	if AST.hasOwnProperty("$columnsMs") {
		result += tab + "$columnsMs("
		result += printItems(AST.Obj["$columnsMs"].(*EvalAST), tab, ",") + ")"
	}

	if AST.hasOwnProperty("$rateColumns") {
		result += tab + "$rateColumns("
		result += printItems(AST.Obj["$rateColumns"].(*EvalAST), tab, ",") + ")"
	}

	if AST.hasOwnProperty("$rateColumnsAggregated") {
		result += tab + "$rateColumnsAggregated("
		result += printItems(AST.Obj["$rateColumnsAggregated"].(*EvalAST), tab, ",") + ")"
	}

	if AST.hasOwnProperty("with") {
		result += tab + "WITH"
		result += printItems(AST.Obj["with"].(*EvalAST), tab, ",")
	}

	if AST.hasOwnProperty("select") {
		result += tab + "SELECT"
		result += printItems(AST.Obj["select"].(*EvalAST), tab, ",")
	}

	if AST.hasOwnProperty("from") {
		result += newLine + tab + "FROM"
		result += printItems(AST.Obj["from"].(*EvalAST), tab, "")
	}

	if AST.hasOwnProperty("aliases") {
		result += printItems(AST.Obj["aliases"].(*EvalAST), "", " ")
	}

	if AST.hasOwnProperty("join") {
		for _, item := range AST.Obj["join"].(*EvalAST).Arr {
			itemAST := item.(*EvalAST)
			joinType := itemAST.Obj["type"].(string)
			result += newLine + tab + strings.ToUpper(joinType) + printItems(itemAST.Obj["source"].(*EvalAST), tab, "") + " " + printItems(itemAST.Obj["aliases"].(*EvalAST), "", " ")
			if itemAST.hasOwnProperty("using") && len(itemAST.Obj["using"].(*EvalAST).Arr) > 0 {
				result += " USING " + printItems(itemAST.Obj["using"].(*EvalAST), "", " ")
			} else if itemAST.hasOwnProperty("on") && len(itemAST.Obj["on"].(*EvalAST).Arr) > 0 {
				result += " ON " + printItems(itemAST.Obj["on"].(*EvalAST), tab, " ")
			}
		}
	}

	if AST.hasOwnProperty("prewhere") {
		result += newLine + tab + "PREWHERE"
		result += printItems(AST.Obj["prewhere"].(*EvalAST), tab, "")
	}

	if AST.hasOwnProperty("where") {
		result += newLine + tab + "WHERE"
		result += printItems(AST.Obj["where"].(*EvalAST), tab, "")
	}

	if AST.hasOwnProperty("group by") {
		result += newLine + tab + "GROUP BY"
		result += printItems(AST.Obj["group by"].(*EvalAST), tab, ",")
	}

	if AST.hasOwnProperty("having") {
		result += newLine + tab + "HAVING"
		result += printItems(AST.Obj["having"].(*EvalAST), tab, "")
	}

	if AST.hasOwnProperty("order by") {
		result += newLine + tab + "ORDER BY"
		result += printItems(AST.Obj["order by"].(*EvalAST), tab, ",")
	}

	if AST.hasOwnProperty("limit") {
		result += newLine + tab + "LIMIT"
		result += printItems(AST.Obj["limit"].(*EvalAST), tab, ",")
	}

	if AST.hasOwnProperty("union all") {
		for _, item := range AST.Obj["union all"].(*EvalAST).Arr {
			itemAST := item.(*EvalAST)
			result += newLine + newLine + tab + "UNION ALL" + newLine + newLine
			result += printAST(itemAST, tab)
		}
	}

	if AST.hasOwnProperty("format") {
		result += newLine + tab + "FORMAT"
		result += printItems(AST.Obj["format"].(*EvalAST), tab, "")
	}

	return result
}
