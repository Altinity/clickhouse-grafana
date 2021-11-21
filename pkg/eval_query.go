package main

import "time"

type EvalQuery struct {
	RefId    string `json:"refId"`
	RawQuery bool   `json:"rawQuery"`
	Query    string `json:"query"`
	From     time.Time
	To       time.Time
}

func (q *EvalQuery) ApplyMacrosAndTimeRangeToQuery() (string, error) {
	return q.Query, nil
}
