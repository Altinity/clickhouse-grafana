package helpers

import (
  "reflect"
  "time"

  "github.com/altinity/clickhouse-grafana/pkg/eval"
)

// NewEvalQuery creates a fully populated EvalQuery using direct field access on request
func NewEvalQuery(request interface{}, from, to time.Time) eval.EvalQuery {
  v := reflect.ValueOf(request)

  // Handle pointers
  if v.Kind() == reflect.Ptr {
    v = v.Elem()
  }

  // Direct field access using request.FieldName pattern
  return eval.EvalQuery{
    RefId:                  v.FieldByName("RefId").String(),
    RuleUid:                v.FieldByName("RuleUid").String(),
    RawQuery:               v.FieldByName("RawQuery").Bool(),
    Query:                  v.FieldByName("Query").String(),
    DateTimeCol:            v.FieldByName("DateTimeColDataType").String(),
    DateCol:                v.FieldByName("DateColDataType").String(),
    DateTimeType:           v.FieldByName("DateTimeType").String(),
    Extrapolate:            v.FieldByName("Extrapolate").Bool(),
    SkipComments:           v.FieldByName("SkipComments").Bool(),
    AddMetadata:            v.FieldByName("AddMetadata").Bool(),
    Format:                 v.FieldByName("Format").String(),
    Round:                  v.FieldByName("Round").String(),
    IntervalFactor:         int(v.FieldByName("IntervalFactor").Int()),
    Interval:               v.FieldByName("Interval").String(),
    Database:               v.FieldByName("Database").String(),
    Table:                  v.FieldByName("Table").String(),
    MaxDataPoints:          v.FieldByName("MaxDataPoints").Int(),
    From:                   from,
    To:                     to,
    FrontendDatasource:     v.FieldByName("FrontendDatasource").Bool(),
    UseWindowFuncForMacros: v.FieldByName("UseWindowFuncForMacros").Bool(),
  }
}
