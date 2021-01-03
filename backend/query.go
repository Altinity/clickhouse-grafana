package main

import (
	"fmt"
	"strings"
)

var FormatJson = "FORMAT JSON"

var DefaultQuery = "SELECT 1 FORMAT JSON;"

var TimeZoneFieldName = "timezone()"
var TimeZoneQuery = fmt.Sprintf("SELECT %s FORMAT JSON;", TimeZoneFieldName)

type Query struct {
	RefId string `json:"refId"`
	Query string `json:"query"`
}

func (query *Query) Format() string {
	fmtQuery := strings.Trim(query.Query, ";\n\t ")

	if !strings.HasSuffix(fmtQuery, FormatJson) {
		fmtQuery = fmtQuery + " " + FormatJson
	}

	return fmtQuery + ";"
}
