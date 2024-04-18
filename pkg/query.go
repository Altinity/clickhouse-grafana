package main

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

var FormatJson = "FORMAT JSON"

var DefaultQuery = "SELECT 1 FORMAT JSON"

/* TODO Ugly hack cover 80% corner cases, think about how to port sql_query.ts+scanner.ts to Golang, or try to figure out howto tricksterproxy.io parse SQL to detect timeRange */

var FromValueRE = regexp.MustCompile(`(?miU)>=\s*toDate\s*\((\d+)\)|>=\s*toDateTime\s*\((\d+)\)|>=\s*toDateTime64\s*\((\d+),\s*3\)|BETWEEN\s+toDate\s*\((\d+)\)|BETWEEN\s+toDateTime\s*\((\d+)\)`)
var ToValueRE = regexp.MustCompile(`(?miU)<=\s*toDate\s*\((\d+)\)|<=\s*toDateTime\s*\((\d+)\)|<=\s*toDateTime64\s*\((\d+),\s*3\)|BETWEEN[\s\S]+AND\s+toDate\s*\((\d+)\)|BETWEEN[\s\S]+AND\s+toDateTime\s*\((\d+)\)`)

var FromMsValueRE = regexp.MustCompile(`(?miU)>=\s*toDateTime64\s*\((\d+)/1000,\s*3\)`)
var ToMsValueRE = regexp.MustCompile(`(?miU)<=\s*toDateTime64\s*\((\d+)/1000,\s*3\)`)

type Query struct {
	RefId    string `json:"refId"`
	RawQuery string `json:"rawQuery"`
	From     time.Time
	To       time.Time
}

func (query *Query) ApplyTimeRangeToQuery() string {
	fmtQuery := strings.Trim(query.RawQuery, ";\r\n\t ")

	if !strings.HasSuffix(fmtQuery, FormatJson) {
		fmtQuery = fmtQuery + " " + FormatJson
	}
	fmtQuery = formatTimeValue(fmtQuery, query.From, FromValueRE, false)
	fmtQuery = formatTimeValue(fmtQuery, query.To, ToValueRE, false)

	fmtQuery = formatTimeValue(fmtQuery, query.From, FromMsValueRE, true)
	fmtQuery = formatTimeValue(fmtQuery, query.To, ToMsValueRE, true)

	return fmtQuery + " /* grafana alerts query=" + query.RefId + " */;"
}

func formatTimeValue(fmtQuery string, fmtTime time.Time, fmtRE *regexp.Regexp, isMs bool) string {
	matches := fmtRE.FindStringSubmatch(fmtQuery)

	if matches != nil {
		for i := 1; i < len(matches); i++ {
			if len(matches[i]) > 0 {
				if matched, err := regexp.MatchString(`\d+`, matches[i]); err == nil && matched {
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
