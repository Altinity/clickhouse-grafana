package main

import (
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"
)

var FormatJson = "FORMAT JSON"

var DefaultQuery = "SELECT 1 FORMAT JSON"

/* TODO Ugly hack cover 80% corner cases, think about how to port sql_query.ts+scanner.ts to Golang, or try to figure out how to tricksterproxy.io parse SQL to detect timeRange */

var FromValueRE = regexp.MustCompile(`(?miU)>=\s*toDate\s*\((\d+)\)|>=\s*toDateTime\s*\((\d+)\)|>=\s*toDateTime64\s*\((\d+),\s*3\)|BETWEEN\s+toDate\s*\((\d+)\)|BETWEEN\s+toDateTime\s*\((\d+)\)`)
var ToValueRE = regexp.MustCompile(`(?miU)<=\s*toDate\s*\((\d+)\)|<=\s*toDateTime\s*\((\d+)\)|<=\s*toDateTime64\s*\((\d+),\s*3\)|BETWEEN[\s\S]+AND\s+toDate\s*\((\d+)\)|BETWEEN[\s\S]+AND\s+toDateTime\s*\((\d+)\)`)

var FromMsValueRE = regexp.MustCompile(`(?miU)>=\s*toDateTime64\s*\((\d+)/1000,\s*3\)`)
var ToMsValueRE = regexp.MustCompile(`(?miU)<=\s*toDateTime64\s*\((\d+)/1000,\s*3\)`)

type Query struct {
	RefId        string `json:"refId"`
	RawQuery     string `json:"rawQuery"`
	DateTimeCol  string `json:"dateTimeColDataType"`
	DateCol      string `json:"dateColDataType"`
	DateTimeType string `json:"dateTimeType"`
	RuleUid      string
	From         time.Time
	To           time.Time
}

func (q *Query) ApplyTimeRangeToQuery() string {
	fmtQuery := strings.Trim(q.RawQuery, ";\r\n\t ")

	if !strings.HasSuffix(fmtQuery, FormatJson) {
		fmtQuery = fmtQuery + " " + FormatJson
	}
	fmtQuery = q.formatNumericDateAndTimeValues(fmtQuery)

	fmtQuery = q.formatTimeValue(fmtQuery, q.From, FromValueRE, false)
	fmtQuery = q.formatTimeValue(fmtQuery, q.To, ToValueRE, false)

	fmtQuery = q.formatTimeValue(fmtQuery, q.From, FromMsValueRE, true)
	fmtQuery = q.formatTimeValue(fmtQuery, q.To, ToMsValueRE, true)

	return fmtQuery
}

func (q *Query) formatTimeValue(fmtQuery string, fmtTime time.Time, fmtRE *regexp.Regexp, isMs bool) string {
	matches := fmtRE.FindStringSubmatch(fmtQuery)
	numericRE := regexp.MustCompile(`\d+`)
	if matches != nil {
		for i := 1; i < len(matches); i++ {
			if len(matches[i]) > 0 {
				if matched := numericRE.MatchString(matches[i]); matched {
					ts := fmtTime.Unix()
					if isMs {
						ts = fmtTime.UnixMilli()
					}
					fmtQuery = strings.Replace(fmtQuery, matches[i], strconv.FormatInt(ts, 10), -1)
				}
			}
		}
	}
	return fmtQuery
}

func (q *Query) formatNumericDateAndTimeValues(fmtQuery string) string {
	formatRegExp := func(fieldName, fieldType string, from, to time.Time) (*regexp.Regexp, string, *regexp.Regexp, string) {
		substitutionFrom := "$1$2$3 $4 "
		substitutionTo := "$1$2$3 $4 "

		fromRE := regexp.MustCompile("([\"`]*)(" + fieldName + ")([\"`]*)\\s*(<|<=)\\s*([^\\s]+)")
		toRE := regexp.MustCompile("([\"`]*)(" + fieldName + ")([\"`]*)\\s*(>=|>)\\s*([^\\s]+)")
		if slices.Contains([]string{"DATE", "DATE32", "DATETIME"}, strings.ToUpper(fieldType)) {
			substitutionFrom += fmt.Sprintf("to"+strings.ToTitle(strings.ToLower(fieldType))+"(%d)", from.Unix())
			substitutionTo += fmt.Sprintf("to"+strings.ToTitle(strings.ToLower(fieldType))+"(%d)", to.Unix())
		}
		if "DATETIME64" == strings.ToUpper(fieldType) {
			substitutionFrom += fmt.Sprintf("to"+strings.ToTitle(strings.ToLower(fieldType))+"(%.3f,3)", float64(from.UnixMilli())/1000.0)
			substitutionTo += fmt.Sprintf("to"+strings.ToTitle(strings.ToLower(fieldType))+"(%.3f,3)", float64(to.UnixMilli())/1000.0)
		}
		if "TIMESTAMP" == strings.ToUpper(fieldType) {
			substitutionFrom += fmt.Sprintf("%d", from.Unix())
			substitutionTo += fmt.Sprintf("%d", to.Unix())
		}
		if "TIMESTAMP64_3" == strings.ToUpper(fieldType) {
			substitutionFrom += fmt.Sprintf("%d", from.UnixMilli())
			substitutionTo += fmt.Sprintf("%d", to.UnixMilli())
		}
		if "TIMESTAMP64_6" == strings.ToUpper(fieldType) {
			substitutionFrom += fmt.Sprintf("%d", from.UnixMicro())
			substitutionTo += fmt.Sprintf("%d", to.UnixMicro())
		}
		if "TIMESTAMP64_9" == strings.ToUpper(fieldType) {
			substitutionFrom += fmt.Sprintf("%d", from.UnixNano())
			substitutionTo += fmt.Sprintf("%d", to.UnixNano())
		}
		if "FLOAT" == strings.ToUpper(fieldType) {
			substitutionFrom += fmt.Sprintf("%.3f", float64(from.UnixNano())/1000000000.0)
			substitutionTo += fmt.Sprintf("%.3f", float64(to.UnixNano())/1000000000.0)
		}
		return fromRE, substitutionFrom, toRE, substitutionTo
	}
	dateColFromRE, dateColFromSubstitution, dateColToRE, dateColToSubstitution := formatRegExp(q.DateCol, "Date", q.From, q.To)
	fmtQuery = dateColFromRE.ReplaceAllString(fmtQuery, dateColFromSubstitution)
	fmtQuery = dateColToRE.ReplaceAllString(fmtQuery, dateColToSubstitution)

	dateTimeColFromRE, dateTimeColFromSubstitution, dateTimeColToRE, dateTimeColToSubstitution := formatRegExp(q.DateTimeCol, q.DateTimeType, q.From, q.To)
	fmtQuery = dateTimeColFromRE.ReplaceAllString(fmtQuery, dateTimeColFromSubstitution)
	fmtQuery = dateTimeColToRE.ReplaceAllString(fmtQuery, dateTimeColToSubstitution)
	return fmtQuery
}
